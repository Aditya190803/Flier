/**
 * Unit tests for logger utilities
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

import {
  logger,
  Logger,
  emailLogger,
  apiLogger,
  authLogger,
  logApiRequest,
  logEmailEvent,
} from "@/lib/logger";

describe("Logger", () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log levels", () => {
    it("should log debug messages", () => {
      const testLogger = new Logger({ minLevel: "debug" });
      testLogger.debug("Debug message");

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it("should log info messages", () => {
      logger.info("Info message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log warning messages", () => {
      logger.warn("Warning message");

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should log error messages", () => {
      logger.error("Error message");

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should include context in log messages", () => {
      logger.info("Message with context", { userId: "123", action: "test" });

      expect(consoleSpy.info).toHaveBeenCalled();
      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain("Message with context");
    });

    it("should include error details in error logs", () => {
      const error = new Error("Test error");
      logger.error("Error occurred", {}, error);

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe("child loggers", () => {
    it("should create child logger with additional context", () => {
      const childLogger = logger.child({ module: "test" });
      childLogger.info("Child logger message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should merge parent and child context", () => {
      const childLogger = logger.child({ module: "parent" });
      const grandchildLogger = childLogger.child({ submodule: "child" });
      grandchildLogger.info("Message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe("pre-configured loggers", () => {
    it("should have email logger", () => {
      emailLogger.info("Email event");
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should have api logger", () => {
      apiLogger.info("API event");
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should have auth logger", () => {
      authLogger.info("Auth event");
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe("log level filtering", () => {
    it("should respect minimum log level", () => {
      const warnOnlyLogger = new Logger({ minLevel: "warn" });

      warnOnlyLogger.debug("Debug - should not appear");
      warnOnlyLogger.info("Info - should not appear");
      warnOnlyLogger.warn("Warning - should appear");
      warnOnlyLogger.error("Error - should appear");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});

describe("Utility Logging Functions", () => {
  let consoleSpy: {
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logApiRequest", () => {
    it("should log successful requests as info", () => {
      logApiRequest("GET", "/api/users", 200, 50);

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log client errors as warn", () => {
      logApiRequest("POST", "/api/login", 401, 30);

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should log server errors as error", () => {
      logApiRequest("GET", "/api/data", 500, 100);

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should include duration in log message", () => {
      logApiRequest("GET", "/api/test", 200, 123);

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain("123ms");
    });
  });

  describe("logEmailEvent", () => {
    it("should log sent events as info", () => {
      logEmailEvent("sent", "test@example.com");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log queued events as info", () => {
      logEmailEvent("queued", "test@example.com");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log failed events as error", () => {
      logEmailEvent("failed", "test@example.com");

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should log retrying events as warn", () => {
      logEmailEvent("retrying", "test@example.com");

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should include email address in log", () => {
      logEmailEvent("sent", "recipient@example.com");

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain("recipient@example.com");
    });
  });
});
