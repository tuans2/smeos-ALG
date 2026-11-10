/**
 * common.ts — Từ điển UI Tiếng Việt [Style: minimal]
 * Tự động cập nhật bởi scripts/apply-copywrite-style.ts
 */

export const commonVi = {
  "terms": {
    "shop": "Cửa hàng",
    "florist": "Thợ chế tác",
    "customer": "Khách hàng",
    "order": "Đơn hàng",
    "product": "Sản phẩm",
    "flowerRecipe": "Công thức thành phần",
    "sampleProduct": "Sản phẩm chuẩn",
    "greetingCard": "Thiệp chúc mừng",
    "brochure": "Bộ sưu tập riêng",
    "storage": "Kho dữ liệu",
    "settings": "Cài đặt hệ thống",
    "journey": "Hành trình tác nghiệp"
  },
  "actions": {
    "confirm": "Xác nhận",
    "save": "Lưu",
    "saveDraft": "Nháp",
    "cancel": "Hủy",
    "delete": "Xóa",
    "edit": "Sửa",
    "create": "Tạo",
    "add": "Thêm",
    "close": "Đóng",
    "back": "Quay lại",
    "next": "Tiếp tục",
    "approve": "Duyệt",
    "reject": "Từ chối",
    "exportFile": "Xuất dữ liệu",
    "importFile": "Nhập dữ liệu",
    "search": "Tìm kiếm...",
    "filter": "Bộ lọc",
    "refresh": "Làm mới",
    "viewDetails": "Xem chi tiết",
    "uploadImage": "Tải ảnh lên"
  },
  "status": {
    "all": "Tất cả",
    "draft": "Bản nháp",
    "pending": "Đang chờ duyệt",
    "approved": "Đã duyệt",
    "processing": "Đang thực hiện",
    "completed": "Hoàn tất",
    "failed": "Thất bại",
    "cancelled": "Đã hủy",
    "active": "Đang hoạt động",
    "inactive": "Tạm dừng"
  },
  "pagination": {
    "showing": "Hiển thị {from} - {to} trên tổng số {total}",
    "previous": "Trang trước",
    "next": "Trang sau",
    "rowsPerPage": "Số dòng mỗi trang"
  },
  "validation": {
    "required": "Trường này là bắt buộc",
    "invalidEmail": "Email không hợp lệ",
    "invalidPhone": "Số điện thoại không hợp lệ",
    "minCharacters": "Tối thiểu {min} ký tự",
    "uploadFailed": "Tải lên không thành công, vui lòng thử lại"
  },
  "apiErrors": {
    "VALIDATION_FAILED": "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
    "UNAUTHENTICATED": "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
    "CAPABILITY_DENIED": "Bạn không có quyền thực hiện hành động này.",
    "ENTITLEMENT_REQUIRED": "Tính năng yêu cầu nâng cấp gói dịch vụ.",
    "NOT_FOUND": "Không tìm thấy dữ liệu yêu cầu hoặc đã bị xóa.",
    "CONFLICT": "Dữ liệu bị trùng lặp hoặc xung đột với trạng thái hiện tại.",
    "QUOTA_EXCEEDED": "Đã sử dụng hết hạn mức cho phép. Vui lòng thử lại sau.",
    "UNPROCESSABLE_ENTITY": "Không thể xử lý dữ liệu do vi phạm quy tắc nghiệp vụ.",
    "RATE_LIMITED": "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ trong giây lát.",
    "INTERNAL": "Hệ thống đang bận. Vui lòng thử lại sau."
  }
} as const
