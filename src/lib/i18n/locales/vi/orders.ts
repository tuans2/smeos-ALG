/**
 * orders.ts — Từ điển UI Tiếng Việt [Style: minimal]
 * Tự động cập nhật bởi scripts/apply-copywrite-style.ts
 */

export const ordersVi = {
  "header": {
    "category": "Kinh doanh",
    "title": "Đơn hàng",
    "createOrder": "Tạo đơn",
    "createFromChat": "Tạo đơn từ tin nhắn",
    "refresh": "Làm mới",
    "home": "Trang chủ",
    "exportExcel": "Xuất file Excel"
  },
  "tabs": {
    "allOrders": "Tất cả đơn hàng",
    "brochureLinks": "Link đặt hoa",
    "paymentApproval": "Duyệt thanh toán"
  },
  "guidance": {
    "badge": "HƯỚNG DẪN XỬ LÝ ĐƠN HÀNG",
    "title": "Quy trình chế tác và giao hàng",
    "description": "Mỗi đơn hàng có phiếu chế tác cho thợ và phiếu giao hoa kèm mã QR để xác nhận giao thành công.",
    "tips": {
      "recipe": "Phiếu chế tác ghi rõ số lượng từng nguyên liệu, giấy gói và tông màu chuẩn",
      "qcPhoto": "Chụp ảnh thành phẩm gửi khách duyệt trước khi giao",
      "deliverySlip": "In phiếu giao hoa kèm thiệp và thông tin người nhận"
    }
  },
  "filters": {
    "searchPlaceholder": "Tìm theo mã đơn, người nhận hoặc số điện thoại…",
    "totalCount": "{count} đơn hàng",
    "mobile": {
      "all": "Tất cả",
      "new": "Mới tiếp nhận",
      "arranging": "Đang chế tác",
      "delivering": "Đang giao",
      "completed": "Hoàn tất"
    }
  },
  "columns": {
    "newOrders": "Mới tiếp nhận",
    "inProduction": "Đang chế tác",
    "outForDelivery": "Đang giao hàng",
    "delivered": "Đã giao thành công"
  },
  "card": {
    "code": "Mã đơn: {code}",
    "deadline": "Hạn giao: {time}",
    "recipient": "Người nhận: {name}",
    "phone": "Số điện thoại: {phone}",
    "address": "Địa chỉ: {address}",
    "printTicket": "In phiếu thợ",
    "printSlip": "In phiếu giao"
  },
  "modal": {
    "createTitle": "Tạo đơn hàng mới",
    "detailsTitle": "Chi tiết đơn hàng",
    "customerInfo": "Thông tin khách hàng & người nhận",
    "productInfo": "Sản phẩm & Công thức chế tác",
    "deliveryInfo": "Thời gian & Địa chỉ giao hoa",
    "notes": "Ghi chú nội bộ cho thợ"
  },
  "actions": {
    "viewDetails": "Xem chi tiết",
    "printA6": "In phiếu A6",
    "followInCoordinator": "Theo dõi ở Điều phối",
    "cancelOrder": "Hủy đơn hàng",
    "confirmCancel": "Xác nhận hủy đơn",
    "cancelReasonPlaceholder": "Nhập lý do hủy đơn (bắt buộc)...",
    "cancelWarning": "Hành động này sẽ hủy đơn hàng vĩnh viễn và ghi nhận vào lịch sử xử lý đơn.",
    "cancelTitle": "Xác nhận hủy đơn #{code}",
    "receiveProduction": "Nhận chế tác",
    "finishArranging": "Đã hoàn thành",
    "startDelivery": "Bắt đầu giao",
    "deliverySuccess": "Giao thành công",
    "walkInCustomer": "Khách lẻ",
    "pickupAtShop": "Nhận tại cửa hàng"
  },
  "empty": {
    "title": "Chưa có đơn hàng nào",
    "reason": "Chưa có đơn hàng nào ở trạng thái này hoặc không khớp với từ khóa tìm kiếm. Bạn có thể tạo đơn hàng mới ngay.",
    "action": "Tạo đơn mới"
  },
  "coordinator": {
    "title": "Điều phối đơn hàng",
    "statusBadge": "Đang vận hành",
    "subtitle": "Tháp điều phối đơn hàng · Kết nối đối tác gia công & Đơn đặt từ thẻ chào",
    "receiveNewOrder": "Tiếp nhận đơn mới",
    "tabs": {
      "tower": "Tháp điều phối đơn hàng",
      "brochure": "Đơn từ thẻ chào"
    }
  }
} as const
