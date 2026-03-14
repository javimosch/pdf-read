import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { extractNativeText } from "../extraction/native";
import { extractWithOCR } from "../extraction/ocr";
import { formatJSON, formatText, formatHelpJSON } from "../output/formatter";
import {
  ExitCode,
  createError,
  ErrorTypes,
  ErrorTypeKey,
} from "../errors/codes";

interface ReadOptions {
  text: boolean;
  json: boolean;
  deep: boolean;
  pages?: string;
  verbose: boolean;
  helpJson?: boolean;
}

const MIN_CHARS_FOR_NATIVE = 50;

interface PageOptions {
  startPage?: number;
  endPage?: number;
  requestedPages?: number[];
}

function parsePageRange(pageRange?: string): PageOptions {
  if (!pageRange) return {};

  // Support 1-5, 8, 11-13
  const parts = pageRange.split(",").map((p) => p.trim());
  const requestedPages: number[] = [];

  for (const part of parts) {
    if (part.includes("-")) {
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      if (!rangeMatch) {
        throw new Error(`Invalid page range: ${part}`);
      }
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (end < start) {
        throw new Error(`Invalid range: ${part}. End must be >= start.`);
      }
      for (let i = start; i <= end; i++) {
        requestedPages.push(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: ${part}`);
      }
      requestedPages.push(page);
    }
  }

  // Deduplicate and sort
  const uniquePages = [...new Set(requestedPages)].sort((a, b) => a - b);

  // If it's a simple range, we can still use startPage/endPage for optimization
  // But for simplicity in the callers, we'll provide requestedPages
  return { requestedPages: uniquePages };
}

export function createReadCommand(): Command {
  const cmd = new Command("read");

  cmd
    .description("Extract text from PDF files")
    .option("-t, --text", "Output as plain text instead of JSON")
    .option("--json", "Output as JSON (force agent mode)")
    .option("--deep", "Force OCR extraction (slower but 100% text recovery)")
    .option("-p, --pages <range>", "Page range (e.g., 1-5)")
    .option("-v, --verbose", "Include metadata in output")
    .option("--help-json", "Output help as JSON (for agent discovery)")
    .argument("[file]", "PDF file path")
    .action(async (filePath: string | undefined, options: ReadOptions) => {
      const parentOptions = cmd.parent?.opts() || {};
      const forceJson = options.json || parentOptions.json;
      const isAgentMode =
        !process.stdout.isTTY || forceJson || options.helpJson;

      if (options.helpJson) {
        console.log(formatHelpJSON());
        process.exit(ExitCode.SUCCESS);
      }

      if (!filePath) {
        if (isAgentMode) {
          console.log(formatHelpJSON());
          process.exit(ExitCode.SUCCESS);
        } else {
          cmd.help();
          return;
        }
      }

      const startTime = Date.now();

      if (!fs.existsSync(filePath)) {
        const err = createError(
          "FILE_NOT_FOUND" as ErrorTypeKey,
          `File not found: ${filePath}`,
        );
        if (isAgentMode) {
          console.log(JSON.stringify({ error: err }, null, 2));
        } else {
          console.error(JSON.stringify({ error: err }, null, 2));
        }
        process.exit(ExitCode.FILE_NOT_FOUND);
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext !== ".pdf") {
        const err = createError(
          "NOT_A_PDF" as ErrorTypeKey,
          `Not a PDF file: ${filePath}`,
        );
        if (isAgentMode) {
          console.log(JSON.stringify({ error: err }, null, 2));
        } else {
          console.error(JSON.stringify({ error: err }, null, 2));
        }
        process.exit(ExitCode.NOT_A_PDF);
      }

      const pageOptions = parsePageRange(options.pages);
      let result;
      let method: "native" | "ocr" = "native";

      try {
        if (!isAgentMode) process.stderr.write("Extracting text...\n");

        if (options.deep) {
          if (!isAgentMode) process.stderr.write("Using OCR extraction...\n");
          result = await extractWithOCR(filePath, {
            ...pageOptions,
            onProgress: (progress) => {
              if (!isAgentMode) {
                process.stderr.write(
                  `OCR Progress (Page ${progress.page}): ${Math.round(progress.progress * 100)}%\n`,
                );
              }
            },
          });
          method = "ocr";
        } else {
          result = await extractNativeText(filePath, pageOptions);

          const avgCharsPerPage =
            result.pages.length > 0
              ? result.totalChars / result.pages.length
              : 0;

          if (avgCharsPerPage < MIN_CHARS_FOR_NATIVE && !options.deep) {
            if (!isAgentMode) {
              process.stderr.write(
                `Low text density detected (${avgCharsPerPage} chars/page). Trying OCR...\n`,
              );
            }
            try {
              result = await extractWithOCR(filePath, {
                ...pageOptions,
                onProgress: (progress) => {
                  if (!isAgentMode) {
                    process.stderr.write(
                      `OCR Progress (Page ${progress.page}): ${Math.round(progress.progress * 100)}%\n`,
                    );
                  }
                },
              });
              method = "ocr";
            } catch (ocrErr) {
              if (!isAgentMode) {
                process.stderr.write(
                  `OCR failed, using native extraction: ${ocrErr}\n`,
                );
              }
            }
          }
        }

        if (!result.text || result.text.trim().length === 0) {
          const err = createError(
            "NO_TEXT_EXTRACTED" as ErrorTypeKey,
            "No text could be extracted from the PDF",
          );
          if (isAgentMode) {
            console.log(JSON.stringify({ error: err }, null, 2));
          } else {
            console.error(JSON.stringify({ error: err }, null, 2));
          }
          process.exit(ExitCode.NO_TEXT_EXTRACTED);
        }

        const extractionTimeMs = Date.now() - startTime;

        const outputAsText = options.text && !forceJson;

        if (outputAsText) {
          console.log(
            formatText(
              filePath,
              result.pages.map((p) => ({
                page: p.page,
                text: p.text,
                charCount: p.charCount,
              })),
              method,
            ),
          );
        } else {
          const metadata: Record<string, any> = {
            extractionMethod: method,
            pagesExtracted: result.pages.map((p) => ({
              page: p.page,
              charCount: p.charCount,
              ...(method === "ocr"
                ? { confidence: (p as any).confidence }
                : {}),
            })),
          };

          console.log(
            formatJSON(
              filePath,
              result.text,
              result.pages.length,
              result.totalChars,
              method,
              extractionTimeMs,
              options.verbose,
              metadata,
            ),
          );
        }

        process.exit(ExitCode.SUCCESS);
      } catch (err) {
        const error = err as Error;
        const extError = createError(
          "INTERNAL_ERROR" as ErrorTypeKey,
          error.message || "Unknown error occurred",
        );
        if (isAgentMode) {
          console.log(JSON.stringify({ error: extError }, null, 2));
        } else {
          console.error(JSON.stringify({ error: extError }, null, 2));
        }
        process.exit(ExitCode.INTERNAL_ERROR);
      }
    });

  return cmd;
}
