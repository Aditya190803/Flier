/**
 * Centralized Error Handling Utilities
 * Provides consistent error types, formatting, and responses across the application
 */

import { apiLogger } from "./logger";

// ============================================
// Error Types
// ============================================

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(message: string = "Authentication required", details?: Record<string, unknown>) {
    super(message, "AUTH_ERROR", 401, true, details);
    this.name = "AuthError";
  }
}

/**
 * Authorization error (authenticated but not permitted)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied", details?: Record<string, unknown>) {
    super(message, "FORBIDDEN", 403, true, details);
    this.name = "ForbiddenError";
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", details?: Record<string, unknown>) {
    super(`${resource} not found`, "NOT_FOUND", 404, true, details);
    this.name = "NotFoundError";
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, true, details);
    this.name = "ValidationError";
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60, details?: Record<string, unknown>) {
    super("Too many requests. Please try again later.", "RATE_LIMIT", 429, true, details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * External service error (Gmail, Appwrite, etc.)
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(`${service} error: ${message}`, "EXTERNAL_SERVICE_ERROR", 502, true, details);
    this.name = "ExternalServiceError";
    this.service = service;
  }
}

/**
 * Email sending error
 */
export class EmailError extends AppError {
  public readonly email?: string;

  constructor(message: string, email?: string, details?: Record<string, unknown>) {
    super(message, "EMAIL_ERROR", 500, true, { ...details, email });
    this.name = "EmailError";
    this.email = email;
  }
}

// ============================================
// Error Response Formatting
// ============================================

/**
 * Standard API error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

/**
 * Format an error into a consistent API response
 */
export function formatErrorResponse(error: Error | AppError, requestId?: string): ErrorResponse {
  const isAppError = error instanceof AppError;

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === "production";

  const response: ErrorResponse = {
    error: isAppError ? error.name : "InternalError",
    message: isProduction && !isAppError ? "An unexpected error occurred" : error.message,
    code: isAppError ? error.code : "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
  };

  if (requestId) {
    response.requestId = requestId;
  }

  // Include details only for operational errors
  if (isAppError && error.isOperational && error.details) {
    response.details = error.details;
  }

  return response;
}

/**
 * Create an error Response object
 */
export function errorResponse(error: Error | AppError, requestId?: string): Response {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const body = formatErrorResponse(error, requestId);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add Retry-After header for rate limit errors
  if (error instanceof RateLimitError) {
    headers["Retry-After"] = String(error.retryAfter);
  }

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers,
  });
}

// ============================================
// User-Friendly Error Messages
// ============================================

/**
 * Map of error codes to user-friendly messages
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  AUTH_ERROR: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested item could not be found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  RATE_LIMIT: "You're doing that too often. Please wait a moment.",
  EXTERNAL_SERVICE_ERROR: "A service we depend on is having issues. Please try again.",
  EMAIL_ERROR: "There was a problem sending the email. Please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
};

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  // For validation errors, return the actual message as it's usually user-friendly
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof AppError && USER_FRIENDLY_MESSAGES[error.code]) {
    return USER_FRIENDLY_MESSAGES[error.code];
  }

  return USER_FRIENDLY_MESSAGES.INTERNAL_ERROR;
}

// ============================================
// Error Logging
// ============================================

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log an error with context
 */
export function logError(error: Error | AppError, context?: Record<string, unknown>): void {
  const isAppError = error instanceof AppError;
  const isOperational = isAppError && error.isOperational;

  const logData = {
    name: error.name,
    message: error.message,
    code: isAppError ? error.code : "UNKNOWN",
    isOperational,
    stack: error.stack,
    ...context,
    ...(isAppError ? error.details : {}),
    timestamp: new Date().toISOString(),
  };

  // Use apiLogger.error for non-operational (unexpected) errors
  // Use apiLogger.warn for operational (expected) errors
  if (isOperational) {
    apiLogger.warn("[AppError]", logData);
  } else {
    apiLogger.error("[UnexpectedError]", logData);
  }
}

// ============================================
// Error Handling Middleware
// ============================================

/**
 * Wrap an async API handler with error handling
 */
export function withErrorHandling(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      const requestId = crypto.randomUUID();

      if (error instanceof Error) {
        logError(error, {
          requestId,
          url: request.url,
          method: request.method,
        });
        return errorResponse(error, requestId);
      }

      // Handle non-Error throws
      const unknownError = new AppError("An unknown error occurred", "UNKNOWN_ERROR", 500, false);
      logError(unknownError, { requestId, originalError: String(error) });
      return errorResponse(unknownError, requestId);
    }
  };
}

// ============================================
// Common Error Patterns
// ============================================

/**
 * Assert a condition and throw ValidationError if false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new ValidationError(message);
  }
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = "Value is required",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
}

/**
 * Try to parse JSON, returning AppError on failure
 */
export async function tryParseJSON<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError("Invalid JSON in request body");
  }
}
