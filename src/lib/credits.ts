export const FREE_CREDIT_LIMIT = 5;
export const FREE_CREDITS_KEY = 'pet-id-photo-free-credits-used';
export const PAID_CREDITS_KEY = 'pet-id-photo-paid-credits';
export const LOCALE_KEY = 'pet-id-photo-locale';
export const REDEEMED_CODES_KEY = 'pet-id-photo-redeemed-codes';

export function clampCreditValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}
