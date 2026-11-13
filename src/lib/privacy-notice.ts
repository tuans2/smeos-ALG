/**
 * Dòng thông báo xử lý dữ liệu cá nhân trên form đặt hoa (D13) — MẶC ĐỊNH TẮT.
 * Bật bằng `NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED=true` rồi deploy lại (biến
 * NEXT_PUBLIC_ được gắn lúc build). Tắt: khách không thấy dòng chữ, trang
 * chính sách trả 404.
 */
export function isPrivacyNoticeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED === "true"
}

export const PRIVACY_POLICY_PATH = "/chinh-sach-bao-mat"
