/**
 * Điều kiện Prisma "tổ chức đang hoạt động" cho truy vấn XUYÊN tổ chức của tác vụ nền (audit User Journey UJ-26,
 * PO 12/11/2026 UQ13): tổ chức tạm ngưng / đang rời nền tảng / đã đóng không đăng bài, không kéo đơn kênh bán, không
 * xử lý sự kiện tích hợp, không nhắc giao, không mở hoá đơn gói. Việc của tổ chức đó nằm nguyên trong hàng đợi và
 * chạy tiếp khi Admin mở lại. Gộp vào `where` của bảng có quan hệ `organization`.
 */
export const ACTIVE_ORGANIZATION_ONLY = { organization: { is: { lifecycle_status: "ACTIVE" as const } } }
