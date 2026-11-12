/**
 * Cẩm nang Cố vấn Chiến lược Cửa hàng Hoa (Senior Florist Advisor Catalog)
 * SSOT Dữ liệu Nghiệp vụ Thực tế Ngành Hoa — ALG Core
 */

export interface AdvisorOptionItem {
  id: string
  label: string
  description: string
  icon?: string
  category?: string
}

export interface AdvisorPresetPackage {
  id: string
  name: string
  tagline: string
  icon: string
  freeGifts: string[]
  guarantees: string[]
}

/**
 * 1. DANH MỤC ĐẶC QUYỀN & QUÀ TẶNG KÈM CHUẨN NGÀNH HOA (FREE GIFTS)
 */
export const FLORIST_FREE_GIFTS_CATALOG: AdvisorOptionItem[] = [
  {
    id: "gift-art-card",
    label: "Thiệp chúc mừng mỹ thuật độc bản",
    description: "Giấy mỹ thuật cao cấp ép kim hoặc viết tay bởi nghệ nhân, kèm phong bì cài sáp sang trọng",
    category: "aesthetic",
  },
  {
    id: "gift-silk-banner",
    label: "Banner lụa satin dập kim nhũ vàng",
    description: "Dải ruy băng lụa satin thiết kế riêng in thông điệp người gửi, gắn lên sản phẩm quà tặng",
    category: "aesthetic",
  },
  {
    id: "gift-chrysal-nutrition",
    label: "Gói dưỡng sản phẩm lâu Chrysal (Hà Lan)",
    description: "Tặng kèm 2 gói dưỡng hoa nhập khẩu + cẩm nang 3 bước thay nước để sản phẩm 5–7 ngày tại nhà",
    category: "care",
  },
  {
    id: "gift-premium-bag",
    label: "Túi giấy quai lụa bảo vệ sản phẩm chống va đập",
    description: "Túi cứng chuyên dụng chống nghiêng đổ khi khách di chuyển xe máy hoặc ô tô",
    category: "delivery",
  },
  {
    id: "gift-handwritten",
    label: "Nghệ nhân viết tay lời chúc theo yêu cầu",
    description: "Nét chữ nắn nót, giàu cảm xúc dành riêng cho những thông điệp cá nhân sâu sắc",
    category: "aesthetic",
  },
  {
    id: "gift-scented-candle",
    label: "Nến thơm tinh dầu hoa hồng thiên nhiên",
    description: "Món quà thư giãn tặng kèm cho các dịp kỷ niệm ngày cưới hoặc ngày lễ tình nhân",
    category: "upsell",
  },
  {
    id: "gift-artisan-chocolate",
    label: "Hộp chocolate thủ công cao cấp",
    description: "Món quà ngọt ngào đi cùng sản phẩm sinh nhật hoặc lời chúc mừng hạnh phúc",
    category: "upsell",
  },
]

/**
 * 2. DANH MỤC CAM KẾT CHẤT LƯỢNG & SỰ AN TÂM (SERVICE GUARANTEES & SLA)
 */
export const FLORIST_GUARANTEES_CATALOG: AdvisorOptionItem[] = [
  {
    id: "guar-photo-preview",
    label: "Gửi ảnh & video thành phẩm thực tế trước khi giao",
    description: "Chụp cận cảnh mặt hoa và tổng thể tác phẩm qua Zalo để người đặt duyệt trước khi xe lăn bánh",
    category: "trust",
  },
  {
    id: "guar-4h-replacement",
    label: "Đổi mới 100% trong 4 giờ nếu hoa dập nát, héo úa",
    description: "Bảo hiểm vận chuyển sản phẩm tận tay người nhận không phát sinh thêm bất kỳ chi phí nào",
    category: "trust",
  },
  {
    id: "guar-grade-a-flowers",
    label: "100% sản phẩm loại 1 nhập mới mỗi sáng",
    description: "Nhập mới từ trang trại Đà Lạt và quốc tế; nói không với hoa đông lạnh, hoa tẩy cánh",
    category: "quality",
  },
  {
    id: "guar-fidelity-standard",
    label: "Độ tương đồng thực tế đạt 90%–95% so với mẫu",
    description: "Đảm bảo chuẩn tone màu, form dáng cắm và giữ nguyên giá trị thẩm mỹ tác phẩm",
    category: "quality",
  },
  {
    id: "guar-on-time-delivery",
    label: "Giao hoa hỏa tốc đúng hẹn (sai lệch không quá 15 phút)",
    description: "Ưu tiên tuyệt đối giờ lành cho sự kiện khai trương, lễ cưới hoặc thời khắc sinh nhật",
    category: "delivery",
  },
  {
    id: "guar-blind-delivery",
    label: "Giao hoa bảo mật & tinh tế (Blind Delivery)",
    description: "Không dán giá tiền, giữ kín danh tính người tặng nếu có yêu cầu để tạo sự bất ngờ trọn vẹn",
    category: "service",
  },
  {
    id: "guar-vat-same-day",
    label: "Hỗ trợ xuất hóa đơn điện tử VAT trong ngày",
    description: "Cung cấp hóa đơn tài chính hợp lệ và chứng từ bàn giao cho khách hàng doanh nghiệp",
    category: "corporate",
  },
]

/**
 * 3. CÁC GÓI ĐỊNH HƯỚNG CHIẾN LƯỢC 1-CLICK (STRATEGY PRESETS)
 */
export const FLORIST_STRATEGY_PRESETS: AdvisorPresetPackage[] = [
  {
    id: "preset-artisan-boutique",
    name: "Cửa Hàng Nghệ Thuật / Thiết Kế",
    tagline: "Tập trung vào cảm xúc, sự tinh xảo và tính thẩm mỹ cao cấp",
    icon: "Palette",
    freeGifts: [
      "Thiệp chúc mừng mỹ thuật độc bản",
      "Gói dưỡng sản phẩm lâu Chrysal (Hà Lan)",
      "Túi giấy quai lụa bảo vệ sản phẩm chống va đập",
      "Banner lụa satin dập kim nhũ vàng",
    ],
    guarantees: [
      "Gửi ảnh & video thành phẩm thực tế trước khi giao",
      "100% sản phẩm loại 1 nhập mới mỗi sáng",
      "Độ tương đồng thực tế đạt 90%–95% so với mẫu",
      "Đổi mới 100% trong 4 giờ nếu hoa dập nát, héo úa",
    ],
  },
  {
    id: "preset-corporate-b2b",
    name: "Điện Hoa Doanh Nghiệp / Sự Kiện",
    tagline: "Tối ưu sự an tâm, tính chuyên nghiệp, đúng hẹn và hóa đơn nhanh",
    icon: "Building2",
    freeGifts: [
      "Banner lụa satin dập kim nhũ vàng",
      "Thiệp chúc mừng mỹ thuật độc bản",
    ],
    guarantees: [
      "Gửi ảnh & video thành phẩm thực tế trước khi giao",
      "Giao hoa hỏa tốc đúng hẹn (sai lệch không quá 15 phút)",
      "Hỗ trợ xuất hóa đơn điện tử VAT trong ngày",
      "Đổi mới 100% trong 4 giờ nếu hoa dập nát, héo úa",
    ],
  },
  {
    id: "preset-gift-occasions",
    name: "Cửa Hàng Quà Tặng & Dịp Lễ",
    tagline: "Kích thích trải nghiệm trọn vẹn, bất ngờ và quà tặng kèm ngọt ngào",
    icon: "Gift",
    freeGifts: [
      "Thiệp chúc mừng mỹ thuật độc bản",
      "Gói dưỡng sản phẩm lâu Chrysal (Hà Lan)",
      "Nến thơm tinh dầu hoa hồng thiên nhiên",
    ],
    guarantees: [
      "Gửi ảnh & video thành phẩm thực tế trước khi giao",
      "Giao hoa bảo mật & tinh tế (Blind Delivery)",
      "Đổi mới 100% trong 4 giờ nếu hoa dập nát, héo úa",
    ],
  },
]

/**
 * 4. TÔNG GIỌNG AI KÈM CÂU THOẠI MẪU MINH HỌA (TONE OF VOICE & EXAMPLES)
 */
export const FLORIST_TONE_OPTIONS = [
  {
    value: "romantic",
    label: "Thơ mộng & Lãng mạn (Hoa tình yêu, Valentine, 8/3)",
    tagline: "Nhẹ nhàng, sâu lắng, đậm chất thơ và ngôn ngữ loài hoa",
    exampleDialog: "Mỗi nhành hoa là một lời tâm tình giấu kín. Để tiệm giúp bạn gửi trao nhung nhớ dịu dàng này đến người thương nhé...",
  },
  {
    value: "luxury",
    label: "Sang trọng & Đẳng cấp (Hoa đối tác, sự kiện, khai trương)",
    tagline: "Chỉn chu, trang trọng, tôn vinh vị thế và sự thịnh vượng",
    exampleDialog: "Kính chúc Quý doanh nghiệp khai trương hồng phát, vạn sự hanh thông. Chúng tôi xin trân trọng giới thiệu tác phẩm hoa đại hội xứng tầm đối tác...",
  },
  {
    value: "warm",
    label: "Ấm áp & Chân thành (Hoa gia đình, sinh nhật người thân)",
    tagline: "Gần gũi, ấm áp, xuất phát từ lòng biết ơn và sự gắn kết",
    exampleDialog: "Tác phẩm này gói trọn lòng biết ơn sâu sắc đến người thân yêu nhất của bạn. Từng cánh hoa được chọn lọc tỉ mỉ như chính tình cảm gia đình...",
  },
  {
    value: "modern",
    label: "Trẻ trung & Năng động (Giới trẻ, tốt nghiệp, chúc mừng bạn bè)",
    tagline: "Tươi mới, hóm hỉnh, bắt nhịp xu hướng mạng xã hội",
    exampleDialog: "Một ngày rạng rỡ với sản phẩm phối màu pastel siêu xinh nè! Nhắn tin ngay cho tiệm để nhận ưu đãi thiết kế độc bản cho bạn nhé!",
  },
]

/**
 * 5. CÁC NHÓM TỪ CẤM KỴ AI PHÂN THEO LOẠI HÌNH
 */
export const FLORIST_FORBIDDEN_GROUPS = [
  {
    id: "group-low-price",
    title: "Nhóm từ hạ giá / Kém thẩm mỹ",
    description: "Tránh làm giảm giá trị tác phẩm hoa nghệ thuật",
    words: ["hoa rẻ", "xả hàng tồn", "phá giá", "giá bèo", "bán tống bán tháo"],
  },
  {
    id: "group-unprofessional",
    title: "Nhóm từ chợ / Kém sang trọng",
    description: "Tránh tạo cảm giác hoa cũ đại trà",
    words: ["hoa ế", "rẻ vô địch", "mặc cả", "giá sinh viên", "hàng dạt"],
  },
  {
    id: "group-negative",
    title: "Nhóm từ tiêu cực / Điềm gở",
    description: "Tránh từ ngữ mang ý nghĩa không may mắn trong ngày vui",
    words: ["héo úa", "buồn bã", "đắt đỏ", "chặt chém", "dập nát"],
  },
]
