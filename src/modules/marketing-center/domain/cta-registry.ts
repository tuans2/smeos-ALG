/**
 * Sổ đăng ký lời kêu gọi hành động (CTA - Call To Action).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-2 (2.2).
 * Các mã CTA chuẩn:
 * - LEARN_MORE: Tìm hiểu thêm
 * - CONTACT: Liên hệ tư vấn
 * - REQUEST_INFO: Nhận thông tin chi tiết
 * - REQUEST_QUOTE: Yêu cầu báo giá
 * - ORDER: Đặt hàng ngay
 * - PAY: Thanh toán ngay
 * - REVIEW: Đánh giá dịch vụ
 * - REFER: Giới thiệu bạn bè
 */

export const CTA_CODES = [
  "LEARN_MORE",
  "CONTACT",
  "REQUEST_INFO",
  "REQUEST_QUOTE",
  "ORDER",
  "PAY",
  "REVIEW",
  "REFER",
] as const

export type CtaCode = (typeof CTA_CODES)[number]

export interface CtaDefinition {
  readonly code: CtaCode
  readonly label: string
  readonly description: string
  readonly defaultButtonText: string
}

export const CTA_REGISTRY: Readonly<Record<CtaCode, CtaDefinition>> = {
  LEARN_MORE: {
    code: "LEARN_MORE",
    label: "Tìm hiểu thêm",
    description: "Dẫn người xem đến trang giới thiệu, chi tiết bài viết hoặc bộ sưu tập.",
    defaultButtonText: "Tìm hiểu thêm",
  },
  CONTACT: {
    code: "CONTACT",
    label: "Liên hệ tư vấn",
    description: "Mở hộp thoại chat hoặc gọi hotline để được tư vấn viên hỗ trợ.",
    defaultButtonText: "Nhắn tin tư vấn",
  },
  REQUEST_INFO: {
    code: "REQUEST_INFO",
    label: "Nhận thông tin",
    description: "Khách để lại số điện thoại hoặc email để nhận cẩm nang / tài liệu.",
    defaultButtonText: "Nhận thông tin ngay",
  },
  REQUEST_QUOTE: {
    code: "REQUEST_QUOTE",
    label: "Yêu cầu báo giá",
    description: "Khách gửi danh mục cần mua để nhận bảng dự toán / báo giá chính xác.",
    defaultButtonText: "Yêu cầu báo giá",
  },
  ORDER: {
    code: "ORDER",
    label: "Đặt hàng ngay",
    description: "Chuyển khách đến giỏ hàng hoặc biểu mẫu đặt đơn trực tiếp.",
    defaultButtonText: "Đặt hàng ngay",
  },
  PAY: {
    code: "PAY",
    label: "Thanh toán ngay",
    description: "Dẫn khách đến trang chuyển khoản, quét mã QR hoặc cổng thanh toán.",
    defaultButtonText: "Thanh toán ngay",
  },
  REVIEW: {
    code: "REVIEW",
    label: "Đánh giá dịch vụ",
    description: "Mời khách hàng chấm điểm trải nghiệm hoặc gửi phản hồi sau khi nhận hàng.",
    defaultButtonText: "Gửi đánh giá",
  },
  REFER: {
    code: "REFER",
    label: "Giới thiệu bạn bè",
    description: "Khách chia sẻ mã ưu đãi hoặc liên kết nhận quà cho người quen.",
    defaultButtonText: "Chia sẻ nhận quà",
  },
}

export function getCtaDefinition(code: string): CtaDefinition | undefined {
  if (isCtaCode(code)) {
    return CTA_REGISTRY[code]
  }
  return undefined
}

export function isCtaCode(value: string): value is CtaCode {
  return (CTA_CODES as readonly string[]).includes(value)
}

export function listAllCtas(): readonly CtaDefinition[] {
  return CTA_CODES.map((code) => CTA_REGISTRY[code])
}
