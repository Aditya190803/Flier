export const isRateLimitError = (errorMessage: string, statusCode?: number): boolean => {
  if (statusCode === 429) {
    return true;
  }

  const rateLimitIndicators = [
    "429",
    "rate limit",
    "too many requests",
    "quota exceeded",
    "user-rate limit exceeded",
  ];

  return rateLimitIndicators.some((indicator) =>
    errorMessage.toLowerCase().includes(indicator.toLowerCase()),
  );
};

export const isRetryableError = (errorMessage: string): boolean => {
  const nonRetryableErrors = [
    "Session expired",
    "Unauthorized",
    "401",
    "Gmail connection",
    "user profile",
    "sign in again",
    "Invalid email",
    "invalid address",
    "Email too large",
    "413",
    "Recipient unsubscribed",
    "unsubscribed",
    "may have been sent",
    "check your Gmail Sent folder",
  ];

  return !nonRetryableErrors.some((e) => errorMessage.toLowerCase().includes(e.toLowerCase()));
};

export const isPersistentError = (errorMessage: string): boolean => {
  const persistentErrors = [
    "Session expired",
    "Unauthorized",
    "401",
    "403",
    "Forbidden",
    "Permission denied",
    "Invalid credentials",
    "Access token expired",
    "Gmail connection",
    "user profile",
    "sign in again",
    "Gmail permissions",
    "Quota exceeded",
    "Daily limit reached",
    "Invalid Grant",
    "Bad Request",
  ];

  return persistentErrors.some((e) => errorMessage.toLowerCase().includes(e.toLowerCase()));
};
