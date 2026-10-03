/**
 * Centralized Logging Service
 * Provides structured logging with different log levels and contexts
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to format output as JSON */
  jsonFormat: boolean;
  /** Application name for log prefix */
  appName: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Default configuration based on environment
 */
const defaultConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
  includeTimestamp: true,
  jsonFormat: process.env.NODE_ENV === "production",
  appName: "Flier",
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.config.jsonFormat) {
      return JSON.stringify({
        app: this.config.appName,
        ...entry,
      });
    }

    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    parts.push(`[${this.config.appName}]`);
    parts.push(`[${entry.level.toUpperCase()}]`);
    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push(`\n  Error: ${entry.error.name}: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\n  Stack: ${entry.error.stack}`);
      }
    }

    return parts.join(" ");
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "debug":
        // In production, debug logs are filtered by minLevel
        if (process.env.NODE_ENV !== "production") {
          console.debug(formatted);
        }
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  /**
   * Log debug message (development only by default)
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log warning message
   * @param message The warning message
   * @param contextOrError Optional context object or Error instance
   * @param errorOrContext Optional Error instance or additional context (if contextOrError is context or error)
   */
  warn(
    message: string,
    contextOrError?: LogContext | Error,
    errorOrContext?: Error | LogContext,
  ): void {
    if (contextOrError instanceof Error) {
      // First optional param is Error, second might be context
      const ctx = errorOrContext instanceof Error ? undefined : errorOrContext;
      this.log("warn", message, ctx, contextOrError);
    } else if (errorOrContext instanceof Error) {
      // First is context, second is Error
      this.log("warn", message, contextOrError, errorOrContext);
    } else {
      // Both are context or undefined
      const mergedContext =
        contextOrError || errorOrContext ? { ...contextOrError, ...errorOrContext } : undefined;
      this.log("warn", message, mergedContext);
    }
  }

  /**
   * Log error message
   * @param message The error message
   * @param contextOrError Optional context object or Error instance
   * @param errorOrContext Optional Error instance or additional context (if contextOrError is context or error)
   */
  error(
    message: string,
    contextOrError?: LogContext | Error,
    errorOrContext?: Error | LogContext,
  ): void {
    if (contextOrError instanceof Error) {
      // First optional param is Error, second might be context
      const ctx = errorOrContext instanceof Error ? undefined : errorOrContext;
      this.log("error", message, ctx, contextOrError);
    } else if (errorOrContext instanceof Error) {
      // First is context, second is Error
      this.log("error", message, contextOrError, errorOrContext);
    } else {
      // Both are context or undefined
      const mergedContext =
        contextOrError || errorOrContext ? { ...contextOrError, ...errorOrContext } : undefined;
      this.log("error", message, mergedContext);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger(this.config);
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      originalLog(level, message, { ...defaultContext, ...context }, error);
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger };

// ============================================
// Specialized Loggers
// ============================================

/**
 * Email-specific logger
 */
export const emailLogger = logger.child({ module: "email" });

/**
 * API-specific logger
 */
export const apiLogger = logger.child({ module: "api" });

/**
 * Auth-specific logger
 */
export const authLogger = logger.child({ module: "auth" });

/**
 * Database-specific logger
 */
export const dbLogger = logger.child({ module: "database" });

// ============================================
// Utility Functions
// ============================================

/**
 * Log API request (for debugging/monitoring)
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext,
): void {
  const message = `${method} ${path} ${statusCode} ${durationMs}ms`;

  if (statusCode >= 500) {
    apiLogger.error(message, context);
  } else if (statusCode >= 400) {
    apiLogger.warn(message, context);
  } else {
    apiLogger.info(message, context);
  }
}

/**
 * Log email sending event
 */
export function logEmailEvent(
  event: "sent" | "failed" | "queued" | "retrying",
  email: string,
  context?: LogContext,
): void {
  const message = `Email ${event}: ${email}`;

  if (event === "failed") {
    emailLogger.error(message, context);
  } else if (event === "retrying") {
    emailLogger.warn(message, context);
  } else {
    emailLogger.info(message, context);
  }
}
