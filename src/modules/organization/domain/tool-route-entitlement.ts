/**
 * Chặn công cụ bị cấp trên khoá ở MÁY CHỦ (trước đây chỉ ẩn menu — gõ thẳng URL vẫn dùng được).
 *
 * `organizations.settings.unlocked_tools` của cửa hàng đối tác:
 * - không phải mảng (null/thiếu) → không giới hạn;
 * - là mảng (kể cả rỗng) → chỉ các công cụ trong mảng được dùng — khớp `buildStoreNav`.
 *
 * Chỉ khai báo API dùng RIÊNG cho từng công cụ; API dùng chung (ảnh, sản phẩm, đơn…) không khoá
 * vì nhiều màn hình khác cần đến. Thư viện công cụ (`toolkit`) luôn mở.
 */

export type ToolRouteRule = {
  readonly navKey: string
  readonly pages: readonly string[]
  readonly apis: readonly string[]
}

export const TOOL_ROUTE_RULES: readonly ToolRouteRule[] = [
  { navKey: "creative-studio", pages: ["/creative-studio"], apis: ["/api/v1/creative-production"] },
  { navKey: "greeting-card", pages: ["/the-chao"], apis: [] },
  { navKey: "catalog", pages: ["/catalog"], apis: ["/api/v1/catalog-links"] },
  { navKey: "scan-photo", pages: ["/tai-anh"], apis: [] },
  { navKey: "video", pages: ["/video"], apis: ["/api/v1/video", "/api/v1/audio"] },
  { navKey: "content", pages: ["/noi-dung"], apis: [] },
  { navKey: "market-intel", pages: ["/market-intelligence"], apis: ["/api/v1/market-intelligence"] },
  { navKey: "templates", pages: ["/kho-templates"], apis: [] },
  { navKey: "system-optimizer", pages: ["/cong-cu/toi-uu-he-thong"], apis: [] },
]

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Công cụ mà đường dẫn này thuộc về (trang hoặc API riêng), hoặc null. */
export function toolForPath(pathname: string): string | null {
  for (const rule of TOOL_ROUTE_RULES) {
    if ([...rule.pages, ...rule.apis].some((p) => matchesPrefix(pathname, p))) return rule.navKey
  }
  return null
}

/** Đọc danh sách mở khoá từ settings; null = không giới hạn. */
export function unlockedToolsFrom(settings: unknown): string[] | null {
  if (!settings || typeof settings !== "object") return null
  const raw = (settings as { unlocked_tools?: unknown }).unlocked_tools
  if (!Array.isArray(raw)) return null
  return raw.filter((x): x is string => typeof x === "string")
}

/** navKey bị khoá cho đường dẫn này, hoặc null nếu được phép. */
export function lockedToolForPath(pathname: string, unlockedTools: readonly string[] | null): string | null {
  if (unlockedTools === null) return null
  const tool = toolForPath(pathname)
  if (!tool || unlockedTools.includes(tool)) return null
  return tool
}
