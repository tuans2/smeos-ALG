/**
 * Khóa tính năng chưa mở cho khách trên môi trường production.
 *
 * Bật khi `NEXT_PUBLIC_APP_ENV=production` (đặt trên dịch vụ production, biến
 * NEXT_PUBLIC_ gắn lúc build). Dev local và staging/preview không đặt biến
 * này → mọi tính năng chạy bình thường.
 *
 * Luật thuần — không import React.
 */

import { STORE_JOURNEYS } from "@/modules/journey/domain/journey-catalog"

/** Tuyến (và mọi tuyến con) bị khóa: sidebar làm mờ + trang hiện "Sắp ra mắt". */
export const LOCKED_ROUTE_PREFIXES: readonly string[] = [
  "/hoi-thoai",
  "/catalog",
  "/market-intelligence",
  "/creative-studio",
  "/video",
  "/noi-dung",
  "/lich-dang",
  "/kho-templates",
  // Nhóm "Vận hành" trên sidebar (PO 08/10/2026)
  "/dieu-phoi",
  "/job",
  "/duyet",
  "/so-lieu",
  "/bao-cao",
  "/muc-dung",
  "/audit",
  // Sidebar: Tính giá (Sản phẩm) + Tri thức, Chính sách AI, Kết nối kênh (Thiết lập) — PO 09/10/2026
  "/gia",
  "/tri-thuc",
  "/cai-dat-ai",
  "/ket-noi",
  // Khách hàng (Bán hàng & Khách) + Bộ máy phân tích ảnh (Thiết lập) — PO 09/10/2026
  "/khach-hang",
  "/bo-may",
  // Chat nội bộ & Profile kết nối — PO 25/10/2026
  "/tin-nhan",
  "/noi-bo/ket-noi",
]

/**
 * Trang chủ cửa hàng trên production: CHỈ các thẻ này hoạt động (PO 08/10/2026 —
 * chỉ mở Thẻ chào sản phẩm). Mọi thẻ khác của cửa hàng bị khóa "Sắp ra mắt".
 * Thẻ quản trị nền tảng / chuỗi không thuộc trang chủ cửa hàng nên không bị ảnh hưởng.
 */
export const UNLOCKED_STORE_JOURNEY_IDS: readonly string[] = [
  "greeting-card-hub",
  "create-order",
  "analyze-product-photo",
]

/** Thẻ chức năng trên trang chủ cửa hàng bị khóa (theo `JourneyDefinition.id`). */
export const LOCKED_JOURNEY_IDS: readonly string[] = STORE_JOURNEYS.map((j) => j.id).filter(
  (id) => !UNLOCKED_STORE_JOURNEY_IDS.includes(id)
)

export const COMING_SOON_LABEL = "Sắp ra mắt"

export function isFeatureLockEnabled(
  appEnv: string | undefined = process.env.NEXT_PUBLIC_APP_ENV
): boolean {
  return appEnv === "production"
}

/**
 * Tuyến CHƯA VẬN HÀNH ĐƯỢC trên production, khoá ở MỌI bản build production — không phụ thuộc
 * `NEXT_PUBLIC_APP_ENV` (P0-06):
 * - `/market-intelligence`: worker nghiên cứu thị trường chưa được triển khai (D-20b).
 * - `/lich-dang`, `/ket-noi`: còn gọi SocialFlow qua proxy, production không cấu hình SocialFlow; mở lại
 *   khi đăng bài chạy ngay trong SMEOS (Workstream S, `docs/audit/architecture-audit/17_…`).
 */
export const UNAVAILABLE_ROUTE_PREFIXES: readonly string[] = ["/market-intelligence", "/lich-dang", "/ket-noi"]

export function isUnavailableLockEnabled(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "production"
}

function matchesAny(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`))
}

/** `href` có thể kèm query (`/creative-studio?tab=area-d`). */
export function isRouteLocked(
  href: string,
  enabled = isFeatureLockEnabled(),
  unavailableEnabled = isUnavailableLockEnabled()
): boolean {
  const path = href.split(/[?#]/)[0] ?? href
  if (unavailableEnabled && matchesAny(path, UNAVAILABLE_ROUTE_PREFIXES)) return true
  if (!enabled) return false
  return matchesAny(path, LOCKED_ROUTE_PREFIXES)
}

export function isJourneyLocked(journeyId: string, enabled = isFeatureLockEnabled()): boolean {
  return enabled && LOCKED_JOURNEY_IDS.includes(journeyId)
}

/**
 * Lối vào (link, nút, deep link thông báo) chỉ hiện khi tuyến đích không bị khoá — audit N-05: khoá bật thì ẩn lối vào
 * thay vì đưa người dùng tới màn "Sắp ra mắt". Link ngoài (http…) và giá trị rỗng luôn coi là mở.
 */
export function isHrefOpen(
  href: string | null | undefined,
  enabled = isFeatureLockEnabled(),
  unavailableEnabled = isUnavailableLockEnabled()
): boolean {
  if (!href || !href.startsWith("/")) return true
  return !isRouteLocked(href, enabled, unavailableEnabled)
}

/** Giữ mục có lối vào còn mở (xem `isHrefOpen`). */
export function filterOpenHrefs<T>(
  items: readonly T[],
  hrefOf: (item: T) => string | null | undefined,
  enabled = isFeatureLockEnabled(),
  unavailableEnabled = isUnavailableLockEnabled()
): T[] {
  return items.filter((item) => isHrefOpen(hrefOf(item), enabled, unavailableEnabled))
}
