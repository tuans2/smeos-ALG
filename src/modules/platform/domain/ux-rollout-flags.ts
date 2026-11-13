/**
 * Cờ rollout cho các màn nâng cấp theo chuẩn Progressive Disclosure (03c §6.1, E9).
 *
 * Mỗi cờ: `off` · `allowlist` (chỉ các organization_id liệt kê) · `all`.
 * Danh sách tổ chức chỉ nằm ở server — client chỉ nhận cờ nào đang bật cho chính tổ chức của mình.
 */

export const UX_ROLLOUT_FLAG_KEYS = [
  "ux_pd_anh_san_pham",
  "ux_pd_bo_anh_san_pham",
  "ux_pd_poster_banner",
  "ux_pd_the_chao_san_pham",
  "ux_pd_noi_dung",
  "ux_pd_catalog_nhu_cau",
  "ux_pd_market_intelligence",
  "ux_pd_cai_dat",
] as const

export type UxRolloutFlagKey = (typeof UX_ROLLOUT_FLAG_KEYS)[number]

export type UxRolloutMode = "off" | "allowlist" | "all"

export interface UxRolloutRule {
  mode: UxRolloutMode
  organizationIds: string[]
}

export type UxRolloutFlags = Record<UxRolloutFlagKey, UxRolloutRule>

const OFF: UxRolloutRule = { mode: "off", organizationIds: [] }

export function isUxRolloutFlagKey(key: string): key is UxRolloutFlagKey {
  return (UX_ROLLOUT_FLAG_KEYS as readonly string[]).includes(key)
}

function parseRule(raw: unknown): UxRolloutRule {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return OFF
  const { mode, organizationIds } = raw as { mode?: unknown; organizationIds?: unknown }
  const ids = Array.isArray(organizationIds)
    ? [...new Set(organizationIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : []
  if (mode === "all") return { mode: "all", organizationIds: [] }
  if (mode === "allowlist") return { mode: "allowlist", organizationIds: ids }
  return OFF
}

/** Giá trị lạ, cờ lạ hoặc thiếu đều thành `off` — an toàn mặc định là màn cũ. */
export function parseUxRolloutFlags(raw: unknown): UxRolloutFlags {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const flags = {} as UxRolloutFlags
  for (const key of UX_ROLLOUT_FLAG_KEYS) flags[key] = parseRule(source[key])
  return flags
}

export function isUxRolloutEnabled(flags: UxRolloutFlags, key: UxRolloutFlagKey, organizationId: string): boolean {
  const rule = flags[key]
  if (!rule || !organizationId) return false
  if (rule.mode === "all") return true
  if (rule.mode === "allowlist") return rule.organizationIds.includes(organizationId)
  return false
}

/** Các cờ đang bật cho một tổ chức — thứ duy nhất được trả cho client. */
export function enabledUxRolloutFlagsFor(flags: UxRolloutFlags, organizationId: string): UxRolloutFlagKey[] {
  return UX_ROLLOUT_FLAG_KEYS.filter((key) => isUxRolloutEnabled(flags, key, organizationId))
}
