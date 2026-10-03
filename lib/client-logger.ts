type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const defaultConfig: LoggerConfig = {
  enabledInProduction: false,
  minLevel: "debug",
};

class ClientLogger {
  private config: LoggerConfig;
  private prefix: string;

  constructor(prefix: string = "Flier", config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log if explicitly enabled
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production" &&
      !this.config.enabledInProduction
    ) {
      return level === "error"; // Always log errors
    }
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog("debug")) {
      return;
    }
    if (context) {
      console.debug(this.formatMessage("debug", message), context);
    } else {
      console.debug(this.formatMessage("debug", message));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog("info")) {
      return;
    }
    if (context) {
      console.info(this.formatMessage("info", message), context);
    } else {
      console.info(this.formatMessage("info", message));
    }
  }

  warn(
    message: string,
    errorOrContext?: Error | Record<string, unknown>,
    context?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog("warn")) {
      return;
    }
    if (errorOrContext instanceof Error) {
      if (context) {
        console.warn(this.formatMessage("warn", message), {
          error: errorOrContext.message,
          stack: errorOrContext.stack,
          ...context,
        });
      } else {
        console.warn(this.formatMessage("warn", message), errorOrContext);
      }
    } else if (errorOrContext) {
      console.warn(this.formatMessage("warn", message), errorOrContext);
    } else {
      console.warn(this.formatMessage("warn", message));
    }
  }

  error(
    message: string,
    errorOrContext?: Error | Record<string, unknown>,
    context?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog("error")) {
      return;
    }
    if (errorOrContext instanceof Error) {
      if (context) {
        console.error(this.formatMessage("error", message), {
          error: errorOrContext.message,
          stack: errorOrContext.stack,
          ...context,
        });
      } else {
        console.error(this.formatMessage("error", message), errorOrContext);
      }
    } else if (errorOrContext && context) {
      console.error(this.formatMessage("error", message), {
        ...errorOrContext,
        ...context,
      });
    } else if (errorOrContext) {
      console.error(this.formatMessage("error", message), errorOrContext);
    } else {
      console.error(this.formatMessage("error", message));
    }
  }

  /**
   * Create a child logger with a custom prefix
   */
  child(prefix: string): ClientLogger {
    return new ClientLogger(`${this.prefix}:${prefix}`, this.config);
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();

// Export specialized loggers
export const emailSendLogger = clientLogger.child("EmailSend");
export const csvLogger = clientLogger.child("CSV");
export const componentLogger = clientLogger.child("Component");

export { ClientLogger };
