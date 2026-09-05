/**
 * Unit tests for error handling utilities
 */

import { describe, it, expect } from "vite-plus/test";

import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ExternalServiceError,
  EmailError,
  formatErrorResponse,
  errorResponse,
  getUserFriendlyMessage,
  assert,
  assertDefined,
} from "@/lib/errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with all properties", () => {
      const error = new AppError("Test error", "TEST_ERROR", 500, true, {
        key: "value",
      });

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ key: "value" });
      expect(error.name).toBe("AppError");
    });

    it("should default to 500 status code", () => {
      const error = new AppError("Test", "TEST");
      expect(error.statusCode).toBe(500);
    });
  });

  describe("AuthError", () => {
    it("should create 401 error", () => {
      const error = new AuthError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.message).toBe("Authentication required");
    });

    it("should accept custom message", () => {
      const error = new AuthError("Session expired");
      expect(error.message).toBe("Session expired");
    });
  });

  describe("ForbiddenError", () => {
    it("should create 403 error", () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  describe("NotFoundError", () => {
    it("should create 404 error with resource name", () => {
      const error = new NotFoundError("Template");

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Template not found");
    });
  });

  describe("ValidationError", () => {
    it("should create 400 error", () => {
      const error = new ValidationError("Invalid email format");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Invalid email format");
    });
  });

  describe("RateLimitError", () => {
    it("should create 429 error with retryAfter", () => {
      const error = new RateLimitError(120);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("RATE_LIMIT");
      expect(error.retryAfter).toBe(120);
    });

    it("should default to 60 seconds", () => {
      const error = new RateLimitError();
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("ExternalServiceError", () => {
    it("should create 502 error with service name", () => {
      const error = new ExternalServiceError("Gmail", "Connection timeout");

      expect(error.statusCode).toBe(502);
      expect(error.service).toBe("Gmail");
      expect(error.message).toContain("Gmail");
      expect(error.message).toContain("Connection timeout");
    });
  });

  describe("EmailError", () => {
    it("should include email in details", () => {
      const error = new EmailError("Send failed", "test@example.com");

      expect(error.email).toBe("test@example.com");
      expect(error.code).toBe("EMAIL_ERROR");
    });
  });
});

describe("Error Response Formatting", () => {
  describe("formatErrorResponse", () => {
    it("should format AppError correctly", () => {
      const error = new ValidationError("Invalid input", { field: "email" });
      const response = formatErrorResponse(error);

      expect(response.error).toBe("ValidationError");
      expect(response.message).toBe("Invalid input");
      expect(response.code).toBe("VALIDATION_ERROR");
      expect(response.timestamp).toBeDefined();
      expect(response.details).toEqual({ field: "email" });
    });

    it("should format generic Error correctly", () => {
      const error = new Error("Something broke");
      const response = formatErrorResponse(error);

      expect(response.error).toBe("InternalError");
      expect(response.code).toBe("INTERNAL_ERROR");
    });

    it("should include requestId when provided", () => {
      const error = new AppError("Test", "TEST");
      const response = formatErrorResponse(error, "req-123");

      expect(response.requestId).toBe("req-123");
    });
  });

  describe("errorResponse", () => {
    it("should return Response with correct status", () => {
      const error = new NotFoundError("User");
      const response = errorResponse(error);

      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should include Retry-After header for rate limit errors", () => {
      const error = new RateLimitError(300);
      const response = errorResponse(error);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("300");
    });
  });
});

describe("User Friendly Messages", () => {
  it("should return friendly message for known error codes", () => {
    const authError = new AuthError();
    expect(getUserFriendlyMessage(authError)).toContain("sign in");

    const forbiddenError = new ForbiddenError();
    expect(getUserFriendlyMessage(forbiddenError)).toContain("permission");

    const rateLimitError = new RateLimitError();
    expect(getUserFriendlyMessage(rateLimitError)).toContain("often");
  });

  it("should return validation message as-is", () => {
    const error = new ValidationError("Email is required");
    expect(getUserFriendlyMessage(error)).toBe("Email is required");
  });

  it("should return generic message for unknown errors", () => {
    const error = new Error("Internal failure");
    expect(getUserFriendlyMessage(error)).toContain("Something went wrong");
  });
});

describe("Assertion Helpers", () => {
  describe("assert", () => {
    it("should not throw when condition is true", () => {
      expect(() => assert(true, "Error")).not.toThrow();
    });

    it("should throw ValidationError when condition is false", () => {
      expect(() => assert(false, "Validation failed")).toThrow(ValidationError);
      expect(() => assert(false, "Validation failed")).toThrow(
        "Validation failed",
      );
    });
  });

  describe("assertDefined", () => {
    it("should not throw for defined values", () => {
      expect(() => assertDefined("value")).not.toThrow();
      expect(() => assertDefined(0)).not.toThrow();
      expect(() => assertDefined(false)).not.toThrow();
      expect(() => assertDefined("")).not.toThrow();
    });

    it("should throw for null", () => {
      expect(() => assertDefined(null)).toThrow(ValidationError);
    });

    it("should throw for undefined", () => {
      expect(() => assertDefined(undefined)).toThrow(ValidationError);
    });

    it("should use custom message", () => {
      expect(() => assertDefined(null, "Custom message")).toThrow(
        "Custom message",
      );
    });
  });
});
