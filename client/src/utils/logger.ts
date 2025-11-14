/**
 * Logger Utility for LocaPay Application
 * 
 * Provides comprehensive logging functionality with timestamps,
 * log levels, and formatted output for debugging and monitoring.
 * 
 * @module utils/logger
 */

/**
 * Log levels for different types of messages
 */
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

/**
 * Logger class for application-wide logging
 */
class Logger {
  private isDevelopment: boolean;

  constructor() {
    // Entry: Logger constructor
    this.isDevelopment = import.meta.env.MODE === 'development';
    console.log(`[${this.getTimestamp()}] [INFO] Logger initialized in ${import.meta.env.MODE} mode`);
    // Exit: Logger constructor
  }

  /**
   * Get formatted timestamp for log entries
   * @returns Formatted timestamp string
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format log message with timestamp and level
   * @param level - Log level
   * @param component - Component or module name
   * @param message - Log message
   * @returns Formatted log string
   */
  private formatMessage(level: LogLevelType, component: string, message: string): string {
    return `[${this.getTimestamp()}] [${level}] [${component}] ${message}`;
  }

  /**
   * Log debug message (only in development mode)
   * @param component - Component or module name
   * @param message - Debug message
   * @param data - Optional data to log
   */
  debug(component: string, message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, component, message), data ?? '');
    }
  }

  /**
   * Log info message
   * @param component - Component or module name
   * @param message - Info message
   * @param data - Optional data to log
   */
  info(component: string, message: string, data?: unknown): void {
    console.info(this.formatMessage(LogLevel.INFO, component, message), data ?? '');
  }

  /**
   * Log warning message
   * @param component - Component or module name
   * @param message - Warning message
   * @param data - Optional data to log
   */
  warn(component: string, message: string, data?: unknown): void {
    console.warn(this.formatMessage(LogLevel.WARN, component, message), data ?? '');
  }

  /**
   * Log error message
   * @param component - Component or module name
   * @param message - Error message
   * @param error - Error object or data
   */
  error(component: string, message: string, error?: unknown): void {
    console.error(this.formatMessage(LogLevel.ERROR, component, message), error ?? '');
  }

  /**
   * Log component entry
   * @param component - Component name
   * @param props - Component props (optional)
   */
  entry(component: string, props?: unknown): void {
    this.debug(component, 'Entry', props);
  }

  /**
   * Log component exit
   * @param component - Component name
   * @param result - Exit result (optional)
   */
  exit(component: string, result?: unknown): void {
    this.debug(component, 'Exit', result);
  }
}

// Export singleton instance
export const logger = new Logger();
