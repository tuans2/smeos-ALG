/**
 * nav-matrix.ts — Industry Navigation Matrix SSOT
 *
 * Lớp 1 trong chuỗi lọc 3 lớp: Industry Nav Matrix → RBAC → Feature Lock.
 * Admin SaaS cấu hình tại Console `/van-hanh` — tổ chức KHÔNG biết/KHÔNG thấy.
 *
 * Mỗi mục sidebar có một `navKey` duy nhất. Matrix xác định mục nào hiển thị
 * cho ngành nào dựa trên `hiddenNavKeys` trong Industry Plugin.
 *
 * Luật thuần — không import React, không import Prisma.
 */

import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

/**
 * Toàn bộ navKey hợp lệ trong hệ thống.
 * Đăng ký ở đây trước khi dùng trong NAV_ENTRIES.
 */
export const ALL_NAV_KEYS = [
  "home",
  "toolkit",
  "customers",
  "orders",
  "chat",
  "catalog",
  "greeting-card",
  "products",
  "availability",
  "create-product",
  "bulk-import",
  "scan-photo",
  "storage",
  "pricing",
  "market-intel",
  "creative-studio",
  "marketing-photo",
  "video",
  "content",
  "schedule",
  "templates",
  "coordinator",
  "branch-portal",
  "internal-chat",
  "connect-identity",
  "chain-data",
  "jobs",
  "approval",
  "stats",
  "reports",
  "usage",
  "audit",
  "profile",
  "knowledge",
  "ai-policy",
  "channels",
  "engine",
  "settings",
  "integrations",
  "platform-integrations",
  "business-profile",
  "team",
  "store-notifications",
  "store-matrix-promotions",
  "store-matrix-commitments",
  "store-matrix-policies",
  "store-matrix-payments",
  "store-matrix-craft-fees",
  "system-optimizer",
  "platform-config",
] as const

export type NavKey = (typeof ALL_NAV_KEYS)[number]

/** Ánh xạ href → navKey để liên kết NAV_ENTRIES với matrix. */
export const HREF_TO_NAV_KEY: Record<string, NavKey> = {
  "/": "home",
  "/cong-cu": "toolkit",
  "/cong-cu/toi-uu-he-thong": "system-optimizer",
  "/khach-hang": "customers",
  "/don-hang": "orders",
  "/hoi-thoai": "chat",
  "/catalog": "catalog",
  "/the-chao": "greeting-card",
  "/san-pham": "products",
  "/san-pham/kha-dung": "availability",
  "/san-pham/tao-moi": "create-product",
  "/san-pham/nhap-hang-loat": "bulk-import",
  "/tai-anh": "scan-photo",
  "/kho-du-lieu": "storage",
  "/gia": "pricing",
  "/market-intelligence": "market-intel",
  "/creative-studio": "creative-studio",
  "/creative-studio?tab=area-d": "marketing-photo",
  "/video": "video",
  "/noi-dung": "content",
  "/lich-dang": "schedule",
  "/kho-templates": "templates",
  "/dieu-phoi": "coordinator",
  "/cua-hang": "branch-portal",
  "/tin-nhan": "internal-chat",
  "/noi-bo/ket-noi": "connect-identity",
  "/du-lieu": "chain-data",
  "/job": "jobs",
  "/duyet": "approval",
  "/so-lieu": "stats",
  "/bao-cao": "reports",
  "/muc-dung": "usage",
  "/audit": "audit",
  "/ho-so": "profile",
  "/tri-thuc": "knowledge",
  "/cai-dat-ai": "ai-policy",
  "/ket-noi": "channels",
  "/bo-may": "engine",
  "/cai-dat": "settings",
  "/tich-hop": "integrations",
  "/van-hanh/tich-hop": "platform-integrations",
  "/cai-dat?tab=INFO": "business-profile",
  "/cai-dat/thanh-vien": "team",
  "/cai-dat/thong-bao": "store-notifications",
  "/cai-dat/ma-tran-uudai": "store-matrix-promotions",
  "/cai-dat/ma-tran-camket": "store-matrix-commitments",
  "/cai-dat/ma-tran-chinhsach": "store-matrix-policies",
  "/cai-dat/ma-tran-thanhtoan-datco": "store-matrix-payments",
  "/cai-dat/ma-tran-phigiacong": "store-matrix-craft-fees",
  "/van-hanh/cau-hinh": "platform-config",
}

/**
 * Tính toán tập navKey bị ẩn cho một ngành cụ thể.
 *
 * Lớp 1: Ghi đè của Admin SaaS (Console `/van-hanh`) cho ngành của tổ chức — máy chủ đọc từ CSDL
 * và gửi xuống qua phiên (`organization.navHiddenKeys`), KHÔNG đóng gói lúc build (rà soát M13).
 * Mặc định: Đọc từ Industry Plugin (code-level SSOT).
 */
export function getHiddenNavKeys(
  industryKey?: string | null,
  navHiddenOverride?: readonly string[] | null
): ReadonlySet<string> {
  if (navHiddenOverride && navHiddenOverride.length > 0) return new Set(navHiddenOverride)
  return new Set(getIndustryPlugin(industryKey).navigation.hiddenNavKeys)
}

/**
 * Kiểm tra một navKey có hiển thị cho ngành đã cho hay không.
 */
export function isNavKeyVisible(
  navKey: string,
  industryKey?: string | null,
  navHiddenOverride?: readonly string[] | null
): boolean {
  const hidden = getHiddenNavKeys(industryKey, navHiddenOverride)
  return !hidden.has(navKey)
}

/**
 * Lọc danh sách href: chỉ giữ lại href có navKey được hiển thị cho ngành.
 */
export function filterHrefsByIndustry(
  hrefs: readonly string[],
  industryKey?: string | null,
  navHiddenOverride?: readonly string[] | null
): string[] {
  const hidden = getHiddenNavKeys(industryKey, navHiddenOverride)
  return hrefs.filter((href) => {
    const navKey = HREF_TO_NAV_KEY[href]
    if (!navKey) return true // href không có trong matrix → luôn hiện
    return !hidden.has(navKey)
  })
}
