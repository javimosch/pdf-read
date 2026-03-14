export const ExitCode = {
  SUCCESS: 0,
  GENERIC_FAILURE: 1,
  INVALID_ARGUMENT: 80,
  FILE_NOT_FOUND: 91,
  NOT_A_PDF: 92,
  NO_TEXT_EXTRACTED: 93,
  OCR_FAILED: 106,
  INTERNAL_ERROR: 110,
} as const;

export type ExitCodeType = typeof ExitCode[keyof typeof ExitCode];

export const ErrorTypes = {
  INVALID_ARGUMENT: 'invalid_argument',
  FILE_NOT_FOUND: 'file_not_found',
  NOT_A_PDF: 'not_a_pdf',
  NO_TEXT_EXTRACTED: 'no_text_extracted',
  OCR_FAILED: 'ocr_failed',
  INTERNAL_ERROR: 'internal_error',
} as const;

export interface ErrorDetail {
  code: ExitCodeType;
  type: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryAfter?: number;
  suggestions?: string[];
}

export type ErrorTypeKey = keyof typeof ErrorTypes;

export function createError(
  type: ErrorTypeKey,
  message: string,
  details?: Record<string, unknown>,
  recoverable = false
): ErrorDetail {
  const codeMap: Record<keyof typeof ErrorTypes, ExitCodeType> = {
    INVALID_ARGUMENT: ExitCode.INVALID_ARGUMENT,
    FILE_NOT_FOUND: ExitCode.FILE_NOT_FOUND,
    NOT_A_PDF: ExitCode.NOT_A_PDF,
    NO_TEXT_EXTRACTED: ExitCode.NO_TEXT_EXTRACTED,
    OCR_FAILED: ExitCode.OCR_FAILED,
    INTERNAL_ERROR: ExitCode.INTERNAL_ERROR,
  };

  const suggestionsMap: Record<keyof typeof ErrorTypes, string[]> = {
    INVALID_ARGUMENT: ['Check file path format', 'Use absolute path if relative fails'],
    FILE_NOT_FOUND: ['Verify file exists', 'Check file permissions'],
    NOT_A_PDF: ['Ensure file is a valid PDF', 'File may be corrupted'],
    NO_TEXT_EXTRACTED: ['Try --deep flag for OCR extraction', 'Document may be image-only'],
    OCR_FAILED: ['Try again with --deep flag', 'Check system memory'],
    INTERNAL_ERROR: ['Report bug to maintainers'],
  };

  return {
    code: codeMap[type],
    type: ErrorTypes[type],
    message,
    details,
    recoverable,
    suggestions: suggestionsMap[type],
  };
}
