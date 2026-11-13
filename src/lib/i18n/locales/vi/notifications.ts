/**
 * notifications.ts — Từ điển microcopy thông báo, kiểm tra lỗi và xác nhận (11-thong-bao SSOT)
 */

export const notificationsVi = {
  toast: {
    saveSuccess: "Đã lưu thay đổi thành công.",
    copyLinkSuccess: "Đã sao chép link đặt hoa vào bộ nhớ tạm.",
    copyPitchSuccess: "Đã sao chép kịch bản tư vấn.",
    restoreSuccess: "Đã khôi phục sản phẩm về kho chính.",
    trashSuccess: "Đã chuyển sản phẩm vào thùng rác.",
    createOrderSuccess: "Đã tạo đơn hàng mới thành công.",
    refreshSuccess: "Đã làm mới dữ liệu.",
    networkError: "Mất kết nối mạng. Vui lòng kiểm tra đường truyền và thử lại.",
    serverError: "Chưa hoàn tất được thao tác do lỗi hệ thống. Vui lòng thử lại sau ít phút.",
    sessionExpired: "Phiên làm việc đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.",
  },
  validation: {
    required: "Vui lòng nhập thông tin này.",
    invalidPhone: "Số điện thoại không hợp lệ (cần đủ 10 chữ số).",
    priceGreaterThanZero: "Đơn giá phải lớn hơn 0 ₫.",
    duplicateCode: "Mã sản phẩm này đã tồn tại trong cửa hàng. Vui lòng chọn mã khác.",
    fileTooLarge: "Dung lượng file vượt quá giới hạn (tối đa 10 MB).",
    invalidFileType: "Định dạng file không được hỗ trợ. Vui lòng chọn file JPG, PNG hoặc WebP.",
    invalidDepositRate: "Vui lòng chọn tỷ lệ cọc 50% hoặc 100%.",
  },
  confirmModal: {
    moveToTrash: {
      title: "Chuyển “{name}” vào thùng rác?",
      description: "Sản phẩm sẽ bị ẩn khỏi danh sách bán và bộ sưu tập. Bạn có thể khôi phục trong Thùng rác trong vòng 30 ngày.",
      confirm: "Chuyển vào thùng rác",
      cancel: "Hủy",
    },
    permanentDelete: {
      title: "Xóa vĩnh viễn “{name}”?",
      description: "Mục này sẽ bị xóa hoàn toàn khỏi kho lưu trữ và không thể khôi phục lại được. Bạn có chắc chắn muốn xóa?",
      confirm: "Xóa vĩnh viễn",
      cancel: "Hủy",
    },
    lockMember: {
      title: "Khóa tài khoản của “{name}”?",
      description: "Thành viên này sẽ không thể đăng nhập vào hệ thống của cửa hàng cho đến khi bạn mở khóa lại.",
      confirm: "Khóa tài khoản",
      cancel: "Hủy",
    },
    cancelOrder: {
      title: "Hủy đơn hàng “{orderCode}”?",
      description: "Đơn hàng này sẽ chuyển sang trạng thái Đã hủy và dừng mọi tiến độ chế tác, giao vận.",
      confirm: "Xác nhận hủy đơn",
      cancel: "Đóng",
    },
  },
  aiProgress: {
    observingPhoto: "Đang quan sát hình ảnh sản phẩm…",
    detectingFlowers: "Đang nhận diện loài hoa và số lượng cành…",
    draftingPitch: "Đang soạn kịch bản tư vấn và thông điệp cảm xúc…",
    transparencyNote: "Nội dung do trợ lý AI gợi ý. Bạn có thể tùy chỉnh trực tiếp trước khi gửi khách.",
  },
} as const

export type NotificationsDictionary = typeof notificationsVi
