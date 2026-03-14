import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import Tesseract from "tesseract.js";

export interface OCRExtractionResult {
  success: boolean;
  text: string;
  pages: OCRPageText[];
  totalChars: number;
  method: "ocr";
}

export interface OCRPageText {
  page: number;
  text: string;
  charCount: number;
  confidence: number;
}

export interface OCRProgress {
  page: number;
  progress: number;
}

export async function extractWithOCR(
  filePath: string,
  options: {
    startPage?: number;
    endPage?: number;
    requestedPages?: number[];
    onProgress?: (progress: OCRProgress) => void;
  } = {},
): Promise<OCRExtractionResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const tempDir = `/tmp/pdf-read-ocr-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  const start =
    options.startPage ||
    (options.requestedPages ? Math.min(...options.requestedPages) : 1);
  const end =
    options.endPage ||
    (options.requestedPages ? Math.max(...options.requestedPages) : 999);

  try {
    const pageArg = `-f ${start} -l ${end}`;
    const cmd = `pdftoppm -r 300 -png ${pageArg} "${filePath}" "${tempDir}/page"`;
    execSync(cmd, { stdio: "ignore" });

    const files = fs
      .readdirSync(tempDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    const pages: OCRPageText[] = [];
    let totalChars = 0;

    for (let i = 0; i < files.length; i++) {
      const pageNum = start + i;

      // Filter if requestedPages is provided
      if (options.requestedPages && !options.requestedPages.includes(pageNum)) {
        continue;
      }

      const imagePath = path.join(tempDir, files[i]);

      if (options.onProgress) {
        options.onProgress({
          page: i + 1,
          progress: 0,
        });
      }

      const result = await Tesseract.recognize(imagePath, "eng", {
        logger: () => {},
      });

      const text = result.data.text.trim();
      const charCount = text.length;

      pages.push({
        page: pageNum,
        text,
        charCount,
        confidence: result.data.confidence,
      });

      totalChars += charCount;

      if (options.onProgress) {
        options.onProgress({
          page: i + 1,
          progress: (i + 1) / files.length,
        });
      }

      fs.unlinkSync(imagePath);
    }

    return {
      success: true,
      text: pages.map((p) => p.text).join("\n\n"),
      pages,
      totalChars,
      method: "ocr",
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
