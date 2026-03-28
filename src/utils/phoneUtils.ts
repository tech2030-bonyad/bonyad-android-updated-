/**
 * Normalize phone number to English (Western) numerals before sending to backend.
 * Converts Arabic (٠-٩) and Persian/Urdu (۰-۹) digits to 0-9.
 */
const ARABIC_TO_ENGLISH: Record<string, string> = {
  '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
  '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
  '\u06F0': '0', '\u06F1': '1', '\u06F2': '2', '\u06F3': '3', '\u06F4': '4',
  '\u06F5': '5', '\u06F6': '6', '\u06F7': '7', '\u06F8': '8', '\u06F9': '9',
};

export function normalizePhoneToEnglish(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;
  return phone
    .split('')
    .map((char) => ARABIC_TO_ENGLISH[char] ?? char)
    .join('');
}
