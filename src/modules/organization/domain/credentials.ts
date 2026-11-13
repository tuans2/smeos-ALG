/**
 * Luật về danh khoản. Thuần — không import hạ tầng, không băm ở đây.
 */

export const MIN_PASSWORD_LENGTH = 10

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isAcceptablePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}
