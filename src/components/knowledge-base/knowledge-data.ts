/**
 * Cẩm Nang Nhập Liệu Chuẩn SSOT Cho Toàn Bộ Hệ Thống smeOS.
 * Định nghĩa chi tiết các trường dữ liệu nguyên tử (Atomic Disaggregated Fields)
 * giúp người dùng biết chính xác cần nhập những gì tại từng phân hệ.
 */

export interface AtomicFieldSpec {
  name: string
  dataType: "Text" | "Number" | "Select" | "Date" | "Image" | "Boolean" | "List"
  required: boolean
  description: string
  example: string
}

export interface ModuleKnowledgeSpec {
  id: string
  code: string
  title: string
  badgeLabel: string
  summary: string
  routePath: string
  actionButtonLabel: string
  atomicFields: AtomicFieldSpec[]
  goodPractice: string
  badPractice: string
  tips: string[]
  copilotPrompt: string
}

export const KNOWLEDGE_MODULES: ModuleKnowledgeSpec[] = [
  // 1. M01 — Phân tích ảnh hoa & BOM Cành hoa
  {
    id: "m01_vision",
    code: "M01",
    title: "Phân tích ảnh hoa & Bóc tách BOM nguyên tử",
    badgeLabel: "M01 VISION & BOM NGUYÊN TỬ",
    summary: "Nhận diện cấu trúc dáng hoa (bó/giỏ/kệ/bình), màu sắc chủ đạo và đếm chính xác số lượng từng cành hoa để tạo công thức cắm chuẩn.",
    routePath: "/tai-anh",
    actionButtonLabel: "Tải Ảnh & Đếm Cành Ngay",
    atomicFields: [
      { name: "Ảnh sản phẩm", dataType: "Image", required: true, description: "Ảnh chụp rõ nét góc 45° hoặc chính diện, ánh sáng ban ngày", example: "anh-bo-hoa-hong.jpg" },
      { name: "Tên hoa", dataType: "Text", required: true, description: "Tên loài hoa nguyên tử độc lập (không kèm số lượng)", example: "Hoa hồng đỏ Ohara" },
      { name: "Số lượng cành", dataType: "Number", required: true, description: "Số cành hoa đếm được (nhập số nguyên, không gộp chữ)", example: "12" },
      { name: "Đơn vị tính", dataType: "Select", required: true, description: "Đơn vị đo lường của nguyên liệu", example: "Cành / Bông / Nhánh" },
      { name: "Vai trò cành", dataType: "Select", required: true, description: "Phân loại vai trò trong tác phẩm", example: "Hoa chính / Hoa phụ / Lá đệm" },
      { name: "Màu sắc", dataType: "Text", required: true, description: "Tone màu sắc nhận diện", example: "Đỏ tươi / Pastel / Cam san hô" },
    ],
    goodPractice: "Tách biệt rõ: 'Hoa hồng đỏ' (Tên hoa) + '12' (Số cành) + 'Cành' (Đơn vị) để thợ cắm hoa lấy đúng số lượng.",
    badPractice: "Gộp chung chuỗi tự do: 'Hồng đỏ Ohara 12 cành kèm lá phụ' vào một ô duy nhất gây lỗi tính toán giá vốn.",
    tips: [
      "📸 Chụp góc 45 độ, nền trắng hoặc trung tính để AI đếm cành chính xác nhất",
      "⚡ Nhấp đúp vào bất kỳ ô nào trong bảng BOM để sửa lại số cành nếu cần",
      "🎯 Bấm 'Chốt duyệt' để tự động đồng bộ sang Product Master Index",
    ],
    copilotPrompt: "Hướng dẫn tôi cách chụp ảnh hoa và bóc tách BOM cành hoa chuẩn?",
  },

  // 2. M02 — Bảng giá & Thiết lập chi phí
  {
    id: "m02_pricing",
    code: "M02",
    title: "Thiết lập quy tắc định giá & Quản lý chi phí",
    badgeLabel: "M02 ĐỊNH GIÁ & BẢNG GIÁ",
    summary: "Cấu hình giá vốn cành hoa, chi phí vật tư đóng gói và tỷ lệ lãi gộp (markup) để hệ thống tự động tính giá bán đề xuất.",
    routePath: "/san-pham",
    actionButtonLabel: "Thiết Lập Bảng Giá M02",
    atomicFields: [
      { name: "Giá vốn cành hoa", dataType: "Number", required: true, description: "Chi phí nhập cành hoa từ chợ đầu mối/nhà vườn", example: "15,000 đ/cành" },
      { name: "Chi phí phụ kiện", dataType: "Number", required: true, description: "Giấy gói, nơ ruy băng, xốp cắm hoa, lẵng/bình sứ", example: "45,000 đ" },
      { name: "Tỷ lệ hao hụt (%)", dataType: "Number", required: true, description: "Hao hụt tự nhiên trong bảo quản (thường 5–10%)", example: "8%" },
      { name: "Markup / Lãi gộp (%)", dataType: "Number", required: true, description: "Hệ số lợi nhuận mục tiêu của cửa hàng (40–70%)", example: "50%" },
      { name: "Giá sàn (Min Price)", dataType: "Number", required: true, description: "Mức giá tối thiểu bảo vệ không bao giờ bán lỗ", example: "350,000 đ" },
      { name: "Giá niêm yết", dataType: "Number", required: true, description: "Giá bán công khai đến tay người tiêu dùng", example: "450,000 đ" },
    ],
    goodPractice: "Cài đặt đầy đủ Giá Sàn và Giá Trần để tránh nhân viên bán dưới giá vốn hoặc định giá phi thực tế.",
    badPractice: "Ước lượng vo giá bán mà không cộng chi phí phụ kiện và hao hụt cành dập úa.",
    tips: [
      "🛡️ Giá sàn (Floor Price) là chốt chặn cứng bảo vệ biên lợi nhuận của tiệm",
      "📊 Cập nhật giá nhập cành định kỳ để hệ thống tự điều chỉnh giá chào khách",
    ],
    copilotPrompt: "Giải thích công thức định giá và thiết lập giá sàn cho tiệm hoa?",
  },

  // 3. M04c — AI Video Studio 9:16
  {
    id: "m04c_video",
    code: "M04c",
    title: "AI Video Studio & Dựng Clip Dọc 9:16",
    badgeLabel: "M04c VIDEO MARKETING HOA TƯƠI",
    summary: "Sản xuất video hoa tươi chuyên nghiệp cho TikTok/Reels với hiệu ứng điện ảnh Ken Burns, giọng đọc Edge TTS và phụ đề tự động.",
    routePath: "/video",
    actionButtonLabel: "Dựng Video M04c Ngay",
    atomicFields: [
      { name: "Sản phẩm nguồn", dataType: "Select", required: true, description: "Chọn mẫu hoa đã duyệt từ Master Index", example: "Bó Hồng Ohara Quyến Rũ" },
      { name: "Định dạng video", dataType: "Select", required: true, description: "Tỷ lệ khung hình (Dọc 9:16, Vuông 1:1, Ngang 16:9)", example: "Dọc 9:16 (TikTok/Reels)" },
      { name: "Số lượng cảnh (Scenes)", dataType: "Number", required: true, description: "Số cảnh trong Storyboard (từ 2 đến 15 cảnh)", example: "4 cảnh" },
      { name: "Thời lượng cảnh", dataType: "Number", required: true, description: "Số giây mỗi cảnh (hệ thống tự cân bằng tổng thời lượng)", example: "3.5 giây" },
      { name: "Chuyển động Camera", dataType: "Select", required: true, description: "Hiệu ứng Ken Burns cho từng cảnh", example: "Zoom In / Pan Right / Static" },
      { name: "Giọng đọc thuyết minh", dataType: "Select", required: true, description: "Giọng thuyết minh AI tự động ducking nhạc nền", example: "Hoài My (Nữ miền Nam)" },
    ],
    goodPractice: "Sử dụng từ 3–5 cảnh với chuyển động Ken Burns đan xen (Zoom In -> Pan Right -> Zoom Out) để video sinh động.",
    badPractice: "Dùng 1 cảnh tĩnh duy nhất quá 8 giây khiến người xem TikTok dễ lướt qua.",
    tips: [
      "⚡ Nút 'Tự động cân bằng thời lượng' giúp chia đều giây theo nhịp nhạc nền",
      "🎬 Xuất video chuẩn HD 1080p với 0 credit ở phương án Cinematic Engine",
    ],
    copilotPrompt: "Làm sao dựng video TikTok 9:16 đẹp với hiệu ứng Ken Burns?",
  },

  // 4. M06 — Catalog Điện Tử & Mã QR 500px
  {
    id: "m06_catalog",
    code: "M06",
    title: "E-Catalog Trực Tuyến & Xuất Mã QR 500px",
    badgeLabel: "M06 CATALOG & TRƯNG BÀY SỐ",
    summary: "Trưng bày bộ sưu tập hoa tươi trực tuyến trên đường link thương hiệu riêng và tạo mã QR sắc nét chuẩn in ấn 500px.",
    routePath: "/catalog",
    actionButtonLabel: "Quản Trị E-Catalog",
    atomicFields: [
      { name: "Tên thương hiệu tiệm", dataType: "Text", required: true, description: "Tên hiển thị trên banner menu hoa", example: "Flora Tiệm Hoa Nhiệt Đới" },
      { name: "Slug định danh", dataType: "Text", required: true, description: "Đường dẫn URL thân thiện không dấu", example: "flora-tiem-hoa" },
      { name: "Hotline Zalo tư vấn", dataType: "Text", required: true, description: "Số điện thoại nhận tin nhắn chốt đơn của khách", example: "0909123456" },
      { name: "Địa chỉ tiệm", dataType: "Text", required: true, description: "Địa chỉ chi nhánh để khách ghé mua trực tiếp", example: "123 Hai Bà Trưng, Q.1, TP.HCM" },
      { name: "Danh mục sản phẩm", dataType: "List", required: true, description: "Nhóm mẫu hoa theo dịp (Khai trương, Sinh nhật, Tình yêu)", example: "['Hoa Sinh Nhật', 'Hoa Cưới']" },
      { name: "Kích thước mã QR", dataType: "Number", required: true, description: "Độ phân giải mã QR xuất file để in", example: "500px (Sắc nét)" },
    ],
    goodPractice: "Tải file QR 500px dán lên quầy thu ngân và in thiệp cảm ơn gửi kèm mỗi bó hoa.",
    badPractice: "Chụp ảnh màn hình mã QR độ phân giải thấp gây khó quét trên camera điện thoại cũ.",
    tips: [
      "📱 Khách quét QR có thể xem ngay giá niêm yết và chat trực tiếp với AI trợ lý",
      "🔗 Sao chép đường link /c/[slug] để gắn vào tiểu sử Zalo / TikTok / Instagram",
    ],
    copilotPrompt: "Cách chia sẻ E-Catalog và xuất mã QR 500px cho cửa hàng?",
  },

  // 5. M08 — AI Chat Assistant & Tích Hợp Đa Kênh
  {
    id: "m08_chat",
    code: "M08",
    title: "AI Chat Assistant & Tích Hợp Đa Kênh Omnichannel",
    badgeLabel: "M08 TRỢ LÝ AI ĐA KÊNH",
    summary: "Tích hợp trợ lý tư vấn hoa 24/7 vào Facebook Messenger, Zalo OA và Website với tính năng 1-chạm chốt đơn sang M10.",
    routePath: "/hoi-thoai/kenh-tich-hop",
    actionButtonLabel: "Cấu Hình Kênh Chat M08",
    atomicFields: [
      { name: "Kênh tích hợp", dataType: "Select", required: true, description: "Nền tảng kết nối (Facebook, Zalo OA, Web Widget)", example: "Facebook Messenger" },
      { name: "Page ID / OA ID", dataType: "Text", required: true, description: "Mã định danh Fanpage hoặc Zalo OA chính thức", example: "109823746591023" },
      { name: "Access Token", dataType: "Text", required: true, description: "Khóa bảo mật API do Meta / VNG cấp", example: "EAAKx..." },
      { name: "Tên miền cho phép", dataType: "Text", required: false, description: "Domain được phép nhúng widget (đối với Website)", example: "tiemhoaflora.vn, shop.flora.com" },
      { name: "Màu chủ đạo Widget", dataType: "Text", required: false, description: "Mã màu Hex cho khung chat trên web", example: "#dc2626 (Đỏ Flora)" },
      { name: "Lời chào mở đầu", dataType: "Text", required: false, description: "Tin nhắn tự động gửi khi khách mở chat", example: "Dạ em chào anh/chị! Em là trợ lý hoa Flora..." },
    ],
    goodPractice: "Điền đúng App Secret / OA Secret Key để xác thực Webhook hai chiều tức thì.",
    badPractice: "Để lộ Access Token công khai trên client thay vì lưu bảo mật trong cơ sở dữ liệu tenant.",
    tips: [
      "💬 AI tự bóc tách ngân sách khách đưa ra (vd: 500k, 1 triệu) để gợi ý mẫu hoa đúng túi tiền",
      "⚡ 1-chạm chốt đơn: Bấm nút 'Chốt đơn mẫu này' để đẩy đơn nháp sang Kanban M10",
      "💳 Biểu phí minh bạch: 0–70 credit/tháng cho kênh và 1 credit / 10 tin nhắn",
    ],
    copilotPrompt: "Hướng dẫn cấu hình kết nối AI Chat với Fanpage Facebook và Zalo OA?",
  },

  // 6. M09 — CRM & Quản Lý Khách Hàng
  {
    id: "m09_crm",
    code: "M09",
    title: "CRM Hồ Sơ Khách Hàng & Nhắc Hẹn Kỷ Niệm",
    badgeLabel: "M09 CRM & DỊP KỶ NIỆM",
    summary: "Quản lý dữ liệu khách hàng tập trung, tự động phân tầng RFM (VIP/Vàng/Bạc/Đồng) và quét ngày kỷ niệm trước 14 ngày.",
    routePath: "/khach-hang",
    actionButtonLabel: "Mở Quản Lý CRM Khách Hàng",
    atomicFields: [
      { name: "Họ và tên khách", dataType: "Text", required: true, description: "Tên xưng hô của khách hàng", example: "Nguyễn Văn An" },
      { name: "Số điện thoại", dataType: "Text", required: true, description: "Khóa định danh SSOT duy nhất của khách", example: "0912345678" },
      { name: "Ngày sinh nhật", dataType: "Date", required: false, description: "Ngày sinh của khách hàng", example: "1992-05-18" },
      { name: "Ngày kỷ niệm", dataType: "Date", required: false, description: "Ngày cưới, kỷ niệm ngày yêu, ngày của Mẹ...", example: "2024-10-20" },
      { name: "Loại dịp", dataType: "Select", required: false, description: "Phân loại dịp đặc biệt", example: "Sinh nhật / Kỷ niệm ngày cưới / Ngày 20-10" },
      { name: "Quyền tiếp thị (Consent)", dataType: "Boolean", required: true, description: "Khách đồng ý nhận tin nhắn ZNS/SMS nhắc hẹn", example: "true" },
    ],
    goodPractice: "Lưu ít nhất 1 ngày kỷ niệm (ngày cưới hoặc sinh nhật người yêu) để hệ thống tự động nhắc trước 14 ngày.",
    badPractice: "Gửi tin nhắn tiếp thị hàng loạt khi khách hàng chưa đồng ý (vi phạm chính sách Consent Engine).",
    tips: [
      "⚡ Bấm nút 'Quét dịp sắp tới (14 ngày)' để nhận danh sách khách cần gọi điện chăm sóc",
      "👑 Khách chi tiêu trên 10 triệu hoặc trên 10 đơn hàng được tự động nâng hạng VIP",
    ],
    copilotPrompt: "Cách nhập ngày kỷ niệm khách hàng và bật quyền riêng tư Consent?",
  },

  // 7. M10 — Đơn Hàng & Vận Hành In Ấn
  {
    id: "m10_order",
    code: "M10",
    title: "Đơn Hàng Vận Hành, Đo SLA & In Phiếu Xưởng/Giao Hàng",
    badgeLabel: "M10 ĐƠN HÀNG & IN PHIẾU A6",
    summary: "Quy trình Kanban 4 cột, Event Sourcing đối soát, đo lường SLA 180 phút và bóc tách phiếu xưởng ẩn giá bảo mật.",
    routePath: "/don-hang",
    actionButtonLabel: "Xem Bảng Kanban Đơn Hàng",
    atomicFields: [
      { name: "Người đặt hoa", dataType: "Select", required: true, description: "Chọn từ danh bạ CRM hoặc tạo nhanh qua SĐT", example: "Anh Tuấn (0912345678)" },
      { name: "Người nhận hoa", dataType: "Text", required: true, description: "Tên người trực tiếp nhận bó hoa", example: "Chị Lan" },
      { name: "SĐT người nhận", dataType: "Text", required: true, description: "Số điện thoại shipper gọi khi giao hàng", example: "0987654321" },
      { name: "Địa chỉ giao hoa", dataType: "Text", required: true, description: "Địa chỉ chi tiết bao gồm số nhà, tầng, toà nhà", example: "Tầng 12, Keangnam Landmark 72, Hà Nội" },
      { name: "Giờ hẹn giao (SLA)", dataType: "Date", required: true, description: "Thời điểm giao hoa mong muốn của khách", example: "14:30 18/09/2026" },
      { name: "Nội dung thiệp mừng", dataType: "Text", required: false, description: "Lời chúc in trên thiệp A6 đính kèm", example: "Chúc mừng sinh nhật em yêu! Mãi mãi rạng rỡ như hoa!" },
    ],
    goodPractice: "In 'Phiếu cắm hoa xưởng (ẩn 100% giá)' đưa thợ cắm hoa để tránh lộ chi phí và doanh thu tiệm.",
    badPractice: "Đưa hóa đơn có đầy đủ giá bán và giá vốn cho thợ xưởng hoặc tài xế giao hàng.",
    tips: [
      "📋 Bảng Kanban chuyển trạng thái 1-chạm: Chờ xử lý -> Cắm hoa -> Giao hàng -> Hoàn tất",
      "⏱️ Hệ thống tự động cảnh báo màu đỏ nếu đơn hàng vượt quá mục tiêu SLA 180 phút",
      "🖨️ Nút 'In phiếu A6' tự động định dạng chuẩn máy in nhiệt cầm tay hoặc máy in A6",
    ],
    copilotPrompt: "Quy trình in phiếu cắm hoa giấu giá và đo lường SLA đơn hàng?",
  },

  // 8. THẺ CHÀO — Thẻ Chào Mẫu Hoa & Link Đặt Hoa Trực Tuyến
  {
    id: "the_chao_mau_hoa",
    code: "THẺ CHÀO",
    title: "Bộ sưu tập riêng: bán hàng đa kênh & theo dõi tiến độ",
    badgeLabel: "QUY TRÌNH 9 BƯỚC",
    summary: "Quy trình gửi link bộ sưu tập cho khách lướt chọn mẫu hoa, tự động tạo đơn, thanh toán chuyển khoản VietQR, nghiệm thu ảnh 10 phút và theo dõi tiến độ.",
    routePath: "/the-chao",
    actionButtonLabel: "Mở Bộ sưu tập riêng",
    atomicFields: [
      { name: "Bộ sưu tập nguồn", dataType: "Select", required: true, description: "Bộ sưu tập mẫu hoa gửi khách", example: "Bộ sưu tập Hoa Sinh Nhật Mùa Thu" },
      { name: "Mã nhân viên phụ trách", dataType: "Text", required: true, description: "Mã nhân viên sale gửi link để ghi nhận hoa hồng", example: "NV-SALE-02" },
      { name: "Khung giờ giao hàng", dataType: "Select", required: true, description: "Khung giờ khách hẹn nhận hoa", example: "10:00 - 12:00" },
      { name: "Xác nhận tiền về", dataType: "Boolean", required: true, description: "Điều hành xác nhận tiền chuyển khoản về tài khoản", example: "Đã xác nhận" },
      { name: "Ảnh hoa thành phẩm", dataType: "Image", required: true, description: "Ảnh xưởng hoa chụp nghiệm thu trước khi giao", example: "anh-hoa-thanh-pham.jpg" },
      { name: "Ảnh người nhận hoa", dataType: "Image", required: true, description: "Ảnh shipper chụp bàn giao hoa tận tay cho người nhận", example: "anh-giao-hoa-thanh-cong.jpg" },
    ],
    goodPractice: "Kiểm tra biến động số dư ngân hàng và bấm 'Xác nhận tiền về' để kích hoạt nút theo dõi tiến độ cho khách.",
    badPractice: "Bàn giao hoa cho shipper khi chưa kiểm tra tiền về hoặc chưa tải ảnh nghiệm thu.",
    tips: [
      "🌸 Khách có đồng hồ đếm ngược 10 phút để duyệt ảnh thành phẩm trước khi giao",
      "⚡ Bấm vào thẻ đơn hàng trên Kanban để xem toàn bộ thông tin người nhận, lời chúc thiệp",
      "📜 Trích xuất Lịch sử đơn hàng để gửi bằng chứng đối soát minh bạch cho khách khi có tranh chấp",
    ],
    copilotPrompt: "Hướng dẫn toàn bộ quy trình Bộ sưu tập riêng cho Điều hành, Sale và Điều phối?",
  },
]
