import { expect, test, describe } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliSourcePath = path.resolve(__dirname, './index.ts');

describe('CLI', () => {
  test('calendarify command prints expected message', async () => {
    const testFilePath = './test-shifts.csv';

    const { stdout } = await execa('npx', ['tsx', cliSourcePath, 'calendarify', testFilePath]);

    expect(stdout).toContain(`Syncing shifts from ${testFilePath}`);
  });
});
