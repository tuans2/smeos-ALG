import type { OpsKnowledgeNode } from "./schema"

export const NODE_08_KHO_DU_LIEU: OpsKnowledgeNode = {
  id: "node-08-kho-du-lieu",
  moduleIndex: 8,
  moduleTitle: "Chức năng 08: Kho Dữ Liệu Sản Phẩm",
  topicTitle: "Tài Sản Số Đám Mây & 4 Phân Vùng Lưu Trữ AccountStorageHub",
  routePath: "/kho-du-lieu",
  targetRoles: ["ALL", "QUAN_LY", "BAN_HANG"],
  keywords: [
    "kho dữ liệu", "lưu trữ", "tài nguyên", "ảnh gốc", "raw", "ảnh đã duyệt",
    "approved", "kịch bản hoàn thành", "finalized", "thùng rác", "trash",
    "xóa tạm 30 ngày", "khôi phục ảnh", "xóa vĩnh viễn"
  ],
  intents: ["quan_ly_kho_du_lieu", "tim_kiem_anh_cu", "khoi_phuc_thung_rac", "xoa_vinh_vien_tai_nguyen"],
  summary: "Kho lưu trữ ảnh và bài viết của tiệm trên đám mây với 4 khu vực: Ảnh gốc chưa xử lý, Ảnh đã có công thức chế tác, Bài viết Zalo hoàn chỉnh, và Thùng rác lưu tạm 30 ngày.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Mở mục 'Kho dữ liệu' ở menu bên trái, gõ từ khóa vào ô tìm kiếm để tra cứu ảnh hoa cũ",
      expectedResult: "Màn hình mở kho lưu trữ tư liệu của tiệm",
    },
    {
      stepNumber: 2,
      actionText: "Khu vực Ảnh Gốc: Xem các ảnh chụp hoa thô chưa qua phân tích, bấm 'Đưa vào phân tích AI' để quét hoa",
      expectedResult: "Chuyển ảnh sang màn hình quét hoa và đếm cành",
    },
    {
      stepNumber: 3,
      actionText: "Khu vực Ảnh Đã Duyệt: Xem các sản phẩm đã có công thức chế tác chuẩn, bấm 'Tạo kịch bản bán hàng' để viết bài",
      expectedResult: "Tạo ngay bài viết bán hàng mà không cần tải lại ảnh",
    },
    {
      stepNumber: 4,
      actionText: "Khu vực Kịch Bản Hoàn Thành: Lưu trữ các bài viết và tin nhắn Zalo đã soạn, bấm 'Sao chép kịch bản Zalo' để gửi cho khách",
      expectedResult: "Dán ngay vào đoạn chat Zalo tư vấn khách hàng trong 3 giây",
    },
    {
      stepNumber: 5,
      actionText: "Khu vực Thùng Rác: Dành cho Quản lý khôi phục lại ảnh lỡ xóa nhầm hoặc dọn dẹp bộ nhớ",
      expectedResult: "Ảnh xóa tạm được giữ an toàn 30 ngày trước khi tự động dọn sạch",
    },
  ],
  caveatsAndGotchas: [
    "Nhân viên khi xóa ảnh chỉ chuyển vào Thùng rác tạm 30 ngày để tránh xóa mất tư liệu của tiệm.",
    "Chỉ tài khoản Quản lý cửa hàng hoặc Chủ tiệm mới có quyền xem Thùng rác và bấm 'Xóa vĩnh viễn'.",
  ],
  actionLabel: "Mở Kho Dữ Liệu Sản Phẩm",
  quickPrompts: [
    "Bốn khu vực lưu trữ trong Kho dữ liệu dùng làm gì?",
    "Cách lấy lại bài viết và tin nhắn Zalo cũ để gửi khách?",
  ],
}
