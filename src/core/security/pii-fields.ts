/**
 * ADR-014 D-P3, bước P-5a — phạm vi A (PO duyệt 07/11/2026): cột dữ liệu cá nhân của khách cuối được mã hoá. Mỗi cột rõ →
 * cột bản mã `*_enc`; số điện thoại thêm `*_hash` (khớp đúng số) và `*_last4` (ô tìm kiếm). Tên khách không mã hoá.
 * Thêm cột cá nhân mới ở các bảng này → thêm vào đây (test `pii-encryption.test.ts` kiểm cột `_enc` có trong lược đồ).
 */
export interface PiiFieldSpec {
  enc: string
  hash?: string
  last4?: string
  /** Cột Json: mã hoá chuỗi JSON */
  json?: true
  /** Cột bắt buộc (không null) — job theo lô không lọc `not: null` */
  required?: true
}

export const PII_FIELDS = {
  customers: {
    phone: { enc: "phone_enc", hash: "phone_hash", last4: "phone_last4", required: true },
    email: { enc: "email_enc" },
    address: { enc: "address_enc" },
    notes: { enc: "notes_enc" },
  },
  leads: {
    phone: { enc: "phone_enc", hash: "phone_hash", last4: "phone_last4", required: true },
    message: { enc: "message_enc" },
  },
  greeting_sessions: {
    customer_phone: { enc: "customer_phone_enc", hash: "customer_phone_hash", last4: "customer_phone_last4" },
  },
  order_recipients: {
    recipient_phone: { enc: "recipient_phone_enc" },
    address_line: { enc: "address_line_enc" },
    address_parts: { enc: "address_parts_enc", json: true },
    vat_company_name: { enc: "vat_company_name_enc" },
    vat_tax_code: { enc: "vat_tax_code_enc" },
    vat_company_address: { enc: "vat_company_address_enc" },
    vat_email: { enc: "vat_email_enc" },
  },
  order_coordinations: {
    shipper_phone: { enc: "shipper_phone_enc" },
  },
} as const satisfies Record<string, Record<string, PiiFieldSpec>>

export type PiiModel = keyof typeof PII_FIELDS

/** Khoá chính của từng bảng (cho job mã hoá theo lô). */
export const PII_PRIMARY_KEY: Record<PiiModel, string> = {
  customers: "id", leads: "id", greeting_sessions: "id", order_recipients: "order_id", order_coordinations: "id",
}

export function isPiiModel(model: string): model is PiiModel {
  return Object.prototype.hasOwnProperty.call(PII_FIELDS, model)
}
