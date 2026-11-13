/**
 * Tên gọi + mô tả mục đích của hai loại bộ sưu tập — một nguồn cho menu, thư viện công cụ,
 * hành trình và tiêu đề trang (PO 09/11/2026). Pure TypeScript.
 *
 * - Bộ sưu tập chung (`/catalog`): một link cho nhiều người.
 * - Bộ sưu tập riêng (`/the-chao`): gửi đích danh một khách / cho một nhu cầu cụ thể.
 */

export const PUBLIC_COLLECTION = {
  name: "Bộ sưu tập chung",
  mobileLabel: "BST chung",
  hint: "Một link dùng chung cho nhiều khách: đăng fanpage, website hoặc in mã QR. Khách xem mẫu rồi đặt hàng hoặc để lại liên hệ.",
} as const

export const PRIVATE_COLLECTION = {
  name: "Bộ sưu tập riêng",
  mobileLabel: "BST riêng",
  hint: "Link riêng gửi đích danh một khách hoặc cho một nhu cầu cụ thể. Khách chọn mẫu, đặt hàng, thanh toán và theo dõi đơn ngay trên link.",
} as const
