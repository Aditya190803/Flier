import { vi } from "vite-plus/test";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;
type LoggerConfig = {
  minLevel?: LogLevel;
};

const levelMethods: Record<LogLevel, keyof Console> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class MockLogger {
  constructor(
    private readonly config: LoggerConfig = {},
    private readonly defaultContext: LogContext = {},
  ) {}

  private write(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ) {
    const minLevel = this.config.minLevel ?? "debug";
    if (levelPriority[level] < levelPriority[minLevel]) {
      return;
    }

    const mergedContext = { ...this.defaultContext, ...context };
    const parts = [message];

    if (Object.keys(mergedContext).length > 0) {
      parts.push(JSON.stringify(mergedContext));
    }

    if (error) {
      parts.push(`${error.name}: ${error.message}`);
    }

    const method = levelMethods[level];
    if (typeof console[method] === "function") {
      (console[method] as Function)(parts.join(" "));
    }
  }

  debug(message: string, context?: LogContext) {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.write("info", message, context);
  }

  warn(
    message: string,
    contextOrError?: LogContext | Error,
    errorOrContext?: Error | LogContext,
  ) {
    if (contextOrError instanceof Error) {
      this.write("warn", message, errorOrContext as LogContext, contextOrError);
      return;
    }

    if (errorOrContext instanceof Error) {
      this.write("warn", message, contextOrError, errorOrContext);
      return;
    }

    this.write("warn", message, {
      ...contextOrError,
      ...errorOrContext,
    });
  }

  error(
    message: string,
    contextOrError?: LogContext | Error,
    errorOrContext?: Error | LogContext,
  ) {
    if (contextOrError instanceof Error) {
      this.write(
        "error",
        message,
        errorOrContext as LogContext,
        contextOrError,
      );
      return;
    }

    if (errorOrContext instanceof Error) {
      this.write("error", message, contextOrError, errorOrContext);
      return;
    }

    this.write("error", message, {
      ...contextOrError,
      ...errorOrContext,
    });
  }

  child(defaultContext: LogContext) {
    return new MockLogger(this.config, {
      ...this.defaultContext,
      ...defaultContext,
    });
  }
}

export function createMockLoggerModule(
  overrides: Partial<Record<string, unknown>> = {},
) {
  const logger = new MockLogger();
  const emailLogger = logger.child({ module: "email" });
  const apiLogger = logger.child({ module: "api" });
  const authLogger = logger.child({ module: "auth" });
  const dbLogger = logger.child({ module: "database" });

  return {
    Logger: MockLogger,
    logger,
    emailLogger,
    apiLogger,
    authLogger,
    dbLogger,
    logApiRequest(
      method: string,
      path: string,
      statusCode: number,
      durationMs: number,
      context?: LogContext,
    ) {
      const message = `${method} ${path} ${statusCode} ${durationMs}ms`;

      if (statusCode >= 500) {
        apiLogger.error(message, context);
      } else if (statusCode >= 400) {
        apiLogger.warn(message, context);
      } else {
        apiLogger.info(message, context);
      }
    },
    logEmailEvent(
      event: "sent" | "failed" | "queued" | "retrying",
      email: string,
      context?: LogContext,
    ) {
      const message = `Email ${event}: ${email}`;

      if (event === "failed") {
        emailLogger.error(message, context);
      } else if (event === "retrying") {
        emailLogger.warn(message, context);
      } else {
        emailLogger.info(message, context);
      }
    },
    ...overrides,
  };
}

export function createSpyLogger() {
  return {
    debug: vi.fn((message: string) => console.debug(message)),
    info: vi.fn((message: string) => console.info(message)),
    warn: vi.fn((message: string) => console.warn(message)),
    error: vi.fn((message: string) => console.error(message)),
    child: vi.fn(() => createSpyLogger()),
  };
}
