import type { OpsKnowledgeNode } from "./schema"

export const NODE_03_THE_CHAO: OpsKnowledgeNode = {
  id: "node-03-the-chao",
  moduleIndex: 3,
  moduleTitle: "Bộ sưu tập riêng",
  topicTitle: "Brochure Sản Phẩm Trực Tuyến & Cọc Tiền VietQR Tự Động",
  routePath: "/the-chao",
  targetRoles: ["ALL", "QUAN_LY", "BAN_HANG"],
  keywords: [
    "thẻ chào", "bộ sưu tập riêng", "tạo thẻ", "bộ sưu tập", "tạo bộ sưu tập", "thẻ bộ sưu tập", "bộ sưu tập mẫu",
    "thẻ", "thẻ mẫu", "thẻ chào mẫu", "thẻ chào sản phẩm", "brochure", "link chào", "link đặt hàng",
    "link bộ sưu tập", "gửi zalo", "vietqr", "cọc tiền", "đặt cọc", "phễu cọc", "gửi nhanh",
    "quản lý", "hộp việc", "gán thợ", "tạo link", "ảnh bill", "ảnh chuyển khoản",
    "tự duyệt", "tự huỷ", "hoàn tiền"
  ],
  intents: ["tao_link_the_chao", "gui_mau_hoa_zalo", "quan_ly_coc_vietqr", "chuyen_che_do_quan_ly_the_chao"],
  summary: "Kênh bán hàng di động giúp nhân viên tạo link xem hoa kèm mã VietQR gửi Zalo cho khách trong 30 giây. Khách tự chọn mẫu, ghi lời chúc thiệp và quét mã cọc tiền tự động.",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Vào mục 'Bộ sưu tập riêng': Mở ở menu bên trái, sau đó bấm nút 'Gửi nhanh' ở góc trên",
      expectedResult: "Màn hình mở giao diện tạo link di động gửi khách",
    },
    {
      stepNumber: 2,
      actionText: "Bước 1 - Chọn bộ sưu tập: Chọn dịp hoa (Sinh nhật, Khai trương...) và chọn các sản phẩm ưng ý",
      expectedResult: "Danh sách sản phẩm được thêm vào bộ sưu tập riêng gửi khách",
    },
    {
      stepNumber: 3,
      actionText: "Bước 2 - Lời chào & Tỷ lệ cọc: Nhập tên khách hàng, lời chúc của tiệm và chọn mức cọc 50% hoặc 100%",
      expectedResult: "Hệ thống tự động gắn hotline tiệm và mã VietQR nhận tiền",
    },
    {
      stepNumber: 4,
      actionText: "Bước 3 - Lấy link gửi Zalo: Bấm 'Tạo link', sau đó bấm 'Sao chép link' để dán vào Zalo gửi cho khách",
      expectedResult: "Khách mở link trên điện thoại để xem hoa, gõ thiệp và quét mã QR đặt cọc",
    },
    {
      stepNumber: 5,
      actionText: "Theo dõi đơn cọc: Bấm 'Quản lý' hoặc bấm biểu tượng 'Hộp việc' ở góc trên để xem thông báo khách vừa chuyển tiền",
      expectedResult: "Hệ thống tự động hiển thị đơn cọc mới để duyệt tiền và phân công thợ chế tác hoa",
    },
  ],
  caveatsAndGotchas: [
    "Tiệm cần cài đặt số tài khoản ngân hàng ở mục 'Hồ sơ' thì mã VietQR mới nhận được tiền cọc từ khách.",
    "Hộp việc tự động cập nhật mỗi 20 giây để báo ngay cho nhân viên khi khách chuyển khoản thành công.",
    "Lời chúc thiệp hoặc chữ in băng rôn do khách tự gõ sẽ chuyển thẳng vào phiếu xưởng, tránh thợ chế tác ghi sai chính tả.",
    "Khách phải tải ảnh chuyển khoản trước khi bấm 'Tôi đã chuyển khoản' (trừ khi tiệm tắt yêu cầu ảnh bill). Mặc định tiệm tự đối chiếu và bấm xác nhận — hệ thống không tự ghi nhận tiền.",
    "Chỉ khi tiệm bật 'Tự động duyệt thanh toán khi có ảnh chụp bill' ở Hồ sơ cửa hàng, hệ thống mới tự xác nhận sau số phút đã chọn, và chỉ với bill đúng tài khoản tiệm, đúng số tiền. Bill lệch hoặc không đọc được luôn chờ người duyệt.",
    "Mặc định shipper không thu tiền mặt: khách chuyển khoản phần còn lại, tiệm xác nhận tiền xong mới giao. Muốn shipper thu tiền mặt khi giao thì bật 'Cho phép shipper thu tiền mặt phần còn lại' ở Hồ sơ cửa hàng.",
    "Điều phối từ chối nhận đơn mà Điều hành chưa duyệt kịp hạn thì đơn tự huỷ và báo khách, nhưng tiền không tự chuyển: Hộp việc của Điều hành hiện 'Đơn tự huỷ — cần hoàn …đ cho khách'. Chuyển khoản hoàn xong thì bấm 'Đã hoàn tiền cho khách' để ghi sổ.",
  ],
  actionLabel: "Mở Bộ sưu tập riêng",
  quickPrompts: [
    "Cách tạo link Bộ sưu tập riêng gửi Zalo cho khách chọn hoa?",
    "Khách quét mã VietQR đặt cọc tự động như thế nào?",
    "Xem thông báo đơn cọc mới ở đâu?",
    "Đơn tự huỷ cần hoàn tiền thì xử lý thế nào?",
  ],
}
