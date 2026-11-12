import { ERASED_CUSTOMER_NAME, ERASED_MARKER } from "../domain/tenant-purge-policy"
import type { RetentionCategory } from "../domain/retention-policy"

/**
 * Bảng và điều kiện "quá hạn" của từng loại dữ liệu (ADR-014 D-P4, bước P-6) — luật ở `../domain/retention-policy.ts`.
 * Tên bảng, cột, dấu ẩn danh viết cố định ở đây, không lấy từ người gọi; mốc cắt và thời điểm chạy đi qua tham số
 * (`$1` = mốc cắt, `$2` = bây giờ). Dòng của tổ chức đang legal hold luôn bị bỏ qua. Thứ tự trong một loại có nghĩa:
 * bảng con trước (điều kiện của bảng sau không đổi sau khi bảng trước đã xử lý).
 */
export interface RetentionTarget {
  table: string
  /** Khoá chính — chọn lô theo khoá rồi mới xoá/sửa, để mỗi giao dịch ngắn. */
  key: string
  where: string
  /** `SET …` khi ẩn danh; không có = xoá dòng. */
  set?: string
}

const NOT_ON_HOLD = `organization_id NOT IN (SELECT id FROM "organizations" WHERE legal_hold_until > $2)`
const DONE_ORDERS = `SELECT id FROM "orders" WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < $1`
const ERASED_NAME = `'${ERASED_CUSTOMER_NAME}'`
const ERASED = `'${ERASED_MARKER}'`

const olderThan = (table: string): RetentionTarget => ({ table, key: "id", where: `created_at < $1 AND ${NOT_ON_HOLD}` })

/** Hội thoại không có tin nhắn nào từ mốc cắt trở lại đây. */
const STALE_CONVERSATIONS = `SELECT c.id FROM "chat_conversations" c WHERE c.updated_at < $1
  AND NOT EXISTS (SELECT 1 FROM "chat_messages" m WHERE m.conversation_id = c.id AND m.created_at >= $1)`

/** Khách không có hoạt động nào từ mốc cắt: đơn, lead, phiên Thẻ chào, báo giá, hội thoại, tương tác. */
const INACTIVE_CUSTOMER = `created_at < $1 AND updated_at < $1
  AND NOT EXISTS (SELECT 1 FROM "orders" o WHERE o.customer_id = customers.id AND (o.created_at >= $1 OR o.updated_at >= $1))
  AND NOT EXISTS (SELECT 1 FROM "leads" l WHERE l.customer_id = customers.id AND l.updated_at >= $1)
  AND NOT EXISTS (SELECT 1 FROM "greeting_sessions" g WHERE g.customer_id = customers.id AND g.last_active_at >= $1)
  AND NOT EXISTS (SELECT 1 FROM "quotations" q WHERE q.customer_id = customers.id AND q.updated_at >= $1)
  AND NOT EXISTS (SELECT 1 FROM "chat_conversations" h WHERE h.customer_id = customers.id AND h.updated_at >= $1)
  AND NOT EXISTS (SELECT 1 FROM "customer_interactions" i WHERE i.customer_id = customers.id AND i.occurred_at >= $1)`

export const RETENTION_TARGETS: Record<RetentionCategory, readonly RetentionTarget[]> = {
  technical_logs: [olderThan("job_events"), olderThan("notification_inbox"), olderThan("link_events"), olderThan("greeting_catalog_events")],
  audit_logs: [
    olderThan("audit_logs"),
    olderThan("platform_access_logs"),
    {
      table: "platform_audit_logs",
      key: "id",
      // Không có `organization_id`: giữ nhật ký nền tảng về một tổ chức đang legal hold.
      where: `created_at < $1 AND NOT (entity_type = 'organizations' AND entity_id IN (SELECT id FROM "organizations" WHERE legal_hold_until > $2))`,
    },
  ],
  delivery_info: [
    {
      table: "order_recipients",
      key: "order_id",
      where: `(recipient_name IS NOT NULL OR recipient_phone IS NOT NULL OR address_line IS NOT NULL OR address_parts IS NOT NULL)
        AND ${NOT_ON_HOLD} AND order_id IN (${DONE_ORDERS})`,
      // Giữ thông tin hoá đơn VAT (chứng từ ghi sổ, hạn 10 năm).
      set: `recipient_name = NULL, recipient_phone = NULL, address_line = NULL, address_parts = NULL`,
    },
    {
      table: "orders",
      key: "id",
      where: `delivery_address IS NOT NULL AND ${NOT_ON_HOLD} AND id IN (${DONE_ORDERS})`,
      set: `delivery_address = NULL`,
    },
  ],
  customer_conversations: [
    // Hội thoại: nội dung là văn bản tự do nên xoá tin nhắn, giữ dòng hội thoại và bỏ liên kết tới khách (PO 12/11/2026).
    { table: "chat_messages", key: "id", where: `${NOT_ON_HOLD} AND conversation_id IN (${STALE_CONVERSATIONS})` },
    { table: "chat_conversations", key: "id", where: `customer_id IS NOT NULL AND ${NOT_ON_HOLD} AND id IN (${STALE_CONVERSATIONS})`, set: `customer_id = NULL` },
    {
      table: "leads",
      key: "id",
      where: `status <> 'WON' AND converted_order_id IS NULL AND updated_at < $1 AND name <> ${ERASED_NAME} AND ${NOT_ON_HOLD}`,
      set: `name = ${ERASED_NAME}, phone = ${ERASED}, phone_hash = NULL, phone_last4 = NULL, message = NULL`,
    },
    {
      table: "greeting_sessions",
      key: "id",
      where: `status NOT IN ('ORDER_SUBMITTED', 'PAYMENT_REPORTED', 'COMPLETED') AND order_id IS NULL AND last_active_at < $1
        AND (customer_name IS NOT NULL OR customer_phone IS NOT NULL OR customer_phone_hash IS NOT NULL OR customer_phone_last4 IS NOT NULL)
        AND ${NOT_ON_HOLD}`,
      set: `customer_name = NULL, customer_phone = NULL, customer_phone_hash = NULL, customer_phone_last4 = NULL`,
    },
  ],
  customer_profiles: [
    // Ngày kỷ niệm gắn tên người nhận — xoá cùng lúc hồ sơ khách được ẩn danh.
    { table: "customer_occasions", key: "id", where: `${NOT_ON_HOLD} AND customer_id IN (SELECT id FROM "customers" WHERE ${INACTIVE_CUSTOMER})` },
    {
      // Kể cả khách có đơn đã thu (PO 12/11/2026): đơn, phiếu thu, hoá đơn VAT giữ nguyên; chỉ hồ sơ liên hệ bị xoá.
      table: "customers",
      key: "id",
      where: `name <> ${ERASED_NAME} AND ${NOT_ON_HOLD} AND ${INACTIVE_CUSTOMER}`,
      set: `name = ${ERASED_NAME}, phone = ${ERASED}, phone_hash = NULL, phone_last4 = NULL, email = NULL, address = NULL,
        notes = NULL, tags = '{}', preferred_flowers = '{}', preferred_colors = '{}'`,
    },
  ],
  non_ledger_documents: [
    { table: "quotations", key: "id", where: `updated_at < $1 AND ${NOT_ON_HOLD}` },
    {
      // Đơn huỷ chưa thu đồng nào: xoá cùng dòng con (dây chuyền); nhật ký đơn xoá được nhờ `purge_reason`.
      table: "orders",
      key: "id",
      where: `status = 'CANCELLED' AND paid_vnd = 0 AND updated_at < $1 AND ${NOT_ON_HOLD}
        AND NOT EXISTS (SELECT 1 FROM "order_payments" p WHERE p.order_id = orders.id)`,
    },
  ],
}
