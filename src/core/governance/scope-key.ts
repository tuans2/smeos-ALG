/**
 * Địa chỉ phạm vi chuẩn dùng chung (ADR-012 D-T5): `platform · industry:<key> · org:<organization_id> · branch:<branch_id>`.
 *
 * Cột `scope` của `governance_decisions` (ADR-012 D-T10) lưu theo dạng này. Domain và API vẫn dùng dạng cũ ("GLOBAL",
 * id tổ chức thô, "industry:<key>"); repository đổi qua lại bằng hai hàm dưới đây.
 *
 * Luật thuần — không import Prisma.
 */
export const PLATFORM_SCOPE_KEY = "platform"
const LEGACY_PLATFORM = "GLOBAL"
const PREFIXES = ["industry:", "org:", "branch:"] as const

/** Dạng cũ (domain/API) → dạng lưu D-T5. */
export function toScopeKey(scopeId: string): string {
  if (scopeId === LEGACY_PLATFORM || scopeId === PLATFORM_SCOPE_KEY) return PLATFORM_SCOPE_KEY
  if (PREFIXES.some((p) => scopeId.startsWith(p))) return scopeId
  return `org:${scopeId}`
}

/** Dạng lưu D-T5 (hoặc dòng cũ chưa đổi) → dạng cũ domain/API đang dùng. */
export function fromScopeKey(stored: string): string {
  if (stored === PLATFORM_SCOPE_KEY || stored === LEGACY_PLATFORM) return LEGACY_PLATFORM
  if (stored.startsWith("org:")) return stored.slice("org:".length)
  return stored
}
