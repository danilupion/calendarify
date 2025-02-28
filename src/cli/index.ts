#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

// Get package.json for version info
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(
  await readFile(packagePath, 'utf8')
);

const program = new Command();

program
  .command('calendarify')
  .description('Sync shifts from a file to your calendar')
  .version(packageJson.version)
  .argument('<filePath>', 'Path to the file containing shift data')
  .action((filePath) => {
    console.log(`Syncing shifts from ${filePath}`);
  });

// Only execute CLI when run directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  const isRunDirectly = process.argv[1] === modulePath;

  if (isRunDirectly) {
    program.parse();
  }
}

export default program;
