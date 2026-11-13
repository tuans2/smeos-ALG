/**
 * Sự kiện hành trình khách trên link bộ sưu tập (`/b/<mã>`), trình duyệt của khách gửi lên.
 * Lưu ở `greeting_journey_events` với tên viết hoa. Không gồm `order_completed` — mốc đó máy chủ
 * tự ghi khi tạo đơn (`SUBMIT_ORDER`), khách không tự báo được. Pure TypeScript.
 */

export const CUSTOMER_JOURNEY_EVENTS = [
  "collection_opened",
  "product_viewed",
  "product_liked",
  "product_unliked",
  "product_skipped",
  "product_revisited",
  "contact_zalo_clicked",
  "contact_call_clicked",
  "order_started",
  "checkout_started",
  "checkout_abandoned",
] as const

export type CustomerJourneyEvent = (typeof CUSTOMER_JOURNEY_EVENTS)[number] | "order_completed"

/** Tên lưu DB: `product_liked` → `PRODUCT_LIKED`. */
export function journeyEventType(event: CustomerJourneyEvent): string {
  return event.toUpperCase()
}

/**
 * Sự kiện lướt mẫu — nhiều và vụn, chỉ để thống kê. Dòng thời gian của nhân viên và bảng
 * theo dõi bỏ qua chúng (cùng mốc chủ phiên), chỉ giữ các mốc nghiệp vụ.
 */
export const BROWSING_EVENT_TYPES: readonly string[] = [
  ...CUSTOMER_JOURNEY_EVENTS.map((e) => e.toUpperCase()),
  "OWNER_CLAIMED",
]

export function isCustomerJourneyEvent(value: unknown): value is (typeof CUSTOMER_JOURNEY_EVENTS)[number] {
  return typeof value === "string" && (CUSTOMER_JOURNEY_EVENTS as readonly string[]).includes(value)
}
