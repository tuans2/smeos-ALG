/**
 * ADR-014 D-P3 — phạm vi A (PO duyệt 07/11/2026): cột dữ liệu cá nhân của khách cuối được mã hoá. Từ P-5c chính cột này
 * chứa bản mã (`pii1.…`, cột Json chứa chuỗi bản mã); số điện thoại có thêm `*_hash` (khớp đúng số) và `*_last4` (ô tìm
 * kiếm). Tên khách không mã hoá. Thêm cột cá nhân mới ở các bảng này → thêm vào đây (test `pii-encryption.test.ts` kiểm
 * cột có trong lược đồ).
 */
export interface PiiFieldSpec {
  /** Cột bản sao bản mã của P-5a/P-5b — vẫn ghi cùng bản mã để quay lại bản trước được; bỏ ở bước dọn P-5d. */
  legacyEnc?: string
  hash?: string
  last4?: string
  /** Cột Json: mã hoá chuỗi JSON, lưu thành chuỗi JSON */
  json?: true
  /** Cột bắt buộc (không null) */
  required?: true
}

export const PII_FIELDS = {
  customers: {
    phone: { legacyEnc: "phone_enc", hash: "phone_hash", last4: "phone_last4", required: true },
    email: { legacyEnc: "email_enc" },
    address: { legacyEnc: "address_enc" },
    notes: { legacyEnc: "notes_enc" },
  },
  leads: {
    phone: { legacyEnc: "phone_enc", hash: "phone_hash", last4: "phone_last4", required: true },
    message: { legacyEnc: "message_enc" },
  },
  greeting_sessions: {
    customer_phone: { legacyEnc: "customer_phone_enc", hash: "customer_phone_hash", last4: "customer_phone_last4" },
  },
  order_recipients: {
    recipient_phone: { legacyEnc: "recipient_phone_enc" },
    address_line: { legacyEnc: "address_line_enc" },
    address_parts: { legacyEnc: "address_parts_enc", json: true },
    vat_company_name: { legacyEnc: "vat_company_name_enc" },
    vat_tax_code: { legacyEnc: "vat_tax_code_enc" },
    vat_company_address: { legacyEnc: "vat_company_address_enc" },
    vat_email: { legacyEnc: "vat_email_enc" },
  },
  order_coordinations: {
    shipper_phone: { legacyEnc: "shipper_phone_enc" },
    // P-5c (PO 07/11/2026): SĐT khách lẻ của đơn điều phối — trước ở `metadata.customerPhone`, nay ở cột riêng
    customer_phone: { hash: "customer_phone_hash" },
  },
} as const satisfies Record<string, Record<string, PiiFieldSpec>>

export type PiiModel = keyof typeof PII_FIELDS

/**
 * Khoá trong cột Json được tách ra cột cá nhân riêng: lệnh ghi `metadata.customerPhone` → cột `customer_phone` (bản mã);
 * lệnh đọc `metadata` → gộp lại `customerPhone` đã giải mã. Mã nghiệp vụ giữ nguyên cách đọc/ghi `metadata`.
 */
export const PII_JSON_KEYS: Partial<Record<PiiModel, { column: string; key: string; field: string }>> = {
  order_coordinations: { column: "metadata", key: "customerPhone", field: "customer_phone" },
}

/** Khoá chính của từng bảng (cho job mã hoá theo lô). */
export const PII_PRIMARY_KEY: Record<PiiModel, string> = {
  customers: "id", leads: "id", greeting_sessions: "id", order_recipients: "order_id", order_coordinations: "id",
}

export function isPiiModel(model: string): model is PiiModel {
  return Object.prototype.hasOwnProperty.call(PII_FIELDS, model)
}
