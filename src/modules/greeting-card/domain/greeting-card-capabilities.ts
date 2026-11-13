/**
 * Mã năng lực gác từng nhóm thao tác Thẻ chào (catalog tại
 * `src/core/rbac/capability-catalog.ts`). Dùng lại mã sẵn có của nhóm Sản
 * phẩm / Đơn hàng thay vì đặt mã mới — Thẻ chào là kênh bán hàng tạo đơn.
 * Bản cũ không gác gì: mọi thành viên (kể cả vai chỉ xem) đều xác nhận
 * được thanh toán.
 */
export const GREETING_CARD_CAPABILITY = {
  /** Xem bộ sưu tập — L1 product.read */
  read: "L1",
  /** Tạo/sửa bộ sưu tập, sinh link gửi khách — R2 order.create */
  manage: "R2",
  /** Xem đơn + bảng theo dõi + nhắn nội bộ — R1 order.read */
  orderRead: "R1",
  /**
   * Xác nhận tiền chuyển khoản, báo giá, xử lý giao dịch ngân hàng — R11 (trần cứng Điều hành).
   * PO 08/10/2026: chỉ Điều hành (người giữ tài khoản) — thay quyết định 06/10 dùng R9.
   */
  paymentRecord: "R11",
  /** Phân công florist — R4 order.assign */
  assignFlorist: "R4",
  /** Chụp ảnh thành phẩm — R3 order.update */
  productionUpdate: "R3",
  /** Duyệt yêu cầu đổi thông tin đơn của khách — R3 order.update */
  orderUpdate: "R3",
  /** Giao ship, ảnh người nhận — R5 delivery.manage */
  deliveryManage: "R5",
  /** Huỷ đơn — R6 order.cancel (trần cứng điều hành) */
  orderCancel: "R6",
  /** Cấu hình tích hợp (khoá webhook ngân hàng, kênh thông báo) — F2 org.update */
  integrationManage: "F2",
  /** Hoàn tiền — R10 order.payment.refund (trần cứng điều hành) */
  paymentRefund: "R10",
} as const
