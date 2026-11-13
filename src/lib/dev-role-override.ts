/**
 * Dev Role Override — CHỈ DÙNG TRONG MÔI TRƯỜNG DEVELOPMENT.
 *
 * Cho phép developer switch nhanh giữa các vai / tầng kiến trúc
 * (StoreOS, ChainOS, SaaS Mother) qua cookie `alg_dev_role`
 * mà KHÔNG cần đăng nhập lại hay thay đổi DB.
 *
 * Cookie format: JSON string của `DevRoleOverride`.
 * API:  POST /api/dev/role-override  { roleKey, organizationType }
 *       DELETE /api/dev/role-override  (xoá override)
 *
 * Server component đọc cookie → merge vào MockSession trước khi
 * truyền vào SessionProvider.
 *
 * ⚠️  Guard kép: file này không import gì nặng; người gọi (API route +
 *    layout) phải tự kiểm `process.env.NODE_ENV !== "production"` trước
 *    khi dùng — không bao giờ expose endpoint này ở production.
 */

import type { MockSession } from "@/lib/mock-data"

/** Tên cookie dev override — dùng chung ở mọi nơi, không hardcode. */
export const DEV_ROLE_COOKIE = "alg_dev_role"

export interface DevRoleOverride {
  roleKey: string
  /** organizationType khớp với enum organizations.type trong DB */
  organizationType: string
  /** Tên hiển thị (orgName) tuỳ chọn — để badge dễ nhận biết */
  orgNameSuffix?: string
}

/**
 * Danh sách preset override cho UI switcher.
 * Mỗi preset ánh xạ 1-1 với một tầng kiến trúc.
 */
export const DEV_ROLE_PRESETS: readonly (DevRoleOverride & { label: string; badge: string })[] = [
  {
    label: "StoreOS — Quản trị cửa hàng",
    badge: "StoreOS",
    roleKey: "store_admin",
    organizationType: "SINGLE",
    orgNameSuffix: "[DEV Store]",
  },
  {
    label: "ChainOS — Quản trị mạng lưới chuỗi",
    badge: "ChainOS",
    roleKey: "flower_network_admin",
    organizationType: "CHAIN", // D-55: loại tổ chức chuỗi lưu là CHAIN
    orgNameSuffix: "[DEV Chain]",
  },
  {
    label: "SaaS Đa Ngành — Quản trị hệ sinh thái ngành",
    badge: "SaaS Ngành",
    roleKey: "industry_admin",
    organizationType: "INDUSTRY",
    orgNameSuffix: "[DEV Industry Hub]",
  },
  {
    label: "SaaS Mother — Quản trị nền tảng",
    badge: "SaaS Mother",
    roleKey: "platform_admin",
    organizationType: "PLATFORM",
    orgNameSuffix: "[DEV Platform]",
  },
  {
    label: "Bán hàng (StoreOS)",
    badge: "Sales",
    roleKey: "sales",
    organizationType: "SINGLE",
    orgNameSuffix: "[DEV Sales]",
  },
  {
    label: "Điều phối (StoreOS)",
    badge: "Coord",
    roleKey: "coordinator",
    organizationType: "SINGLE",
    orgNameSuffix: "[DEV Coord]",
  },
]

/**
 * Parse cookie string → DevRoleOverride hoặc null nếu không hợp lệ.
 * Dùng ở Server Component / API route sau khi `await cookies()`.
 */
export function parseDevRoleOverride(rawValue: string | undefined): DevRoleOverride | null {
  if (!rawValue) return null
  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "roleKey" in parsed &&
      "organizationType" in parsed &&
      typeof (parsed as Record<string, unknown>).roleKey === "string" &&
      typeof (parsed as Record<string, unknown>).organizationType === "string"
    ) {
      return parsed as DevRoleOverride
    }
    return null
  } catch {
    return null
  }
}

/**
 * Merge DevRoleOverride vào MockSession hiện tại.
 * Giữ nguyên các trường không liên quan (userName, capabilities, v.v.)
 * — chỉ thay roleKey + organizationType + orgName suffix.
 */
export function applyDevRoleOverride(
  session: MockSession,
  override: DevRoleOverride
): MockSession {
  const suffix = override.orgNameSuffix ? ` ${override.orgNameSuffix}` : ""
  const baseName = session.orgName.replace(/\s*\[DEV[^\]]*\]/g, "").trim()
  return {
    ...session,
    roleKey: override.roleKey,
    organizationType: override.organizationType,
    orgName: `${baseName}${suffix}`,
  }
}
