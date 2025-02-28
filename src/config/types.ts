// Calendar configuration
export interface ICalendarEntry {
  calendar_id: string;
  employees: string[];
}

// Shift period configuration
export interface IShiftPeriod {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

// Shift configuration
export interface IShiftConfig {
  label: string;
  color: string; // Hex color code
  period: IShiftPeriod;
}

// Employee configuration
export interface IEmployeeConfig {
  color: string; // Hex color code
}

// Event handling configuration
export interface IEventHandlingConfig {
  duplicate_shifts: 'update' | 'skip' | 'create_new';
  overlapping_shifts: 'error' | 'warn' | 'ignore';
  api_failures: 'abort' | 'retry' | 'log_continue';
  partial_updates: 'preserve_existing' | 'revert_all' | 'continue';
  missing_employees: 'error' | 'warn_continue' | 'skip';
  extra_employees: 'create' | 'warn' | 'ignore';
}

// Deletion policy type
export type DeletionPolicy = 'full_sync' | 'preserve_manual' | 'append_only';

// Complete configuration interface
export interface IConfig {
  calendars: ICalendarEntry[];
  shifts: Record<string, IShiftConfig>;
  employees: Record<string, IEmployeeConfig>;
  deletion_policy: DeletionPolicy;
  event_handling: IEventHandlingConfig;
  timezone: string;
}
