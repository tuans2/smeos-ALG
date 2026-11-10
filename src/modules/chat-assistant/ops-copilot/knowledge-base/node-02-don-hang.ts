import type { OpsKnowledgeNode } from "./schema"

export const NODE_02_DON_HANG: OpsKnowledgeNode = {
  id: "node-02-don-hang",
  moduleIndex: 2,
  moduleTitle: "Chức năng 02: Quản Lý Đơn Hàng & Kênh Chào Bán",
  topicTitle: "Bảng Kanban Đơn Hàng, Phiếu Xưởng Ẩn Giá & QC Ảnh Thành Phẩm",
  routePath: "/don-hang",
  targetRoles: ["ALL", "QUAN_LY", "BAN_HANG", "THO_CAM", "GIAO_HANG"],
  keywords: [
    "đơn hàng", "kanban", "tiến độ đơn", "phiếu chế tác", "phiếu xưởng", "thợ chế tác",
    "ẩn giá", "giấu giá", "phiếu giao", "in thiệp", "khổ A6", "sla", "đo sla",
    "xác nhận tiền về", "đối soát", "duyệt ảnh", "giao gấp", "in phiếu",
    "gửi ảnh cho khách", "gửi ảnh", "ảnh hoàn thành", "ảnh thành phẩm", "số lượng ảnh",
    "ảnh tp", "ảnh nhận", "bỏ qua ảnh", "nghiệm thu ảnh", "đếm ngược 10 phút",
    "tạo từ chat", "dán tin nhắn zalo", "tab 3", "duyệt tt thẻ chào",
    "xác nhận đã nhận tiền", "xuất excel"
  ],
  intents: [
    "in_phieu_xuong_an_gia", "in_phieu_giao_hang_a6", "quan_ly_kanban_sla",
    "xac_nhan_tien_ve", "gui_anh_thanh_pham_qc", "tao_don_tu_chat_zalo", "duyet_coc_vietqr_r11"
  ],
  summary: "Quản lý tiến độ đơn hàng và in ấn: Tạo đơn nhanh từ chat Zalo bằng AI, duyệt tiền cọc, in phiếu xưởng giấu giá cho thợ chế tác và quy định chụp ảnh hoa thành phẩm gửi khách duyệt.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Tạo đơn nhanh từ tin nhắn: Bấm nút 'Tạo từ chat' ở góc trên bên phải, dán đoạn chat chốt đơn của khách rồi bấm 'Tạo đơn'",
      expectedResult: "AI tự động điền Tên, SĐT, Địa chỉ giao, Giờ giao, Nội dung thiệp và Sản phẩm trong 5 giây",
    },
    {
      stepNumber: 2,
      actionText: "Duyệt tiền cọc VietQR: Mở mục 'Bộ sưu tập riêng' ở tab Điều hành, kiểm tra tài khoản ngân hàng báo có rồi bấm 'Xác nhận đã nhận tiền'",
      expectedResult: "Đơn chuyển sang trạng thái đã chốt và tự động nhảy sang cột 'Đang chế tác'",
    },
    {
      stepNumber: 3,
      actionText: "In phiếu xưởng ẩn giá: Nhấp vào đơn hàng trên bảng tiến độ, chọn tab 'Phiếu Thợ chế tác hoa' rồi bấm 'In phiếu A6'",
      expectedResult: "In phiếu có đủ số lượng thành phần và lời chúc thiệp, nhưng giấu hoàn toàn giá tiền để bảo mật",
    },
    {
      stepNumber: 4,
      actionText: "Chụp ảnh hoa thành phẩm: Chế tác xong, bấm 'Ảnh TP' trên đơn hàng để tải tối thiểu 1 ảnh hoa hoàn chỉnh gửi khách",
      expectedResult: "Khách nhận được ảnh trên link theo dõi kèm đếm ngược 10 phút để duyệt; đơn gấp có thể bấm 'Bỏ qua ảnh'",
    },
    {
      stepNumber: 5,
      actionText: "Giao hàng và chụp ảnh người nhận: Shipper giao hoa thành công chụp thêm 1 'Ảnh nhận' để hoàn tất đơn hàng",
      expectedResult: "Đơn chuyển sang cột 'Hoàn tất' và lưu bằng chứng giao hoa an toàn",
    },
  ],
  caveatsAndGotchas: [
    "Quy định số lượng ảnh: Bắt buộc tối thiểu 1 ảnh hoa thành phẩm trước khi giao, và 1 ảnh người nhận khi giao xong.",
    "Khách có 10 phút để duyệt ảnh hoa; sau 10 phút nếu khách không phản hồi thì hệ thống tự động xác nhận để shipper kịp giờ giao.",
    "Chỉ tài khoản Chủ tiệm hoặc Kế toán mới có quyền bấm nút 'Xác nhận đã nhận tiền' để duyệt cọc.",
  ],
  actionLabel: "Mở Bảng Quản Lý Đơn Hàng",
  quickPrompts: [
    "Có cần gửi ảnh cho khách khi hoàn thành và số lượng là bao nhiêu?",
    "Cách tạo đơn nhanh từ đoạn chat Zalo bằng AI?",
    "Cách in phiếu chế tác giấu giá cho thợ?",
  ],
}
