/**
 * Luật thuần của token máy gọi máy (P7, `YC-T8`, đặc tả 08 mục 3). Không
 * import Prisma, không import `node:crypto` — sinh/băm token là việc của
 * `infra/token-crypto.ts` (cùng lý do `session-token.ts` của P1 nằm ở
 * `infra/`, không ở `domain/`).
 */

export const MIN_TOKEN_TTL_DAYS = 1
export const MAX_TOKEN_TTL_DAYS = 365
export const DEFAULT_TOKEN_TTL_DAYS = 90

export function isValidTtlDays(days: number): boolean {
  return Number.isInteger(days) && days >= MIN_TOKEN_TTL_DAYS && days <= MAX_TOKEN_TTL_DAYS
}

/**
 * Thời hạn (ngày) đã chọn lúc cấp một token = `expires_at − created_at`, để lần xoay giữ đúng thời hạn đó (audit API §19
 * — trước đây xoay luôn ra 90 ngày, token 30 ngày bị kéo dài ngoài ý người cấp). Lệch khỏi khoảng hợp lệ → mặc định.
 */
export function ttlDaysOf(token: { readonly created_at: Date; readonly expires_at: Date }): number {
  const days = Math.round((token.expires_at.getTime() - token.created_at.getTime()) / (24 * 60 * 60 * 1000))
  return isValidTtlDays(days) ? days : DEFAULT_TOKEN_TTL_DAYS
}

/** Hạn dùng mới, tính từ `now` — dùng cả lúc cấp mới lẫn lúc xoay. */
export function resolveExpiry(now: Date, ttlDays: number | undefined): Date {
  const days = ttlDays ?? DEFAULT_TOKEN_TTL_DAYS
  if (!isValidTtlDays(days)) {
    throw new RangeError(`ttlDays phải trong khoảng ${MIN_TOKEN_TTL_DAYS}..${MAX_TOKEN_TTL_DAYS}`)
  }
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

export type TokenActivityInput = {
  readonly revoked_at: Date | null
  readonly expires_at: Date
}

/**
 * Token còn dùng được: chưa bị thu hồi tay VÀ chưa quá hạn. Đây là điều kiện
 * duy nhất `IntegrationTokenRepository.findActiveByHash` áp — tách ra đây để
 * test được không cần cơ sở dữ liệu.
 */
export function isTokenActive(token: TokenActivityInput, now: Date): boolean {
  if (token.revoked_at !== null) return false
  return token.expires_at.getTime() > now.getTime()
}
