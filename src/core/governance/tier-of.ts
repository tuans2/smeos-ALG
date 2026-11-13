/**
 * Xác định tầng kiến trúc — MỘT nơi duy nhất (nợ #194, 30/10/2026).
 *
 * Trước đây 3 bản: `buildNav`/`mobileSecondSlot` (điều hướng), `governanceTierOf`
 * (ma trận quản trị), `resolveNotificationViewerTier` (ma trận thông báo).
 *
 * - `tierOf`: tầng TRẢI NGHIỆM của phiên (theo loại tổ chức + vai) — điều hướng, trang chủ.
 *   Loại `PLATFORM`/`INDUSTRY` không có trong enum `organization_type`; chỉ xuất hiện khi
 *   người vận hành xem trước tầng (`platform/domain/tier-preview.ts`).
 * - `organizationTierOf`: tầng DỮ LIỆU của một tổ chức tenant trong DB — chỉ CHAIN hoặc STORE
 *   (Mẹ và Ngành không phải tổ chức tenant).
 *
 * Thuần: nhận vai theo hình dạng tối thiểu, không import module nghiệp vụ.
 */

import type { GovernanceTier } from "./layered-resolver"

/** Hình dạng tối thiểu của vai (khớp `RoleUxDefinition`). */
export interface TierRoleHint {
  readonly key?: string | undefined
  readonly group?: string | undefined
}

const CHAIN_ORGANIZATION_TYPES = new Set(["CHAIN"]) // FLOWER_NETWORK gộp vào CHAIN (ADR-012 T-8b)

/** Tổ chức/vai thuộc tầng ChainOS. */
export function isChainTier(organizationType?: string | null, role?: TierRoleHint | null): boolean {
  if (organizationType && CHAIN_ORGANIZATION_TYPES.has(organizationType)) return true
  if (role?.group === "CHAIN" || role?.group === "FLOWER_NETWORK") return true
  return role?.key === "flower_network_admin"
}

/**
 * Tầng trải nghiệm. Thứ tự kiểm giữ nguyên luật điều hướng: Ngành trước Mẹ
 * (vai `industry_admin` cũng thuộc nhóm `PLATFORM`), rồi Chuỗi, còn lại Cửa hàng.
 */
export function tierOf(organizationType?: string | null, role?: TierRoleHint | null): GovernanceTier {
  if (organizationType === "INDUSTRY" || role?.key === "industry_admin") return "INDUSTRY"
  if (organizationType === "PLATFORM" || role?.group === "PLATFORM" || role?.key === "platform_admin") return "MOTHER"
  if (isChainTier(organizationType, role)) return "CHAIN"
  return "STORE"
}

/** Tầng dữ liệu của một tổ chức tenant (ma trận quản trị lưu theo tầng này). */
export function organizationTierOf(organizationType?: string | null): "CHAIN" | "STORE" {
  return isChainTier(organizationType, null) ? "CHAIN" : "STORE"
}
