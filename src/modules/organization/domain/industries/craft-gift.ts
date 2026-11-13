import type { IndustryPluginContract } from "../industry-plugin-contract"

export const CRAFT_GIFT_INDUSTRY: IndustryPluginContract = {
  identity: {
    key: "CRAFT_GIFT",
    name: "Quà tặng & Thủ công mỹ nghệ",
    description: "Đồ thủ công handmade, gốm sứ, trang sức, nến thơm, quà lưu niệm",
    iconName: "Gift",
  },
  terminology: {
    makerTitle: "Nghệ nhân / Thợ chế tác",
    makerAction: "Chế tác & Đóng gói",
    productRecipe: "Thành phần chế tác",
    sampleProduct: "Mẫu quà tặng chuẩn",
    rawMaterialItem: "Vật liệu thủ công",
    completedProductPhoto: "Ảnh quà tặng thành phẩm",
    printablesTitle: "Thiệp cảm ơn & Hướng dẫn bảo quản",
    catalogTitle: "Bộ sưu tập Quà tặng & Thủ công",
    createButtonLabel: "Thêm mẫu quà tặng",
    scanButtonLabel: "Quét ảnh quà tặng",
    defaultMeasurementUnits: ["cái", "set", "hộp", "bộ", "gam", "chiếc"],
    defaultComponentRoles: [
      { key: "PRIMARY", label: "Vật liệu cốt lõi", isRequired: true },
      { key: "DECOR", label: "Chi tiết trang trí", isRequired: false },
      { key: "SCENT", label: "Hương liệu / Màu sắc", isRequired: false },
      { key: "PACKAGING", label: "Hộp quà & Nơ đính", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
      { key: "CERAMICS", label: "Gốm sứ nghệ thuật & Chén dĩa", defaultUnit: "món" },
      { key: "SCENTED_CANDLE", label: "Nến thơm & Tinh dầu khuếch tán", defaultUnit: "hũ" },
      { key: "JEWELRY", label: "Trang sức bạc & Đá phong thủy", defaultUnit: "chiếc" },
      { key: "GIFT_BOX", label: "Hộp quà tặng doanh nghiệp & Cá nhân", defaultUnit: "hộp" },
      { key: "WOOD_CRAFT", label: "Đồ gỗ thủ công & Trang trí bàn", defaultUnit: "cái" },
      { key: "LEATHER", label: "Đồ da thủ công may tay", defaultUnit: "chiếc" },
    ],
    occasions: [
      { key: "CORPORATE_GIFT", label: "Quà tặng doanh nghiệp & Hội nghị", suggestedPromotion: "Miễn phí khắc laser logo theo yêu cầu" },
      { key: "TET_HOLIDAY", label: "Quà biếu Tết cổ truyền", suggestedPromotion: "Tặng kèm hộp quà đỏ cao cấp và thiệp viết tay" },
      { key: "HOUSEWARMING", label: "Tân gia & Khai trương nhà mới", suggestedPromotion: "Tặng tinh dầu thơm mini đính kèm" },
      { key: "LOVE_ANNIVERSARY", label: "Kỷ niệm tình yêu & Quà cưới", suggestedPromotion: "Hộp quà khắc tên đôi lứa độc bản" },
    ],
    priceRanges: [
      { label: "Dưới 200.000 ₫", min: 0, max: 200000 },
      { label: "200.000 – 600.000 ₫", min: 200000, max: 600000 },
      { label: "600.000 – 1.500.000 ₫", min: 600000, max: 1500000 },
      { label: "Trên 1.500.000 ₫", min: 1500000 },
    ],
    pricingPresets: {
      weekendIsPeak: false,
      variantDimensions: [
        { key: "SIZE", label: "Kích thước", values: ["Nhỏ", "Vừa", "Lớn"] },
        { key: "COLOR", label: "Màu", values: ["Tự nhiên", "Trắng", "Đen", "Đỏ", "Xanh", "Pastel"] },
        { key: "MATERIAL", label: "Chất liệu", values: ["Gỗ", "Gốm", "Vải", "Giấy", "Da", "Kim loại", "Len"] },
        { key: "PERSONALIZE", label: "Cá nhân hoá", values: ["Không khắc", "Khắc tên", "Khắc logo", "In ảnh"] },
        { key: "GIFT_BOX", label: "Hộp quà", values: ["Không hộp", "Hộp giấy", "Hộp gỗ", "Hộp cao cấp"] },
      ],
    },
  },
  bomSpec: {
    measurementUnits: ["cái", "set", "hộp", "bộ", "gam", "chiếc"],
    componentRoles: [
      { key: "PRIMARY", label: "Vật liệu cốt lõi", isRequired: true },
      { key: "DECOR", label: "Chi tiết trang trí", isRequired: false },
      { key: "SCENT", label: "Hương liệu / Màu sắc", isRequired: false },
      { key: "PACKAGING", label: "Hộp quà & Nơ đính", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "CARD",
        title: "Thẻ câu chuyện nghệ nhân & Lời cảm ơn",
        description: "Thẻ in ấn câu chuyện chế tác thủ công và gửi lời tri ân người nhận",
        defaultFrontTitle: "Tạo Tác Từ Đôi Bàn Tay Người Nghệ Nhân",
        defaultBackInstructions: [
          "Mỗi tác phẩm là độc bản, mang những đường vân mộc mạc tự nhiên",
          "Bảo quản nơi khô ráo, tránh va đập mạnh làm mẻ cạnh",
        ],
      },
      {
        type: "WARRANTY",
        title: "Phiếu chứng nhận nguồn gốc & Bảo hành",
        description: "Phiếu cam kết vật liệu tự nhiên an toàn và chính sách đổi mới khi lỗi",
        defaultFrontTitle: "Chứng Nhận Thủ Công Mỹ Nghệ Độc Bản",
        defaultBackInstructions: [
          "Hỗ trợ làm mới bề mặt và đánh bóng miễn phí trọn đời",
          "Đổi mới trong 7 ngày nếu nứt vỡ trong quá trình vận chuyển",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện độ tinh xảo bề mặt men gốm, vân gỗ tự nhiên, độ bóng da thuộc và tính cân đối bố cục hộp quà",
    studioBackgroundStyles: ["Không gian thiền trà tối giản Wabi-sabi", "Kệ gỗ mộc phong cách Bắc Âu", "Nền đá cẩm thạch sang trọng"],
    marketingToneExamples: [
      "Món quà gói trọn tâm huyết, gửi gắm thông điệp chân thành qua từng đường nét thủ công",
      "Vẻ đẹp độc bản không trùng lặp, tôn vinh nghệ thuật sống tinh tế",
    ],
    sampleProductNames: [
      "Bộ ấm chén gốm mộc tráng men ngọc bích",
      "Hũ nến thơm sáp đậu nành hương gỗ thông và vani",
      "Hộp quà tặng Trà hoa vàng & Mật ong hoa rừng",
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  craftFee: {
    feeLabel: "Phí gia công",
    defaultPercent: 45,
    minVnd: 80_000,
    maxVnd: 2_000_000,
    partnerPercent: 70,
    complexityLabels: { EASY: "Gói, ghép quà", MEDIUM: "Làm thủ công", HARD: "Thiết kế riêng" },
    laborByComplexityVnd: { EASY: 50_000, MEDIUM: 150_000, HARD: 400_000 },
    peakDays: [
      { monthDay: "02-14", label: "Lễ Tình nhân" },
      { monthDay: "11-20", label: "Nhà giáo Việt Nam" },
      { monthDay: "12-24", label: "Giáng sinh" },
    ],
  },
  costing: null,
}
