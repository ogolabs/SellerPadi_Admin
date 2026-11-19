/**
 * Client-safe utilities for the Partner Program in the Admin Portal.
 * Zero database/server dependencies (pure TypeScript).
 */

/**
 * Normalizes a name for matching by removing common legal entity suffixes,
 * punctuation, and excessive whitespace.
 */
export function cleanNameTokens(name: string): string[] {
  const IGNORED_WORDS = new Set([
    "ltd",
    "limited",
    "llc",
    "plc",
    "inc",
    "incorporated",
    "corp",
    "corporation",
    "enterprise",
    "enterprises",
    "ventures",
    "services",
    "global",
    "solutions",
    "media",
    "group",
    "and",
    "the",
    "co",
    "company",
    "nigeria",
  ]);

  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !IGNORED_WORDS.has(token));
}

/**
 * Validates that a bank Account Name matches the partner's registered Full Name or Business Entity.
 * Used in the Admin Review interface to flag potential third-party account fraud.
 */
export function validateAccountNameMatch(
  accountName: string,
  registeredName: string
): { isValid: boolean; message?: string } {
  const cleanAccount = (accountName || "").trim();
  const cleanRegistered = (registeredName || "").trim();

  if (!cleanAccount) {
    return { isValid: false, message: "Account Name is not configured." };
  }
  if (!cleanRegistered) {
    return { isValid: false, message: "Registered Full Name is missing." };
  }

  const normAccount = cleanAccount.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normRegistered = cleanRegistered.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Direct or substring match (e.g. "John Doe" in "John Babatunde Doe")
  if (
    normAccount === normRegistered ||
    normAccount.includes(normRegistered) ||
    normRegistered.includes(normAccount)
  ) {
    return { isValid: true };
  }

  // 2. Token-level comparison
  const accountTokens = cleanNameTokens(cleanAccount);
  const registeredTokens = cleanNameTokens(cleanRegistered);

  if (accountTokens.length === 0 || registeredTokens.length === 0) {
    const isBasicMatch = normAccount.includes(normRegistered) || normRegistered.includes(normAccount);
    return isBasicMatch
      ? { isValid: true }
      : {
          isValid: false,
          message: `Bank Account Name (${cleanAccount}) does not match registered name (${cleanRegistered}).`,
        };
  }

  // Count matching tokens
  const matchingTokens = registeredTokens.filter((t) => accountTokens.includes(t));

  // If at least one significant name token matches when registered has 1-2 tokens,
  // or at least 2 tokens match when registered has 3+ tokens, consider it valid
  const minRequiredMatches = registeredTokens.length <= 2 ? 1 : 2;
  const isMatch = matchingTokens.length >= minRequiredMatches;

  if (!isMatch) {
    return {
      isValid: false,
      message: `Bank Account Name (${cleanAccount}) does not match registered name (${cleanRegistered}).`,
    };
  }

  return { isValid: true };
}
