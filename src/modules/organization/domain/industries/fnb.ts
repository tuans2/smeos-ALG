import type { IndustryPluginContract } from "../industry-plugin-contract"

export const FNB_INDUSTRY: IndustryPluginContract = {
  identity: {
    key: "FNB",
    name: "Ẩm thực & Đồ uống (F&B)",
    description: "Tiệm bánh ngọt, quán cà phê, bếp phục vụ món theo yêu cầu",
    iconName: "UtensilsCrossed",
  },
  terminology: {
    makerTitle: "Đầu bếp / Barista / Thợ bánh",
    makerAction: "Chế biến & Ra món",
    productRecipe: "Công thức định lượng món",
    sampleProduct: "Mẫu món chuẩn",
    rawMaterialItem: "Nguyên liệu chế biến",
    completedProductPhoto: "Ảnh món thành phẩm",
    printablesTitle: "Menu / Thẻ cảm ơn",
    catalogTitle: "Thực đơn món & Đồ uống",
    createButtonLabel: "Thêm món mới",
    scanButtonLabel: "Quét ảnh món ăn",
    defaultMeasurementUnits: ["phần", "ly", "cái", "hộp", "gram", "ml", "set"],
    defaultComponentRoles: [
      { key: "PRIMARY", label: "Nguyên liệu chính", isRequired: true },
      { key: "SECONDARY", label: "Gia vị & Nước sốt", isRequired: false },
      { key: "TOPPING", label: "Topping / Đồ ăn kèm", isRequired: false },
      { key: "PACKAGING", label: "Hộp / Ly / Bao bì mang đi", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
      { key: "COFFEE", label: "Cà phê & Đồ uống pha chế", defaultUnit: "ly" },
      { key: "PASTRY_CAKE", label: "Bánh ngọt & Tráng miệng", defaultUnit: "cái" },
      { key: "MAIN_COURSE", label: "Món ăn chính & Cơm phần", defaultUnit: "phần" },
      { key: "SNACKS", label: "Đồ ăn nhẹ & Khai vị", defaultUnit: "đĩa" },
      { key: "COMBO", label: "Set Menu & Combo gia đình", defaultUnit: "set" },
      { key: "BAKERY", label: "Bánh mì & Bánh tươi nướng trong ngày", defaultUnit: "ổ" },
    ],
    occasions: [
      { key: "HAPPY_HOUR", label: "Khung giờ vàng Happy Hour", suggestedPromotion: "Mua 1 tặng 1 đồ uống" },
      { key: "WEEKEND_PARTY", label: "Tiệc cuối tuần & Họp mặt", suggestedPromotion: "Giảm 10% cho bàn đặt trước từ 4 người" },
      { key: "TEABREAK", label: "Teabreak & Sự kiện công ty", suggestedPromotion: "Miễn phí vận chuyển và khay bày tiệc" },
      { key: "BIRTHDAY_CELEBRATION", label: "Tiệc sinh nhật ấm cúng", suggestedPromotion: "Tặng bánh kem mini hoặc nến phát sáng" },
    ],
    priceRanges: [
      { label: "Dưới 50.000 ₫", min: 0, max: 50000 },
      { label: "50.000 – 150.000 ₫", min: 50000, max: 150000 },
      { label: "150.000 – 350.000 ₫", min: 150000, max: 350000 },
      { label: "Trên 350.000 ₫", min: 350000 },
    ],
    pricingPresets: {
      weekendIsPeak: true,
      variantDimensions: [
        { key: "PORTION", label: "Kích cỡ phần", values: ["Nhỏ", "Vừa", "Lớn"] },
        { key: "CUP_SIZE", label: "Size ly", values: ["S", "M", "L"] },
        { key: "FLAVOR", label: "Hương vị", values: ["Truyền thống", "Socola", "Matcha", "Dâu", "Vani", "Trái cây"] },
        { key: "SERVINGS", label: "Số người ăn", values: ["1 người", "2 người", "4 người", "6 người", "10 người"] },
        { key: "CAKE_SIZE", label: "Kích thước bánh", values: ["12 cm", "16 cm", "20 cm", "24 cm", "2 tầng"] },
      ],
    },
  },
  bomSpec: {
    measurementUnits: ["phần", "ly", "cái", "hộp", "gram", "ml", "set"],
    componentRoles: [
      { key: "PRIMARY", label: "Nguyên liệu chính", isRequired: true },
      { key: "SECONDARY", label: "Gia vị & Nước sốt", isRequired: false },
      { key: "TOPPING", label: "Topping / Đồ ăn kèm", isRequired: false },
      { key: "PACKAGING", label: "Hộp / Ly / Bao bì mang đi", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "MENU",
        title: "Menu để bàn A6 / Kẹp hóa đơn",
        description: "Bảng thực đơn món đặc sắc để bàn kèm mã QR quét gọi món nhanh",
        defaultFrontTitle: "Thực Đơn Món Đặc Sắc Hôm Nay",
        defaultBackInstructions: [
          "Quét mã QR trên bàn để xem thêm thực đơn đầy đủ và gọi món",
          "Vui lòng thông báo cho nhân viên nếu quý khách có dị ứng thực phẩm",
        ],
      },
      {
        type: "CARD",
        title: "Thẻ hướng dẫn bảo quản thực phẩm mang đi",
        description: "Thẻ dán hoặc đính kèm hộp đồ ăn hướng dẫn nhiệt độ và thời hạn dùng",
        defaultFrontTitle: "Thưởng Thức Trọn Vị Tươi Ngon",
        defaultBackInstructions: [
          "Bảo quản ngăn mát tủ lạnh (2-5 độ C) và dùng ngon nhất trong 24 giờ",
          "Hâm nóng lại bằng lò vi sóng 1-2 phút trước khi dùng",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện màu sắc đồ ăn, độ sánh mịn nước sốt, cách trang trí plating đĩa và ước tính định lượng món",
    studioBackgroundStyles: ["Bàn gỗ quán cà phê mộc ấm cúng", "Ánh sáng bếp ấm áp", "Không gian nhà hàng fine dining"],
    marketingToneExamples: [
      "Hương vị nguyên bản, đánh thức mọi giác quan qua từng món ăn đậm đà",
      "Được chuẩn bị thủ công mỗi ngày từ những nguyên liệu tươi sạch được tuyển chọn khắt khe",
    ],
    sampleProductNames: [
      "Cà phê muối caramel kem béo bồng bềnh",
      "Bánh kem bắp phô mai hạnh nhân mềm mịn",
      "Set cơm bò sốt tiêu đen kèm canh rong biển",
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  craftFee: {
    feeLabel: "Phí chế biến",
    defaultPercent: 40,
    minVnd: 50_000,
    maxVnd: 2_000_000,
    partnerPercent: 70,
    complexityLabels: { EASY: "Món đơn giản", MEDIUM: "Set, combo", HARD: "Tiệc, bánh đặt riêng" },
    laborByComplexityVnd: { EASY: 30_000, MEDIUM: 100_000, HARD: 300_000 },
    peakDays: [
      { monthDay: "02-14", label: "Lễ Tình nhân" },
      { monthDay: "12-24", label: "Giáng sinh" },
    ],
  },
  costing: null,
}
