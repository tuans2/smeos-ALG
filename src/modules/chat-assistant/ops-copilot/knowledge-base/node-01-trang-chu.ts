import type { OpsKnowledgeNode } from "./schema"

export const NODE_01_TRANG_CHU: OpsKnowledgeNode = {
  id: "node-01-trang-chu",
  moduleIndex: 1,
  moduleTitle: "Chức năng 01: Trang Chủ",
  topicTitle: "Điều hướng Hành trình Tác vụ & Bàn Làm Việc Vận Hành",
  routePath: "/",
  targetRoles: ["ALL", "QUAN_LY", "BAN_HANG", "THO_CAM"],
  keywords: [
    "trang chủ", "dashboard", "bàn làm việc", "hành trình tác vụ", "choicegrid",
    "bạn muốn làm gì", "chế độ chuyên gia", "storegrowthcenter", "tồn đọng",
    "hạn mức ai", "credit ai", "thẻ công việc", "tìm tác vụ", "đòn bẩy tăng trưởng",
    "job lỗi", "kết quả chờ duyệt", "đơn nháp chưa chốt"
  ],
  intents: ["dieu_huong_trang_chu", "chuyen_che_do_chuyen_gia", "kiem_tra_ton_dong", "xu_ly_viec_can_can_thiep"],
  summary: "Trang chủ là trung tâm điều hướng của cửa hàng với 2 chế độ: Chế độ tác vụ nhanh giúp nhân viên chọn việc cần làm đầu ngày, và Chế độ Chuyên gia giúp Quản lý theo dõi việc tồn đọng và hạn mức AI.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Mở Trang chủ: Màn hình hiển thị câu hỏi 'BẠN MUỐN LÀM GÌ CHO CỬA HÀNG?' kèm các thẻ công việc gợi ý",
      expectedResult: "Nhân viên bấm bộ lọc hoặc gõ vào ô tìm kiếm để chọn việc cần làm",
    },
    {
      stepNumber: 2,
      actionText: "Bắt đầu làm việc: Bấm nút 'Bắt đầu ngay' trên thẻ 'Bộ sưu tập riêng' để tạo link gửi khách Zalo",
      expectedResult: "Hệ thống mở ngay màn hình tạo bộ sưu tập riêng gửi khách",
    },
    {
      stepNumber: 3,
      actionText: "Dành cho Quản lý: Bấm nút 'Chế độ chuyên gia' ở góc trên bên phải màn hình",
      expectedResult: "Mở bảng theo dõi việc tồn đọng, các đơn chưa chốt và hạn mức AI",
    },
    {
      stepNumber: 4,
      actionText: "Xử lý việc cần can thiệp: Bấm vào dòng 'Đơn nháp chưa chốt' hoặc 'Kết quả chờ duyệt'",
      expectedResult: "Hệ thống tự động chuyển đến đúng màn hình để xử lý ngay",
    },
    {
      stepNumber: 5,
      actionText: "Quay lại chế độ thường: Bấm 'Chuyển sang Chế độ hành trình tác vụ' trên thanh thông báo đầu trang",
      expectedResult: "Trở về giao diện các thẻ công việc đơn giản",
    },
  ],
  caveatsAndGotchas: [
    "Thẻ 'Bộ sưu tập riêng' đã sẵn sàng sử dụng; các thẻ tính năng nâng cao khác đang được mở dần theo lộ trình.",
    "Bảng theo dõi của Quản lý sẽ tự động báo động khi có đơn hàng sắp trễ giờ hẹn của khách.",
  ],
  actionLabel: "Về Trang Chủ Điều Hành",
  quickPrompts: [
    "Làm sao chuyển sang Chế độ Chuyên gia trên Trang chủ?",
    "Cách xem việc tồn đọng và hạn mức Credit AI?",
  ],
}
