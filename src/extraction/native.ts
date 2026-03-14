import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export interface NativeExtractionResult {
  success: boolean;
  text: string;
  pages: PageText[];
  totalChars: number;
  method: "native";
}

export interface PageText {
  page: number;
  text: string;
  charCount: number;
}

export async function extractNativeText(
  filePath: string,
  options: {
    startPage?: number;
    endPage?: number;
    requestedPages?: number[];
  } = {},
): Promise<NativeExtractionResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error(`Not a PDF file: ${filePath}`);
  }

  const tempDir = `/tmp/pdf-read-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  const start =
    options.startPage ||
    (options.requestedPages ? Math.min(...options.requestedPages) : undefined);
  const end =
    options.endPage ||
    (options.requestedPages ? Math.max(...options.requestedPages) : undefined);

  const pageArg = start && end ? `-f ${start} -l ${end}` : "";

  const outputBase = path.join(tempDir, "output");
  const cmd = `pdftotext ${pageArg} -layout "${filePath}" "${outputBase}.txt" 2>/dev/null`;

  try {
    execSync(cmd, { encoding: "utf-8" });

    const outputFile = `${outputBase}.txt`;
    if (!fs.existsSync(outputFile)) {
      throw new Error("pdftotext failed to create output");
    }

    const fullText = fs.readFileSync(outputFile, "utf-8");
    const pageMatches = fullText.split(/\f/);

    const allPagesText: PageText[] = [];
    let totalChars = 0;

    pageMatches.forEach((pageText: string, index: number) => {
      const trimmed = pageText.trim();
      if (trimmed.length > 0) {
        const charCount = trimmed.length;
        const pageNum = (start || 1) + index;
        allPagesText.push({
          page: pageNum,
          text: trimmed,
          charCount,
        });
        totalChars += charCount;
      }
    });

    const filteredPages = allPagesText.filter((p) => {
      if (options.requestedPages)
        return options.requestedPages.includes(p.page);
      if (start && p.page < start) return false;
      if (end && p.page > end) return false;
      return true;
    });

    const text = filteredPages.map((p) => p.text).join("\n\n");

    return {
      success: true,
      text,
      pages: filteredPages,
      totalChars,
      method: "native",
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
