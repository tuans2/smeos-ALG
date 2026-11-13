/**
 * Yêu cầu tư vấn từ trang khách (PO 22/10/2026, phương án a): khách bấm "Nhắn tin" ở mẫu
 * "Liên hệ" hoặc muốn phiên bản khác → tạo hồ sơ khách theo SĐT + một hội thoại
 * (`chat_conversations`, kênh STOREFRONT_CATALOG) cửa hàng xem ở màn Hội thoại.
 * Pure TypeScript.
 */

export const INQUIRY_NAME_MAX = 100
export const INQUIRY_MESSAGE_MAX = 500
export const VN_PHONE = /^(0|\+84)[35789][0-9]{8}$/

export interface ProductInquiryInput {
  customerName: string
  customerPhone: string
  message: string
  /** Phiên bản khách đang xem (nếu có), ví dụ "Lớn / Đỏ" */
  variantName?: string | undefined
}

export interface ProductRef {
  id: string
  code: string
  name: string
}

export function normalizeInquiryPhone(phone: string): string {
  return phone.replace(/[\s.-]+/g, "")
}

/** Lỗi theo trường (tiếng Việt); rỗng = hợp lệ. */
export function validateProductInquiry(input: ProductInquiryInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = input.customerName.trim()
  if (!name) errors.customerName = "Vui lòng nhập tên của bạn"
  else if (name.length > INQUIRY_NAME_MAX) errors.customerName = `Tên tối đa ${INQUIRY_NAME_MAX} ký tự`
  if (!VN_PHONE.test(normalizeInquiryPhone(input.customerPhone))) errors.customerPhone = "Số điện thoại di động chưa đúng"
  const msg = input.message.trim()
  if (!msg) errors.message = "Vui lòng nhập nội dung cần tư vấn"
  else if (msg.length > INQUIRY_MESSAGE_MAX) errors.message = `Nội dung tối đa ${INQUIRY_MESSAGE_MAX} ký tự`
  return errors
}

export function inquiryTitle(product: ProductRef): string {
  return `Yêu cầu tư vấn · ${product.name} (${product.code})`.slice(0, 200)
}

/** Nội dung tin đầu tiên trong hội thoại — cửa hàng đọc là biết khách hỏi mẫu nào. */
export function inquiryContent(product: ProductRef, input: ProductInquiryInput): string {
  const lines = [`Mẫu: ${product.name} (${product.code})`]
  const variant = input.variantName?.trim()
  if (variant) lines.push(`Phiên bản: ${variant.slice(0, 120)}`)
  lines.push(`Khách: ${input.customerName.trim()} · ${normalizeInquiryPhone(input.customerPhone)}`)
  lines.push("", input.message.trim())
  return lines.join("\n")
}

/** Gợi ý tin nhắn soạn sẵn cho khách. */
export function defaultInquiryMessage(productName: string, variantName?: string | null): string {
  return variantName
    ? `Cho mình hỏi giá và tư vấn mẫu ${productName} (${variantName}) ạ.`
    : `Cho mình hỏi giá và tư vấn mẫu ${productName} ạ.`
}
