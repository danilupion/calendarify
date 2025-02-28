import { describe, it, expect, beforeEach, vi } from 'vitest';
import {  readFile } from 'node:fs/promises';
import { loadConfig, ConfigValidationError } from './index.js';
import { IConfig } from './types.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testConfigPath = path.join(__dirname, 'test-config.json');

describe('Config Loader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const validConfig: IConfig = {
    calendars: [
      { calendar_id: 'jane.doe@example.com', employees: ['Jane Doe'] }
    ],
    shifts: {
      M: { label: 'Morning Shift', color: '#FFD700', period: { start: '08:00', end: '16:00' } },
      N: { label: 'Night Shift', color: '#483D8B', period: { start: '22:00', end: '06:00' } }
    },
    employees: { 'Jane Doe': { color: '#FF5733' } },
    deletion_policy: 'full_sync',
    event_handling: {
      duplicate_shifts: 'update',
      overlapping_shifts: 'error',
      api_failures: 'log_continue',
      partial_updates: 'preserve_existing',
      missing_employees: 'warn_continue',
      extra_employees: 'ignore'
    },
    timezone: 'Europe/Madrid'
  };

  it('should load and validate a valid config', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validConfig));

    const config = await loadConfig(testConfigPath);

    expect(config).toEqual(validConfig);
    expect(readFile).toHaveBeenCalledWith(testConfigPath, 'utf-8');
  });

  it('should throw when config file is not valid JSON', async () => {
    vi.mocked(readFile).mockResolvedValue('{ invalid: json }');

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow(ConfigValidationError);
  });

  it('should validate missing required fields', async () => {
    // Missing calendars field
    const invalidConfig = { ...validConfig };
    delete (invalidConfig as Partial<IConfig>).calendars;

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow("Missing required field 'calendars' in config");
  });

  it('should validate deletion_policy enum values', async () => {
    const invalidConfig = {
      ...validConfig,
      deletion_policy: 'invalid_policy'
    };

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow(/Invalid value for 'deletion_policy'/);
  });

  it('should validate event_handling enum values', async () => {
    const invalidConfig = {
      ...validConfig,
      event_handling: {
        ...validConfig.event_handling,
        duplicate_shifts: 'invalid_value'
      }
    };

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow(/Invalid value for 'event_handling.duplicate_shifts'/);
  });

  it('should validate time format in shifts', async () => {
    const invalidConfig = {
      ...validConfig,
      shifts: {
        M: {
          ...validConfig.shifts.M,
          period: { start: '8:00', end: '16:00' } // invalid format (should be 08:00)
        }
      }
    };

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow(/Invalid time format for shifts.M.period.start/);
  });

  it('should validate timezone', async () => {
    const invalidConfig = {
      ...validConfig,
      timezone: 'Invalid/Timezone'
    };

    vi.mocked(readFile).mockResolvedValue(JSON.stringify(invalidConfig));

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow(/Invalid timezone/);
  });

  it('should handle file system errors', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

    await expect(loadConfig(testConfigPath)).rejects
      .toThrow('Failed to load config file: File not found');
  });
});
