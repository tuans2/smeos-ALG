import { ROLE_UX_CATALOG, type RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"

/**
 * Xem trước tầng kiến trúc (SaaS Mother, SaaS Ngành, ChainOS, StoreOS) cho
 * người vận hành nền tảng trên production — thay cho cookie dev chỉ chạy
 * ở môi trường phát triển.
 *
 * Chỉ đổi KHUÔN TRẢI NGHIỆM (roleKey + loại tổ chức để chọn trang chủ và
 * thứ tự điều hướng). Không đổi tổ chức, mã năng lực hay dữ liệu được đọc:
 * mọi API vẫn đi qua `requireTenantContext()`/`requireCapability()` của
 * phiên thật, nên không nới cách ly tenant hay RBAC.
 */
export const TIER_PREVIEW_COOKIE = "alg_tier_preview"
/** Tên trước khi đổi thương hiệu ALG (12/11/2026) — vẫn đọc để phiên xem trước đang mở không bị ngắt. */
export const LEGACY_TIER_PREVIEW_COOKIE = "smeos_tier_preview"

/** Mã năng lực nền tảng bắt buộc để xem trước tầng (xem mọi tổ chức). */
export const TIER_PREVIEW_CAPABILITY = "N1"

export interface TierPreview {
  roleKey: string
  organizationType: string
  orgNameSuffix: string
}

export function canUseTierPreview(platformCapabilities: readonly string[]): boolean {
  return platformCapabilities.includes(TIER_PREVIEW_CAPABILITY)
}

function organizationTypeFor(role: RoleUxDefinition): string {
  if (role.key === "platform_admin") return "PLATFORM"
  if (role.key === "industry_admin") return "INDUSTRY"
  if (role.group === "FLOWER_NETWORK" || role.group === "CHAIN") return "CHAIN"
  return "SINGLE"
}

/** Loại tổ chức suy từ danh mục ở máy chủ — không nhận từ người gọi. */
export function buildTierPreview(roleKey: string): TierPreview | null {
  const role = ROLE_UX_CATALOG.find((r) => r.key === roleKey)
  if (!role || role.status !== "AVAILABLE") return null
  return { roleKey: role.key, organizationType: organizationTypeFor(role), orgNameSuffix: `[${role.label}]` }
}

export function entryHrefFor(roleKey: string): string {
  if (roleKey === "platform_admin") return "/van-hanh"
  return ROLE_UX_CATALOG.find((r) => r.key === roleKey)?.entryHref || "/"
}

/** Cookie chỉ lưu roleKey; mọi trường khác dựng lại từ danh mục. */
export function parseTierPreview(raw: string | null | undefined): TierPreview | null {
  if (!raw) return null
  return buildTierPreview(raw.trim())
}
