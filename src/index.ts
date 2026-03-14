#!/usr/bin/env node

import { Command } from 'commander';
import { createReadCommand } from './commands/read';
import { ExitCode } from './errors/codes';

const program = new Command();

program
  .name('pdf-read')
  .description('Agent-friendly CLI for PDF text extraction with OCR fallback')
  .version('1.0.0')
  .addCommand(createReadCommand());

program.on('command:*', () => {
  console.error(`Invalid command: ${program.args.join(' ')}`);
  console.error('See --help for a list of available commands.');
  process.exit(ExitCode.INVALID_ARGUMENT);
});

if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);
