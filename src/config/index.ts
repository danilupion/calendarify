import { readFile } from 'node:fs/promises';
import { IConfig, DeletionPolicy } from './types.js';

export class ConfigValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigValidationError';
    }
}

/**
 * Validates that an object has all required fields of the given type
 */
function validateObjectFields<T>(
    obj: unknown,
    fields: Record<keyof T, string>,
    objName: string
): obj is T {
    if (!obj || typeof obj !== 'object') {
        throw new ConfigValidationError(`${objName} must be an object`);
    }

    for (const [field, type] of Object.entries(fields)) {
        if (!(field in obj)) {
            throw new ConfigValidationError(`Missing required field '${field}' in ${objName}`);
        }

        const value = (obj as Record<string, unknown>)[field];

        // Basic type checking
        if (type === 'string' && typeof value !== 'string') {
            throw new ConfigValidationError(`Field '${field}' in ${objName} must be a string`);
        } else if (type === 'array' && !Array.isArray(value)) {
            throw new ConfigValidationError(`Field '${field}' in ${objName} must be an array`);
        } else if (type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) {
            throw new ConfigValidationError(`Field '${field}' in ${objName} must be an object`);
        }
    }

    return true;
}

/**
 * Validates that the given value is one of the allowed enum values
 */
function validateEnum<T extends string>(
    value: unknown,
    allowedValues: T[],
    fieldName: string
): value is T {
    if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
        throw new ConfigValidationError(
            `Invalid value for '${fieldName}'. Must be one of: ${allowedValues.join(', ')}`
        );
    }
    return true;
}

/**
 * Validates the complete configuration object
 */
function validateConfig(config: unknown): asserts config is IConfig {
    // Validate top-level structure
    validateObjectFields<IConfig>(
        config,
        {
            calendars: 'array',
            shifts: 'object',
            employees: 'object',
            deletion_policy: 'string',
            event_handling: 'object',
            timezone: 'string',
        },
        'config'
    );

    // After validation, we can safely use the fields, but we need to help TypeScript
    // by creating a typed variable
    const typedConfig = config as IConfig;

    // Validate deletion policy
    validateEnum<DeletionPolicy>(
        typedConfig.deletion_policy,
        ['full_sync', 'preserve_manual', 'append_only'],
        'deletion_policy'
    );

    // Validate calendars
    for (const [index, calendar] of typedConfig.calendars.entries()) {
        validateObjectFields(
            calendar,
            { calendar_id: 'string', employees: 'array' },
            `calendars[${index}]`
        );
    }

    // Validate shifts
    for (const [key, shift] of Object.entries(typedConfig.shifts)) {
        validateObjectFields(
            shift,
            { label: 'string', color: 'string', period: 'object' },
            `shifts.${key}`
        );

        validateObjectFields(
            shift.period,
            { start: 'string', end: 'string' },
            `shifts.${key}.period`
        );

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(shift.period.start)) {
            throw new ConfigValidationError(
                `Invalid time format for shifts.${key}.period.start. Must be HH:MM format.`
            );
        }
        if (!timeRegex.test(shift.period.end)) {
            throw new ConfigValidationError(
                `Invalid time format for shifts.${key}.period.end. Must be HH:MM format.`
            );
        }
    }

    // Validate event handling
    validateObjectFields(
        typedConfig.event_handling,
        {
            duplicate_shifts: 'string',
            overlapping_shifts: 'string',
            api_failures: 'string',
            partial_updates: 'string',
            missing_employees: 'string',
            extra_employees: 'string',
        },
        'event_handling'
    );

    validateEnum(
        typedConfig.event_handling.duplicate_shifts,
        ['update', 'skip', 'create_new'],
        'event_handling.duplicate_shifts'
    );
    validateEnum(
        typedConfig.event_handling.overlapping_shifts,
        ['error', 'warn', 'ignore'],
        'event_handling.overlapping_shifts'
    );
    validateEnum(
        typedConfig.event_handling.api_failures,
        ['abort', 'retry', 'log_continue'],
        'event_handling.api_failures'
    );
    validateEnum(
        typedConfig.event_handling.partial_updates,
        ['preserve_existing', 'revert_all', 'continue'],
        'event_handling.partial_updates'
    );
    validateEnum(
        typedConfig.event_handling.missing_employees,
        ['error', 'warn_continue', 'skip'],
        'event_handling.missing_employees'
    );
    validateEnum(
        typedConfig.event_handling.extra_employees,
        ['create', 'warn', 'ignore'],
        'event_handling.extra_employees'
    );

    // Check if timezone is valid (basic check)
    try {
        // This will throw if the timezone is invalid
        Intl.DateTimeFormat(undefined, { timeZone: typedConfig.timezone });
    } catch (error) {
        throw new ConfigValidationError(`Invalid timezone: ${typedConfig.timezone}`);
    }
}

/**
 * Loads and validates the configuration from a JSON file
 * @param configPath Path to the configuration file
 * @returns The validated configuration object
 * @throws ConfigValidationError if validation fails
 */
export async function loadConfig(configPath: string): Promise<IConfig> {
    try {
        const configContent = await readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);

        validateConfig(config);

        return config;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new ConfigValidationError(`Invalid JSON in config file: ${error.message}`);
        } else if (error instanceof ConfigValidationError) {
            throw error;
        } else {
            throw new Error(`Failed to load config file: ${(error as Error).message}`);
        }
    }
}