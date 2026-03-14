export interface ExtractionResult {
  version: string;
  file: string;
  pages: number;
  extracted: {
    method: "native" | "ocr";
    text: string;
  };
  stats: {
    totalChars: number;
    charsPerPageAvg: number;
    extractionTimeMs: number;
  };
  metadata?: Record<string, any>;
}

export interface TextOutput {
  pages: {
    page: number;
    text: string;
    charCount: number;
  }[];
  summary: {
    totalPages: number;
    totalChars: number;
    method: string;
  };
}

export function formatJSON(
  filePath: string,
  text: string,
  totalPages: number,
  totalChars: number,
  method: "native" | "ocr",
  extractionTimeMs: number,
  verbose: boolean = false,
  metadata?: Record<string, any>,
): string {
  const result: ExtractionResult = {
    version: "1.0",
    file: filePath,
    pages: totalPages,
    extracted: {
      method,
      text,
    },
    stats: {
      totalChars,
      charsPerPageAvg: totalPages > 0 ? Math.round(totalChars / totalPages) : 0,
      extractionTimeMs,
    },
  };

  if (verbose && metadata) {
    result.metadata = metadata;
  }

  return JSON.stringify(result, null, 2);
}

export function formatText(
  filePath: string,
  pages: { page: number; text: string; charCount: number }[],
  method: "native" | "ocr",
): string {
  const totalChars = pages.reduce((sum, p) => sum + p.charCount, 0);
  const totalPages = pages.length;

  let result = `File: ${filePath}\n`;
  result += `Pages: ${totalPages}\n`;
  result += `Total Chars: ${totalChars}\n`;
  result += `Method: ${method}\n`;
  result += `\n${"=".repeat(60)}\n\n`;

  for (const page of pages) {
    result += `[Page ${page.page}]\n`;
    result += `${page.text}\n\n`;
  }

  return result;
}

export function formatHelpJSON(): string {
  return JSON.stringify(
    {
      version: "1.0.0",
      commands: {
        read: {
          description: "Extract text from PDF files",
          options: {
            "--text": "Output as plain text instead of JSON",
            "--json": "Output as JSON (force agent mode)",
            "--deep": "Force OCR extraction (slower but 100% text recovery)",
            "--pages": "Page range (e.g., 1-5 or 1,3,5)",
            "--verbose": "Include metadata in output",
            "--help-json": "Output help as JSON (for agent discovery)",
          },
          arguments: {
            file: "PDF file path",
          },
        },
      },
      output_formats: ["json", "text"],
      exit_codes: {
        0: "Success",
        80: "Invalid argument",
        91: "File not found",
        92: "Not a PDF file",
        93: "No text extracted",
        106: "OCR failed",
        110: "Internal error",
      },
    },
    null,
    2,
  );
}
