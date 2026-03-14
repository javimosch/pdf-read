#!/usr/bin/env node

import { Command } from "commander";
import { createReadCommand } from "./commands/read";
import { ExitCode } from "./errors/codes";
import { formatHelpJSON } from "./output/formatter";

const program = new Command();

program
  .name("pdf-read")
  .description("Agent-friendly CLI for PDF text extraction with OCR fallback")
  .version("1.0.0")
  .option("--json", "Output as JSON (force agent mode)")
  .addCommand(createReadCommand());

const isAgentMode = !process.stdout.isTTY || process.argv.includes("--json");

program.on("command:*", () => {
  if (isAgentMode) {
    console.log(formatHelpJSON());
  } else {
    console.error(`Invalid command: ${program.args.join(" ")}`);
    console.error("See --help for a list of available commands.");
  }
  process.exit(ExitCode.INVALID_ARGUMENT);
});

if (
  process.argv.length === 2 ||
  (process.argv.length === 3 && process.argv.includes("--json"))
) {
  if (isAgentMode) {
    console.log(formatHelpJSON());
    process.exit(ExitCode.SUCCESS);
  } else {
    program.help();
  }
}

program.parse(process.argv);
