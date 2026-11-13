import type { IndustryPluginContract } from "../industry-plugin-contract"

export const FASHION_INDUSTRY: IndustryPluginContract = {
  identity: {
    key: "FASHION",
    name: "Thời trang & May mặc",
    description: "Tiệm may đo, shop thời trang thiết kế, phụ kiện và giày dép",
    iconName: "Shirt",
  },
  terminology: {
    makerTitle: "Thợ may / Kỹ thuật cắt",
    makerAction: "May đo & Lên mẫu",
    productRecipe: "Bảng định mức vải & phụ liệu",
    sampleProduct: "Mẫu thiết kế Lookbook",
    rawMaterialItem: "Vải / Phụ liệu",
    completedProductPhoto: "Ảnh sản phẩm hoàn thiện",
    printablesTitle: "Thẻ bài & Hướng dẫn giặt",
    catalogTitle: "Bộ sưu tập Lookbook",
    createButtonLabel: "Thêm mẫu thiết kế",
    scanButtonLabel: "Quét mẫu trang phục",
    defaultMeasurementUnits: ["cái", "bộ", "mét", "cuộn", "chiếc", "set"],
    defaultComponentRoles: [
      { key: "PRIMARY", label: "Vải chính", isRequired: true },
      { key: "SECONDARY", label: "Vải lót", isRequired: false },
      { key: "HARDWARE", label: "Khóa / Cúc / Phụ kiện kim loại", isRequired: false },
      { key: "ACCESSORY", label: "Nhãn mác / Bao bì", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
      { key: "DRESS", label: "Đầm & Váy thiết kế", defaultUnit: "chiếc" },
      { key: "SHIRT", label: "Áo sơ mi & Áo kiểu", defaultUnit: "cái" },
      { key: "SUIT_BLAZER", label: "Suit & Áo Blazer", defaultUnit: "bộ" },
      { key: "PANTS", label: "Quần âu & Chân váy", defaultUnit: "cái" },
      { key: "SET", label: "Set đồ phối sẵn", defaultUnit: "set" },
      { key: "ACCESSORIES", label: "Phụ kiện thời trang", defaultUnit: "món" },
    ],
    occasions: [
      { key: "NEW_COLLECTION", label: "Ra mắt Bộ sưu tập mới", suggestedPromotion: "Ưu đãi đặt may sớm 15%" },
      { key: "WEDDING_PARTY", label: "Dự tiệc & Mùa cưới", suggestedPromotion: "Miễn phí chỉnh sửa số đo theo dáng" },
      { key: "OFFICE_STYLE", label: "Thời trang công sở thanh lịch", suggestedPromotion: "Tặng phụ kiện cài áo sang trọng" },
      { key: "END_OF_SEASON", label: "Xả hàng cuối mùa", suggestedPromotion: "Giảm sâu tới 40% số lượng giới hạn" },
      { key: "BLACK_FRIDAY", label: "Lễ hội mua sắm Black Friday", suggestedPromotion: "Mua 2 tặng 1 phụ kiện" },
    ],
    priceRanges: [
      { label: "Dưới 500.000 ₫", min: 0, max: 500000 },
      { label: "500.000 – 1.500.000 ₫", min: 500000, max: 1500000 },
      { label: "1.500.000 – 3.000.000 ₫", min: 1500000, max: 3000000 },
      { label: "Trên 3.000.000 ₫", min: 3000000 },
    ],
    pricingPresets: {
      weekendIsPeak: false,
      variantDimensions: [
        { key: "SIZE", label: "Size", values: ["XS", "S", "M", "L", "XL", "XXL", "Freesize"] },
        { key: "COLOR", label: "Màu", values: ["Đen", "Trắng", "Be", "Xám", "Xanh navy", "Đỏ", "Hồng", "Nâu"] },
        { key: "MATERIAL", label: "Chất liệu", values: ["Cotton", "Lụa", "Linen", "Kaki", "Jean", "Len", "Da"] },
        { key: "FIT", label: "Kiểu dáng", values: ["Ôm", "Suông", "Rộng (oversize)"] },
      ],
    },
  },
  bomSpec: {
    measurementUnits: ["cái", "bộ", "mét", "cuộn", "chiếc", "set"],
    componentRoles: [
      { key: "PRIMARY", label: "Vải chính", isRequired: true },
      { key: "SECONDARY", label: "Vải lót", isRequired: false },
      { key: "HARDWARE", label: "Khóa / Cúc / Phụ kiện kim loại", isRequired: false },
      { key: "ACCESSORY", label: "Nhãn mác / Bao bì", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "TAG",
        title: "Thẻ bài treo thương hiệu (Price Tag)",
        description: "Thẻ treo đính kèm sản phẩm hiển thị logo, mã sản phẩm, size và bảng giá",
        defaultFrontTitle: "Haute Couture & Ready-to-Wear",
        defaultBackInstructions: [
          "Bảo quản nơi khô ráo, thoáng khí",
          "Giặt tay nhẹ nhàng bằng nước lạnh",
          "Không dùng chất tẩy rửa mạnh hoặc sấy nhiệt độ cao",
          "Ủi ở nhiệt độ thấp hoặc ủi hơi nước",
        ],
      },
      {
        type: "CARE_GUIDE",
        title: "Thẻ hướng dẫn giặt ủi và bảo quản vải",
        description: "Thẻ hướng dẫn bảo quản chất liệu lụa, dạ, lanh hoặc len cao cấp",
        defaultFrontTitle: "Cẩm Nang Chăm Sóc Sợi Vải Cao Cấp",
        defaultBackInstructions: [
          "Nên giặt khô đối với các sản phẩm dạ và suit",
          "Treo bằng móc gỗ bản rộng để giữ phom vai áo",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện đường cắt may, chất liệu vải, cấu trúc phom dáng, họa tiết và phụ kiện kim loại đính kèm",
    studioBackgroundStyles: ["Phòng thay đồ phong cách Milan tối giản", "Sàn catwalk ánh sáng runway", "Góc phố kiến trúc châu Âu"],
    marketingToneExamples: [
      "Khẳng định khí chất và sự tự tin trong từng đường nét cắt may chuẩn xác",
      "Thiết kế thanh lịch tôn vinh vóc dáng người phụ nữ hiện đại",
    ],
    sampleProductNames: [
      "Đầm lụa tơ tằm cổ yếm dáng suông sang trọng",
      "Áo Blazer dạ tweed dệt kim cúc mạ vàng",
      "Set vest công sở cao cấp chuẩn phom âu",
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  craftFee: {
    feeLabel: "Phí may đo",
    defaultPercent: 40,
    minVnd: 100_000,
    maxVnd: 3_000_000,
    partnerPercent: 70,
    complexityLabels: { EASY: "Sửa, chỉnh đồ", MEDIUM: "May cơ bản", HARD: "Đo may cao cấp" },
    laborByComplexityVnd: { EASY: 50_000, MEDIUM: 200_000, HARD: 600_000 },
    peakDays: [
      { monthDay: "03-08", label: "Quốc tế Phụ nữ" },
      { monthDay: "10-20", label: "Phụ nữ Việt Nam" },
    ],
  },
  costing: null,
}
