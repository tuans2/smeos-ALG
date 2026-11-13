import type { RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"
import { isChainTier, tierOf } from "@/core/governance/tier-of"

export type TenantViewerTier = "INDUSTRY" | "CHAIN" | "STORE"

/**
 * Tầng ma trận thông báo của tổ chức đang đăng nhập — cùng luật với điều hướng 4 tầng
 * (`buildNav`). AUD-024: trước đây so với "HEADQUARTERS" (không có trong enum) nên
 * tổ chức chuỗi rơi xuống ma trận Cửa hàng.
 */
export function resolveNotificationViewerTier(
  organizationType?: string | null,
  role?: RoleUxDefinition | null
): TenantViewerTier {
  // Luật tầng ở `core/governance/tier-of.ts`. Ma trận thông báo của tổ chức không có tầng Mẹ
  // (Mẹ quản ở /van-hanh) — người vận hành rơi về theo loại tổ chức/vai còn lại như trước.
  if (tierOf(organizationType, role) === "INDUSTRY") return "INDUSTRY"
  if (isChainTier(organizationType, role)) return "CHAIN"
  return "STORE"
}
