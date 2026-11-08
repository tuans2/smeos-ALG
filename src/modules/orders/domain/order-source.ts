/**
 * Danh mục nguồn đơn — SSOT (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §2.2).
 * Pure TypeScript — không Prisma, không I/O.
 *
 * Một quy trình (quy trình Thẻ chào), nguồn chỉ quyết định bước vào. Thêm nguồn mới = thêm một dòng
 * ở `ORDER_SOURCES` + một adapter gọi cổng nhận đơn; không sửa quy trình.
 *
 * `BROCHURE` (Thẻ chào) được ĐÓNG BĂNG: khai báo ở đây chỉ để đọc/lọc/hiển thị, không đổi hành vi.
 */

export const ORDER_SOURCE_CODES = [
  "BROCHURE",
  "CATALOG",
  "LANDING",
  "SHORT_LINK",
  "CHAT",
  "MANUAL",
  "CHANNEL",
  "NETWORK",
  "QUOTATION",
] as const

export type OrderSourceCode = (typeof ORDER_SOURCE_CODES)[number]

/**
 * Bước đơn vào quy trình:
 * - `LEAD`: khách chưa đặt, Sale chăm; khách bấm Đặt hàng mới thành đơn.
 * - `AWAITING_PAYMENT`: đơn đã có, chờ báo giá / thanh toán (Sale).
 * - `COORDINATION`: đã thu (sàn thu hộ, thu tại quầy, đơn mạng lưới) → thẳng Điều phối.
 * - `LEGACY_BROCHURE`: giữ nguyên luồng Thẻ chào hiện hành, không qua cổng chung.
 */
export type OrderEntryStage = "LEAD" | "AWAITING_PAYMENT" | "COORDINATION" | "LEGACY_BROCHURE"

export interface OrderSourceDefinition {
  readonly code: OrderSourceCode
  /** Nhãn tiếng Việt hiển thị cho người dùng. */
  readonly label: string
  /** Bước vào mặc định khi khách/nguồn tạo đơn. */
  readonly entryStage: OrderEntryStage
  /** Nguồn có thể sinh lead (khách Liên hệ / bỏ dở) trước khi thành đơn. */
  readonly hasLead: boolean
  /** Trang khách có nút Đặt hàng / Liên hệ để Điều hành bật tắt (§3.2). */
  readonly hasCustomerEntryActions: boolean
}

export const ORDER_SOURCES: Readonly<Record<OrderSourceCode, OrderSourceDefinition>> = {
  BROCHURE: { code: "BROCHURE", label: "Thẻ chào", entryStage: "LEGACY_BROCHURE", hasLead: true, hasCustomerEntryActions: true },
  CATALOG: { code: "CATALOG", label: "Catalog", entryStage: "LEAD", hasLead: true, hasCustomerEntryActions: true },
  LANDING: { code: "LANDING", label: "Landing page", entryStage: "LEAD", hasLead: true, hasCustomerEntryActions: true },
  SHORT_LINK: { code: "SHORT_LINK", label: "Mã QR / link rút gọn", entryStage: "LEAD", hasLead: true, hasCustomerEntryActions: false },
  CHAT: { code: "CHAT", label: "Trò chuyện", entryStage: "LEAD", hasLead: true, hasCustomerEntryActions: false },
  MANUAL: { code: "MANUAL", label: "Nhập tay", entryStage: "AWAITING_PAYMENT", hasLead: false, hasCustomerEntryActions: false },
  CHANNEL: { code: "CHANNEL", label: "Kênh bán ngoài", entryStage: "COORDINATION", hasLead: false, hasCustomerEntryActions: false },
  NETWORK: { code: "NETWORK", label: "Đơn từ mạng lưới", entryStage: "COORDINATION", hasLead: false, hasCustomerEntryActions: false },
  QUOTATION: { code: "QUOTATION", label: "Báo giá", entryStage: "AWAITING_PAYMENT", hasLead: true, hasCustomerEntryActions: false },
}

/**
 * Nguồn khai được khi tạo đơn thẳng ở màn Điều phối (PO 07/11/2026, Q2: đơn tạo ở Điều phối vào thẳng điều phối).
 * Cùng danh mục với `orders.source` — bỏ bộ mã riêng `ORDER_M10 · CHAT_M08 · CATALOG_M06` (audit BL-06).
 * Thẻ chào có luồng riêng, không tạo ở Điều phối.
 */
export const COORDINATOR_ENTRY_SOURCES = ["MANUAL", "CHAT", "CATALOG", "LANDING", "SHORT_LINK", "CHANNEL", "NETWORK", "QUOTATION"] as const satisfies readonly OrderSourceCode[]
export type CoordinatorEntrySource = (typeof COORDINATOR_ENTRY_SOURCES)[number]

export function isOrderSourceCode(value: unknown): value is OrderSourceCode {
  return typeof value === "string" && (ORDER_SOURCE_CODES as readonly string[]).includes(value)
}

/**
 * Đọc `orders.source` (chữ tự do trong DB) về mã chuẩn. Giá trị lạ hoặc rỗng → `MANUAL`
 * (đúng mặc định cột `orders.source`). Chỉ dùng để đọc/hiển thị — không ghi ngược.
 */
export function normalizeOrderSource(value: unknown): OrderSourceCode {
  return isOrderSourceCode(value) ? value : "MANUAL"
}

export function orderSourceLabel(value: unknown): string {
  return ORDER_SOURCES[normalizeOrderSource(value)].label
}

/** Nguồn đi qua cổng nhận đơn chung (mọi nguồn trừ Thẻ chào — B1). */
export function usesSharedIngestion(source: OrderSourceCode): boolean {
  return ORDER_SOURCES[source].entryStage !== "LEGACY_BROCHURE"
}
