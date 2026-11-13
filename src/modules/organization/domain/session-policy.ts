/**
 * Luật về phiên. Thuần — không import hạ tầng.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000

export type SessionState = {
  readonly expires_at: Date
  readonly revoked_at: Date | null
}

export function expiresAt(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_MS)
}

export function isUsable(session: SessionState, now: Date): boolean {
  if (session.revoked_at !== null) return false
  return session.expires_at.getTime() > now.getTime()
}
