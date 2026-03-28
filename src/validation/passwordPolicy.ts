/**
 * Shared password rules (signup / change password / reset): min length 8, complexity, no spaces, digit-run limit.
 */

export const PASSWORD_MIN_LENGTH = 8;

const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;
const WHITESPACE_REGEX = /\s/;

export const hasLongDigitSequence = (value: string) => {
  let run = 1;
  let lastDigit: number | null = null;

  for (const char of value) {
    const digit = Number.isNaN(Number(char)) ? null : Number(char);
    if (digit === null) {
      run = 1;
      lastDigit = null;
      continue;
    }

    if (lastDigit !== null && digit === lastDigit + 1) {
      run += 1;
      if (run > 3) {
        return true;
      }
    } else {
      run = 1;
    }
    lastDigit = digit;
  }

  return false;
};

export type PasswordRuleFlags = {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
  noSpaces: boolean;
  noSequence: boolean;
};

export function evaluatePassword(password: string): { rules: PasswordRuleFlags; isValid: boolean } {
  const minLength = password.length >= PASSWORD_MIN_LENGTH;
  const uppercase = UPPERCASE_REGEX.test(password);
  const number = NUMBER_REGEX.test(password);
  const special = SPECIAL_REGEX.test(password);
  const noSpaces = !WHITESPACE_REGEX.test(password) && password.length > 0;
  const noSequence = !hasLongDigitSequence(password);

  const rules: PasswordRuleFlags = {
    minLength,
    uppercase,
    number,
    special,
    noSpaces,
    noSequence,
  };

  const isValid =
    minLength && uppercase && number && special && noSpaces && noSequence;

  return { rules, isValid };
}
