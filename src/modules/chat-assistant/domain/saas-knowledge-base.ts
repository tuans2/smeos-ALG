/**
 * ALG SaaS System Knowledge Base (Bộ Cẩm Nang Tri Thức Vận Hành SSOT).
 * Đóng gói toàn bộ tài liệu hướng dẫn và đặc tả các module vào từ điển tri thức.
 */

export interface SaasKnowledgeItem {
  id: string
  moduleCode: string
  title: string
  keywords: string[]
  summary: string
  steps: string[]
  routePath: string
  actionLabel: string
}

export const SAAS_KNOWLEDGE_BASE: SaasKnowledgeItem[] = [
  // 1. M10 — ĐƠN HÀNG VẬN HÀNH & IN PHIẾU
  {
    id: "m10_florist_ticket",
    moduleCode: "M10",
    title: "In phiếu chế tác xưởng (ẩn giá tiền)",
    keywords: ["phiếu chế tác", "thợ chế tác", "phiếu cắm hoa", "thợ cắm", "giấu giá", "ẩn giá", "phiếu xưởng", "florist ticket", "công thức định lượng BOM", "công thức hoa"],
    summary: "Hệ thống tự động trích xuất công thức định lượng BOM nguyên tử (BOM) và ảnh mẫu từ M01 sang phiếu xưởng, đồng thời ẩn 100% giá vốn và giá bán để bảo mật thông tin tài chính của cửa hàng.",
    steps: [
      "Vào mục 'Đơn hàng' trên thanh điều hướng bên trái",
      "Nhấp chọn đơn hàng cần in phiếu",
      "Chọn tab 'Lát cắt Thợ Chế Tác (Ẩn Giá)'",
      "Bấm nút 'In phiếu A6' ở góc dưới",
    ],
    routePath: "/don-hang",
    actionLabel: "Mở Bảng Đơn Hàng M10",
  },
  {
    id: "m10_delivery_receipt",
    moduleCode: "M10",
    title: "In phiếu giao vận và thiệp chúc mừng A6",
    keywords: ["giao hàng", "phiếu giao", "shipper", "in thiệp", "lời chúc", "khổ a6", "thu cod", "delivery slip"],
    summary: "Phiếu giao hàng chuẩn khổ A6 hiển thị tên người nhận, số điện thoại, địa chỉ chi tiết, nội dung thiệp chúc mừng và số tiền cần thu hộ COD.",
    steps: [
      "Vào mục 'Đơn hàng'",
      "Mở chi tiết đơn hàng",
      "Chọn tab 'Lát cắt Giao Hàng & Thiệp (A6)'",
      "Bấm nút 'In phiếu A6'",
    ],
    routePath: "/don-hang",
    actionLabel: "Mở Bảng Đơn Hàng M10",
  },
  {
    id: "m10_order_kanban",
    moduleCode: "M10",
    title: "Quản lý tiến độ đơn hàng và đo lường SLA",
    keywords: ["kanban", "tiến độ đơn", "đo sla", "thời gian xử lý", "trạng thái đơn", "quá hạn"],
    summary: "Bảng Kanban 4 cột (Chờ xử lý, Đang chế tác, Đang giao hàng, Hoàn tất) tự động bấm giờ đo SLA và cảnh báo màu đỏ nếu đơn bị chậm tiến độ mục tiêu (180 phút).",
    steps: [
      "Vào mục 'Đơn hàng'",
      "Nhấn các nút thao tác nhanh: 'Nhận chế tác' -> 'Đã chế tác xong' -> 'Bắt đầu giao' -> 'Giao thành công'",
      "Hệ thống ghi nhận chuỗi sự kiện Event Sourcing để đối soát",
    ],
    routePath: "/don-hang",
    actionLabel: "Xem Bảng Kanban Đơn Hàng",
  },

  // 2. M09 — CRM & QUẢN LÝ KHÁCH HÀNG
  {
    id: "m09_rfm_tiers",
    moduleCode: "M09",
    title: "Phân tầng khách hàng tự động (RFM Tiers)",
    keywords: ["phân hạng khách", "phân tầng", "khách vip", "vàng", "bạc", "đồng", "rfm", "tổng chi tiêu"],
    summary: "Hệ thống tự động tính toán tổng chi tiêu và số đơn hàng từ M10 để xếp hạng khách hàng: VIP (>= 10tr hoặc >= 10 đơn), Vàng (>= 5tr), Bạc (>= 2tr), Đồng (>= 500k), Mới (chưa phát sinh đơn).",
    steps: [
      "Vào mục 'Khách hàng' trên thanh điều hướng",
      "Sử dụng bộ lọc phân tầng (VIP, GOLD, SILVER, BRONZE, NEW)",
      "Bấm 'Hồ sơ Master' để xem chi tiết lịch sử mua sắm và giá trị trung bình đơn (AOV)",
    ],
    routePath: "/khach-hang",
    actionLabel: "Mở CRM Khách Hàng",
  },
  {
    id: "m09_occasions_reminder",
    moduleCode: "M09",
    title: "Quét và nhắc nhở ngày kỷ niệm của khách hàng",
    keywords: ["ngày kỷ niệm", "nhắc sinh nhật", "nhắc hẹn", "quét dịp", "ngày của mẹ", "kỷ niệm ngày cưới"],
    summary: "ALG tự động quét các ngày kỷ niệm diễn ra trong 14 ngày tới của khách hàng và đưa ra gợi ý sản phẩm, tone màu phù hợp nhất để nhân viên chủ động liên hệ tư vấn.",
    steps: [
      "Vào mục 'Khách hàng'",
      "Ở góc trên bên phải, bấm nút '⚡ Quét dịp sắp tới (14 ngày)'",
      "Xem danh sách khách hàng sắp có dịp để liên hệ tư vấn hoa",
      "Để thêm dịp mới: Mở hồ sơ khách -> Chọn tab 'Dịp kỷ niệm' -> Bấm '+ Thêm ngày kỷ niệm'",
    ],
    routePath: "/khach-hang",
    actionLabel: "Quét Dịp Kỷ Niệm Ngay",
  },
  {
    id: "m09_consent_privacy",
    moduleCode: "M09",
    title: "Bảo vệ quyền riêng tư và tiếp thị (Consent Engine)",
    keywords: ["quyền riêng tư", "consent", "đồng ý nhận tin", "chặn spam", "zalo zns", "sms brandname"],
    summary: "ALG tuân thủ chính sách bảo vệ người tiêu dùng, chỉ cho phép gửi tin nhắn Zalo ZNS hoặc SMS tiếp thị khi khách hàng đã được cấp phép (Granted Consent).",
    steps: [
      "Vào mục 'Khách hàng'",
      "Chọn khách hàng cần kiểm tra -> Chọn tab 'Quyền riêng tư (Consent)'",
      "Bật hoặc tắt quyền gửi tin qua Zalo ZNS, SMS, Cuộc gọi hoặc Khuyến mãi",
    ],
    routePath: "/khach-hang",
    actionLabel: "Xem Quản Lý Consent",
  },

  // 3. M01 / M01b — PHÂN TÍCH ẢNH & VISION
  {
    id: "m01_vision_analysis",
    moduleCode: "M01",
    title: "Nhận diện ảnh hoa và đếm cành nguyên tử (Vision AI)",
    keywords: ["nhận diện ảnh", "phân tích hoa", "đếm cành", "bom hoa", "vision", "tải ảnh hoa", "bóc tách hoa"],
    summary: "Vision AI tự động nhận diện dáng hoa (bó/giỏ/kệ/bình), tone màu sắc, phong cách và đếm chính xác số lượng từng thành phần (Hoa hồng, Baby, Cúc mâm xôi...) để tạo công thức chế tác.",
    steps: [
      "Vào mục 'Tải ảnh' trên thanh điều hướng",
      "Tải ảnh sản phẩm sản phẩm lên hệ thống",
      "AI tự động phân tích và đưa ra bảng thành phần BOM thành phần",
      "Bấm 'Chốt duyệt' để lưu vào Product Master Index",
    ],
    routePath: "/tai-anh",
    actionLabel: "Tải Ảnh Phân Tích Ngay",
  },

  // 4. M04c — AI VIDEO STUDIO
  {
    id: "m04c_video_studio",
    moduleCode: "M04c",
    title: "Dựng video marketing sản phẩm dọc 9:16 (Video Studio)",
    keywords: ["dựng video", "video marketing", "tiktok", "reels", "storyboard", "video 9:16", "ken burns"],
    summary: "Dựng video sản phẩm chuyên nghiệp cho TikTok/Reels với hiệu ứng chuyển cảnh điện ảnh Ken Burns, giọng đọc thuyết minh Edge TTS tự động ducking nhạc nền, hỗ trợ 6 khuôn định dạng.",
    steps: [
      "Vào mục 'Video Studio' trên thanh điều hướng",
      "Chọn sản phẩm và kịch bản Storyboard 2–15 cảnh",
      "Tùy chỉnh góc máy chuyển động (Zoom In/Out, Pan Left/Right)",
      "Chọn phong cách phụ đề và giọng đọc -> Bấm 'Xuất video HD'",
    ],
    routePath: "/video",
    actionLabel: "Mở AI Video Studio",
  },

  // 5. M05 / M06 — CATALOG & MÃ QR
  {
    id: "m06_qr_catalog",
    moduleCode: "M06",
    title: "Chia sẻ E-Catalog trực tuyến và tạo mã QR 500px",
    keywords: ["e-catalog", "mã qr", "chia sẻ catalog", "menu hoa", "link xem hoa", "landing page"],
    summary: "Tạo trang catalog sản phẩm trực tuyến theo tên thương hiệu của cửa hàng và xuất mã QR sắc nét chuẩn 500px để in để bàn hoặc gửi qua Zalo cho khách hàng tự chọn mẫu.",
    steps: [
      "Vào mục 'Catalog'",
      "Bấm nút 'Chia sẻ & Mã QR' ở góc trên",
      "Tải ảnh mã QR 500px hoặc sao chép đường link /c/[slug] gửi cho khách",
    ],
    routePath: "/catalog",
    actionLabel: "Mở Quản Trị Catalog",
  },

  // 6. M02 — BẢNG GIÁ & ĐỊNH GIÁ
  {
    id: "m02_pricing_rules",
    moduleCode: "M02",
    title: "Thiết lập quy tắc định giá và giá sàn/trần",
    keywords: ["cài đặt giá", "định giá", "giá sàn", "giá trần", "giá chào khách", "chiết khấu", "chi phí cành", "markup"],
    summary: "Thiết lập công thức tính giá bán dựa trên giá vốn thành phần, phụ kiện đóng gói và biên lợi nhuận mục tiêu của từng chi nhánh.",
    steps: [
      "Vào mục 'Sản phẩm' hoặc 'Bảng giá' trên thanh điều hướng",
      "Xem và chỉnh sửa các quy tắc giá bán niêm yết",
      "Bấm 'Lưu quy tắc giá' để áp dụng ngay vào Master Index",
    ],
    routePath: "/san-pham",
    actionLabel: "Mở Cài Đặt Bảng Giá",
  },

  // 7. M08 — TÍCH HỢP ĐA KÊNH & BIỂU PHÍ CHAT ASSISTANT
  {
    id: "m08_channel_integration",
    moduleCode: "M08",
    title: "Cấu hình AI Chat Đa Kênh (Facebook, Zalo, Web Widget)",
    keywords: ["tích hợp đa kênh", "kết nối facebook", "kết nối zalo", "nhúng website", "biểu phí chat", "credit", "page id", "oa id", "script nhúng"],
    summary: "Kết nối AI Chatbot vào Fanpage Messenger, Zalo OA và Website cửa hàng với biểu phí 0–70 credit/tháng và 1 credit/10 tin nhắn.",
    steps: [
      "Vào mục 'Chat Assistant' -> Chọn 'Tích Hợp Đa Kênh & Biểu Phí'",
      "Nhập Page ID / Zalo OA ID và Token tương ứng",
      "Với Website: Chọn màu chủ đạo, điền domain cho phép và sao chép mã script nhúng",
      "Bật công tắc kích hoạt kênh",
    ],
    routePath: "/hoi-thoai/kenh-tich-hop",
    actionLabel: "Cấu Hình Kênh Chat M08",
  },

  // 8. M03 — KHO SẢN PHẨM & BẢO MẬT LINK GOOGLE DRIVE
  {
    id: "m03_excel_drive_security",
    moduleCode: "M03",
    title: "Nhập sản phẩm từ Excel & Bảo mật link Google Drive",
    keywords: ["google drive", "link drive", "quyền riêng tư", "bảo mật link", "drive thumbnail", "nhập excel", "công khai", "người xem", "kho ảnh", "lộ link"],
    summary: "Hướng dẫn phân quyền thư mục Google Drive ở chế độ 'Người xem' (Viewer) cho kho ảnh sản phẩm, và giải pháp bảo mật tối đa bằng cách kéo thả folder ảnh trực tiếp từ máy tính lên ALG Native Storage có mã hóa HMAC.",
    steps: [
      "Trên Google Drive: Tạo riêng thư mục '[ALG] Kho Ảnh Mẫu', tuyệt đối không để chung với tài liệu tài chính hay hợp đồng",
      "Cài đặt chia sẻ: Chọn 'Bất kỳ ai có đường liên kết' -> Đặt vai trò 'Người xem' (Viewer) để chỉ cho xem ảnh mẫu bán hàng, không thể sửa hay xóa",
      "Để bảo mật tuyệt đối và hiển thị ảnh tức thì: Tại màn hình '/san-pham/nhap-hang-loat', kéo thả cả folder ảnh từ máy tính vào ô '2. Thư mục ảnh sản phẩm'",
      "Hệ thống ALG sẽ lưu ảnh vào Cloud Storage riêng của cửa hàng, bảo vệ bằng Signed URL có chữ ký HMAC tự hết hạn sau 24h",
    ],
    routePath: "/san-pham/nhap-hang-loat",
    actionLabel: "Mở Nhập Hàng Loạt & Ảnh",
  },

  // 9. TỔNG HỢP — CẨM NANG NHẬP LIỆU CHUẨN SSOT
  {
    id: "kb_input_guide",
    moduleCode: "KB",
    title: "Cẩm nang quy chuẩn nhập liệu dữ liệu SSOT 7 phân hệ",
    keywords: ["cần nhập gì", "hướng dẫn nhập liệu", "nhập thông tin gì", "nhập liệu", "chuẩn bị dữ liệu", "dữ liệu đầu vào", "tri thức", "cẩm nang"],
    summary: "Cẩm nang hướng dẫn chi tiết từng trường dữ liệu nguyên tử (Atomic Disaggregated Fields) cần nhập cho 7 phân hệ: M01 Vision, M02 Giá, M04 Video, M06 Catalog, M08 Chat, M09 CRM, M10 Đơn hàng.",
    steps: [
      "Vào mục 'Tri thức & Nhập liệu' trên thanh điều hướng bên trái",
      "Chọn phân hệ cần nhập liệu để xem bảng đặc tả các trường bắt buộc",
      "Xem ví dụ chuẩn vs sai lệch (Good vs Bad Practice)",
      "Bấm nút '👉 Đi đến nhập liệu ngay' để vào thẳng màn hình nhập liệu",
    ],
    routePath: "/tri-thuc",
    actionLabel: "Mở Cẩm Nang Nhập Liệu SSOT",
  },

  // 9. THẺ CHÀO MẪU HOA & LINK ĐẶT HOA (GREETING CARD & BROCHURE ORDER)
  {
    id: "the_chao_tong_quan",
    moduleCode: "THẺ CHÀO",
    title: "Quy trình sử dụng Bộ sưu tập riêng & link đặt hoa trực tuyến",
    keywords: ["thẻ chào", "bộ sưu tập riêng", "thẻ chào mẫu", "thẻ chào sản phẩm", "link đặt hoa", "link chào", "bộ sưu tập mẫu", "đặt hoa trực tuyến", "greeting card", "brochure"],
    summary: "Bộ sưu tập riêng cho phép gửi bộ sưu tập cho khách lướt chọn mẫu trên điện thoại, tự động tạo đơn, chuyển khoản VietQR và theo dõi tiến độ qua chu trình chuẩn 9 bước khép kín.",
    steps: [
      "Vào mục 'Bộ sưu tập riêng' (/the-chao) trên thanh điều hướng",
      "Chọn 'Gửi nhanh' hoặc vào tab 'Bộ sưu tập' chọn mẫu để tạo link gửi khách",
      "Khách mở link lướt chọn hoa, điền form và chuyển khoản VietQR",
      "Điều hành xác nhận tiền về để kích hoạt nút theo dõi cho khách và chuyển đơn sang xưởng",
      "Xưởng chế tác, chụp ảnh nghiệm thu (khách duyệt 10 phút) và bàn giao shipper",
      "Đơn hoàn tất hiển thị Màn hình Cảm ơn khách hàng với các nút xem lại đơn và đặt đơn mới",
    ],
    routePath: "/the-chao",
    actionLabel: "Mở Bộ sưu tập riêng",
  },
  {
    id: "the_chao_dieu_hanh",
    moduleCode: "THẺ CHÀO",
    title: "Bộ sưu tập riêng: Hướng dẫn nghiệp vụ cho Điều hành & Chủ cửa hàng",
    keywords: ["điều hành", "điều hành thẻ chào", "xác nhận tiền về", "duyệt thanh toán", "đối soát tranh chấp", "hoàn tiền thẻ chào", "hủy đơn thẻ chào", "bằng chứng đối soát"],
    summary: "Điều hành quản trị tài chính, đối soát app ngân hàng và bấm 'Xác nhận tiền về' để kích hoạt nút theo dõi tiến độ cho khách; phê duyệt đề xuất hủy/hoàn tiền; và tra cứu Lịch sử đơn hàng để trích xuất bằng chứng đối soát khi có tranh chấp.",
    steps: [
      "Vào mục 'Bộ sưu tập riêng' -> Chọn tab 'Điều hành'",
      "Kiểm tra số dư ngân hàng và bấm 'Xác nhận tiền về' cho các đơn đã thanh toán",
      "Xử lý các đề xuất Hủy đơn / Hoàn tiền từ Sale hoặc Điều phối",
      "Khi có khiếu nại: Click vào đơn hàng -> Chọn tab 'Lịch sử đơn hàng' -> Bấm 'Sao chép tóm tắt đối soát' để gửi chứng cứ qua Zalo cho khách",
    ],
    routePath: "/the-chao",
    actionLabel: "Mở tab Điều hành Bộ sưu tập riêng",
  },
  {
    id: "the_chao_sale",
    moduleCode: "THẺ CHÀO",
    title: "Bộ sưu tập riêng: Hướng dẫn cho Nhân viên Bán hàng (Sale)",
    keywords: ["sale", "bán hàng", "kanban sale", "sale thẻ chào", "khách của tôi", "mã nhân viên", "giờ giao hàng", "xem chi tiết đơn sale", "gỡ kẹt", "kanban khách hàng"],
    summary: "Sale tạo link chào gắn mã nhân viên phụ trách để ghi nhận hoa hồng; theo dõi khách trên bảng Kanban 9 bước đồng bộ; xem mốc giờ giao to rõ và nhấp thẻ đơn để xem toàn bộ thông tin khách điền.",
    steps: [
      "Vào mục 'Bộ sưu tập riêng' -> Chọn tab 'Bán hàng'",
      "Bấm 'Tạo link mới' để lấy link gửi khách qua Zalo/Facebook",
      "Theo dõi khách trên Kanban 9 bước; thẻ có mốc giờ giao to rõ sắp xếp theo thứ tự ưu tiên",
      "Click vào thẻ đơn hàng để mở cửa sổ xem thông tin người đặt, người nhận, lời chúc thiệp mừng",
      "Bấm nút 'Gọi' hoặc 'Zalo' trên thẻ để hỗ trợ khách bị kẹt (quá hạn chưa chuyển khoản/chưa điền form)",
    ],
    routePath: "/the-chao",
    actionLabel: "Mở tab Bán hàng Bộ sưu tập riêng",
  },
  {
    id: "the_chao_dieu_phoi",
    moduleCode: "THẺ CHÀO",
    title: "Bộ sưu tập riêng: Hướng dẫn cho Điều phối & Xưởng chế tác",
    keywords: ["điều phối", "điều phối thẻ chào", "xưởng hoa", "chế tác", "nghiệm thu ảnh", "đếm ngược 10 phút", "giao gấp", "bỏ qua ảnh", "ảnh thành phẩm", "kanban điều phối"],
    summary: "Điều phối theo dõi Kanban xưởng 6 cột công đoạn sắp xếp theo giờ hẹn giao sớm nhất; chụp ảnh hoa thành phẩm kích hoạt countdown 10 phút cho khách duyệt; xử lý giao gấp bỏ qua ảnh; và nghiệm thu ảnh người nhận.",
    steps: [
      "Vào mục 'Bộ sưu tập riêng' -> Chọn tab 'Điều phối'",
      "Theo dõi các đơn xếp theo giờ giao sớm nhất để phân công thợ chế tác cắm kịp tiến độ",
      "Click vào thẻ đơn để xem chi tiết ảnh mẫu, kích thước và lời chúc thiệp",
      "Bấm 'Ảnh TP' tải ảnh hoa thành phẩm lên hệ thống để khách duyệt trong 10 phút (tự động duyệt sau 10p)",
      "Nếu khách cần gấp: Bấm 'Bỏ qua ảnh' để chuyển thẳng sang giao shipper",
      "Bấm 'Giao Ship' và 'Ảnh nhận' để hoàn tất đơn và hiển thị Màn hình Cảm ơn cho khách",
    ],
    routePath: "/the-chao",
    actionLabel: "Mở tab Điều phối Bộ sưu tập riêng",
  },
]

/**
 * Nhận diện ý định câu hỏi:
 * - "SAAS_HELP": Câu hỏi về thao tác, cách dùng, in ấn, tính năng, quy trình ALG.
 * - "FLOWER_SALES": Câu hỏi về mua sản phẩm/hoa, giá sản phẩm, tìm theo dịp, ngân sách.
 */
export function detectUserIntent(query: string): "SAAS_HELP" | "FLOWER_SALES" {
  const lower = query.toLowerCase()

  const saasHelpKeywords = [
    "làm sao", "làm thế nào", "cách", "hướng dẫn", "chức năng", "tính năng",
    "thẻ chào", "bộ sưu tập riêng", "thẻ chào mẫu", "thẻ chào sản phẩm", "link đặt hoa", "link chào", "bộ sưu tập mẫu",
    "xác nhận tiền về", "tiền về", "đối soát", "bằng chứng", "duyệt ảnh", "đếm ngược", "giao gấp", "bỏ qua ảnh",
    "cần nhập gì", "hướng dẫn nhập liệu", "nhập thông tin gì", "nhập liệu", "chuẩn bị gì",
    "in phiếu", "phiếu xưởng", "phiếu a6", "phiếu giao", "ẩn giá", "giấu giá",
    "thợ chế tác", "shipper", "đo sla", "quá hạn", "kanban",
    "ngày kỷ niệm", "nhắc hẹn", "quét dịp", "consent", "quyền riêng tư",
    "phân tầng", "rfm", "hạng vip", "hạng vàng", "khách hàng",
    "dựng video", "video studio", "storyboard", "mã qr", "catalog",
    "đếm cành", "bóc tách", "tải ảnh", "cài đặt giá", "giá sàn", "chi phí",
    "google drive", "link drive", "bảo mật drive", "quyền riêng tư drive", "lộ link",
    "tích hợp đa kênh", "kết nối facebook", "kết nối zalo", "nhúng website", "biểu phí",
    "smeos", "floraos",
  ]

  const matchesSaas = saasHelpKeywords.some((kw) => lower.includes(kw))
  return matchesSaas ? "SAAS_HELP" : "FLOWER_SALES"
}

/**
 * Tra cứu tri thức vận hành hệ thống ALG dựa trên câu hỏi của người dùng
 */
export function querySaasKnowledge(query: string): SaasKnowledgeItem | null {
  const lower = query.toLowerCase()

  let bestMatch: SaasKnowledgeItem | null = null
  let maxScore = 0

  for (const item of SAAS_KNOWLEDGE_BASE) {
    let score = 0
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += 10
      }
    }
    if (lower.includes(item.title.toLowerCase())) {
      score += 25
    }
    if (score > maxScore) {
      maxScore = score
      bestMatch = item
    }
  }

  // Nếu điểm match >= 10, coi là tìm thấy câu trả lời chính xác
  return maxScore >= 10 ? bestMatch : null
}
