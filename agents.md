# AGENTS.md

## Machine-Readable API

### Intent Discovery
Run `pdf-read read --help-json` to discover command schema and options.

### Output Contracts
- **Success (JSON)**: returns a `version: "1.0"` object with `extracted.text`.
- **Error (JSON)**: returns an `error` object with `code`, `type`, and `recoverable` status.
- **Verbose Mode**: enables the `metadata` field in JSON output for per-page confidence scores (for OCR).

### Recovery Strategy
- If `method: "native"` returns empty text, use `--deep` to force OCR.
- If `pdftotext` fails, the tool automatically tries Tesseract (OCR).

### Exit Codes for Agents
| Code | Meaning | Action |
| --- | --- | --- |
| 0 | Success | Parse stdout |
| 80 | Invalid argument | Check flag syntax |
| 91 | File not found | Verify path |
| 92 | Not a PDF file | Input validation |
| 93 | No text extracted | Use `--deep` |
| 106 | OCR failed | Check system resources |
| 110 | Internal error | Log/Report |

### Deterministic Features
- **Pipes**: results on stdout, logs/progress on stderr.
- **Fixed Schema**: JSON structure is stable and versioned.
- **No Interactivity**: No prompts or interactive loaders on stdout.
