/**
 * Email Verification Service
 *
 * Provides utilities for verifying email addresses before sending
 * to improve deliverability and reduce bounce rates.
 */

/**
 * Verification result
 */
export interface VerificationResult {
  isValid: boolean;
  reason?: string;
  isDisposable?: boolean;
  isRoleBased?: boolean;
  score: number; // 0-100
}

/**
 * List of common disposable email domains
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "throwawaymail.com",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "pokemail.net",
  "grr.la",
]);

/**
 * List of common role-based email prefixes
 */
const ROLE_PREFIXES = new Set([
  "admin",
  "administrator",
  "webmaster",
  "hostmaster",
  "postmaster",
  "info",
  "support",
  "contact",
  "sales",
  "marketing",
  "billing",
  "noreply",
  "no-reply",
  "jobs",
  "hr",
]);

export class VerificationService {
  /**
   * Verify an email address
   *
   * @param email - Email address to verify
   * @returns Verification result
   */
  static async verifyEmail(email: string): Promise<VerificationResult> {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Basic syntax check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        reason: "Invalid syntax",
        score: 0,
      };
    }

    const [localPart, domain] = trimmedEmail.split("@");

    // 2. Check for disposable domains
    const isDisposable = DISPOSABLE_DOMAINS.has(domain);

    // 3. Check for role-based emails
    const isRoleBased = ROLE_PREFIXES.has(localPart);

    // Calculate score
    let score = 100;
    if (isDisposable) {
      score -= 50;
    }
    if (isRoleBased) {
      score -= 20;
    }

    return {
      isValid: score > 0,
      reason: isDisposable
        ? "Disposable email domain"
        : isRoleBased
          ? "Role-based email"
          : undefined,
      isDisposable,
      isRoleBased,
      score,
    };
  }

  /**
   * Verify a batch of email addresses
   *
   * @param emails - Array of email addresses
   * @returns Map of email to verification result
   */
  static async verifyBatch(emails: string[]): Promise<Map<string, VerificationResult>> {
    const results = new Map<string, VerificationResult>();

    // Process in parallel with a limit if needed, but for now just Promise.all
    const verificationPromises = emails.map(async (email) => {
      const result = await this.verifyEmail(email);
      results.set(email, result);
    });

    await Promise.all(verificationPromises);

    return results;
  }
}

export default VerificationService;
