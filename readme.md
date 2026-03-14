# pdf-read

An agent-friendly, agent-first CLI for reading PDFs fast. Designed for programmatic consumption by AI agents with reliable OCR fallback.

## Features

- **Native Extraction**: Uses `pdftotext` for blazing fast text recovery from text-based PDFs.
- **OCR Fallback**: Automatically triggers Tesseract OCR if text density is low (e.g., scanned documents).
- **Deep Mode**: Force OCR extraction with `--deep` for 100% text recovery.
- **Agent-First Output**: JSON by default, with rich metadata and semantic exit codes.
- **Page Selection**: Supports complex ranges like `1-5, 8, 11-13`.
- **Help-as-Data**: `--help-json` for automated tool discovery.

## Installation

```bash
npm install -g pdf-read
```

*Requires `poppler-utils` (for `pdftotext` and `pdftoppm`).*

## Usage

### Basic Extraction (JSON)
```bash
pdf-read read document.pdf
```

### Plain Text Output
```bash
pdf-read read document.pdf --text
```

### Specific Pages
```bash
pdf-read read document.pdf --pages 1,3-5
```

### Force OCR (Deep Mode)
```bash
pdf-read read document.pdf --deep --verbose
```

### Agent Discovery
```bash
pdf-read read --help-json
```

## Exit Codes

- `0`: Success
- `80`: Invalid argument
- `91`: File not found
- `92`: Not a PDF file
- `93`: No text extracted
- `106`: OCR failed
- `110`: Internal error

## License

MIT
