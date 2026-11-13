/**
 * Phạm vi xem đơn Thẻ chào của nhân viên bán hàng (`organizations.settings.brochure_visibility`).
 * `mode` = mặc định cho mọi sale (ALL = thấy mọi đơn; OWN = chỉ link/đơn do chính mình gửi);
 * `members[userId]` = Điều hành chọn riêng cho từng sale, đè lên mặc định. Pure TypeScript.
 */

export const VISIBILITY_SETTINGS_KEY = "brochure_visibility"
export type VisibilityMode = "ALL" | "OWN"

export interface VisibilitySettings {
  mode: VisibilityMode
  members: Record<string, VisibilityMode>
}

/**
 * Người có một trong các năng lực này luôn thấy mọi đơn (điều hành, điều phối, giao hàng) —
 * chế độ OWN chỉ áp cho nhân viên bán hàng. KHÔNG dùng R9 (ghi nhận thu tiền): vai `sale`
 * mặc định có R9, bản trước tính R9 nên chế độ OWN không bao giờ áp được cho sale.
 */
export const SEE_ALL_CAPABILITIES = ["R4", "R5", "F2"] as const

const asMode = (v: unknown): VisibilityMode | null => (v === "OWN" ? "OWN" : v === "ALL" ? "ALL" : null)

export function parseVisibility(settings: unknown): VisibilitySettings {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[VISIBILITY_SETTINGS_KEY]
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const members: Record<string, VisibilityMode> = {}
  if (obj.members && typeof obj.members === "object") {
    for (const [userId, v] of Object.entries(obj.members as Record<string, unknown>)) {
      const m = asMode(v)
      if (m && userId) members[userId] = m
    }
  }
  return { mode: asMode(obj.mode) ?? "ALL", members }
}

export function parseVisibilityMode(settings: unknown): VisibilityMode {
  return parseVisibility(settings).mode
}

export function alwaysSeesAll(capabilities: ReadonlySet<string>): boolean {
  return SEE_ALL_CAPABILITIES.some((c) => capabilities.has(c))
}

/** Chế độ thực tế của một người: riêng của họ nếu Điều hành đã chọn, không thì mặc định. */
export function memberMode(vis: VisibilitySettings | VisibilityMode, userId: string | null | undefined): VisibilityMode {
  if (typeof vis === "string") return vis
  return (userId && vis.members[userId]) || vis.mode
}

/** `userId` khi phải lọc theo sale phụ trách; `null` = thấy tất cả. */
export function ownSaleScope(
  vis: VisibilitySettings | VisibilityMode,
  user: { userId: string | null | undefined; capabilities: ReadonlySet<string> },
): string | null {
  if (!user.userId || memberMode(vis, user.userId) !== "OWN") return null
  return alwaysSeesAll(user.capabilities) ? null : user.userId
}
