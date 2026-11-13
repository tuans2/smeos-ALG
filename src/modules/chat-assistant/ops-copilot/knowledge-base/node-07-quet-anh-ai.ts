import type { OpsKnowledgeNode } from "./schema"

export const NODE_07_QUET_ANH_AI: OpsKnowledgeNode = {
  id: "node-07-quet-anh-ai",
  moduleIndex: 7,
  moduleTitle: "Chức năng 07: Quét Ảnh Hoa - Phân Tích AI",
  topicTitle: "Thị Giác Máy Tính Đếm Cành, Viết Bài Thương Mại & Kịch Bản Zalo",
  routePath: "/tai-anh",
  targetRoles: ["ALL", "QUAN_LY", "BAN_HANG", "THO_CAM"],
  keywords: [
    "quét ảnh", "phân tích hoa", "ai thị giác", "vision", "đếm cành", "nhận diện hoa",
    "bài viết bán hàng", "kịch bản zalo", "copy 1 chạm", "credit ai", "hạn mức ai",
    "tái sử dụng sản phẩm", "chốt đơn zalo"
  ],
  intents: ["quet_anh_hoa_ai", "dem_canh_tu_dong", "tao_kich_ban_zalo_1_cham", "tai_su_dung_mau_hoa_cu"],
  summary: "Trí tuệ nhân tạo phân tích ảnh chụp hoa thật qua 3 bước: Bước 1 (Nhận diện loài hoa và đếm cành) -> Bước 2 (Gợi ý tên hoa sang trọng và bài viết bán hàng) -> Bước 3 (Tự tạo tin nhắn Zalo chốt đơn 1 chạm).",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Tải ảnh hoa: Mở mục 'Quét ảnh hoa', chụp hoặc tải ảnh sản phẩm vừa cắm lên hệ thống",
      expectedResult: "Hệ thống tải ảnh lên và bắt đầu phân tích",
    },
    {
      stepNumber: 2,
      actionText: "Bước 1 - Đếm cành & Nhận diện: Xem bảng kết quả nhận diện loài hoa và số cành, có thể bấm vào số cành để sửa lại nếu cần rồi bấm duyệt",
      expectedResult: "Chuẩn hóa danh sách thành phần chính xác theo sản phẩm thật",
    },
    {
      stepNumber: 3,
      actionText: "Bước 2 - Viết bài bán hàng: Chuyển sang Bước 2 xem tên hoa sang trọng (ví dụ: 'Vũ Khúc Nắng Mai') và bài giới thiệu cảm xúc",
      expectedResult: "Có ngay bài viết hay để đăng bán lên Facebook hoặc Website",
    },
    {
      stepNumber: 4,
      actionText: "Bước 3 - Tin nhắn Zalo chốt đơn: Chuyển sang Bước 3, xem tin nhắn tư vấn đã có sẵn hotline và quà tặng rồi bấm 'Sao chép kịch bản Zalo'",
      expectedResult: "Sao chép tin nhắn vào máy để dán gửi ngay cho khách trên Zalo",
    },
    {
      stepNumber: 5,
      actionText: "Tái sử dụng sản phẩm cũ: Chọn mẫu trong danh sách các ảnh đã duyệt trước đây để sinh lại kịch bản bán hàng",
      expectedResult: "Lấy lại nội dung bán hàng nhanh chóng mà hoàn toàn không tốn lượt quét AI",
    },
  ],
  caveatsAndGotchas: [
    "Mẹo tiết kiệm lượt quét: Tận dụng tính năng chọn lại các sản phẩm đã phân tích trước đó khi khách hỏi lại mẫu cũ để không bị trừ lượt AI.",
    "Bạn có thể nhấp trực tiếp vào tên hoa hoặc số lượng cành ở Bước 1 để chỉnh sửa cho đúng thực tế trước khi bấm duyệt.",
  ],
  actionLabel: "Mở Màn Hình Phân Tích Ảnh Hoa",
  quickPrompts: [
    "Quy trình 3 bước quét ảnh hoa AI và tạo tin nhắn Zalo?",
    "Cách dùng lại sản phẩm cũ để không tốn lượt quét AI?",
  ],
}
