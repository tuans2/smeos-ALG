import type { IndustryPluginContract } from "../industry-plugin-contract"

export const RETAIL_GENERAL_INDUSTRY: IndustryPluginContract = {
  identity: {
    key: "RETAIL_GENERAL",
    name: "Bán lẻ & Thương mại tổng hợp",
    description: "Cửa hàng bán lẻ tổng hợp, siêu thị mini, phân phối hàng hóa",
    iconName: "ShoppingBag",
  },
  terminology: {
    makerTitle: "Nhân viên kho / Soạn hàng",
    makerAction: "Soạn hàng & Kiểm tra",
    productRecipe: "Danh sách sản phẩm cấu thành",
    sampleProduct: "Sản phẩm mẫu",
    rawMaterialItem: "Mặt hàng / Linh kiện",
    completedProductPhoto: "Ảnh kiện hàng đóng gói",
    printablesTitle: "Phiếu xuất kho & Hóa đơn",
    catalogTitle: "Danh mục Hàng hóa & Sản phẩm",
    createButtonLabel: "Thêm sản phẩm mới",
    scanButtonLabel: "Quét mã vạch / Sản phẩm",
    defaultMeasurementUnits: ["cái", "hộp", "thùng", "bịch", "chai", "gói"],
    defaultComponentRoles: [
      { key: "PRIMARY", label: "Sản phẩm chính", isRequired: true },
      { key: "BUNDLED", label: "Hàng tặng kèm", isRequired: false },
      { key: "PACKAGING", label: "Bao bì đóng gói", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
      { key: "GROCERY", label: "Bách hóa tiêu dùng & Thực phẩm", defaultUnit: "gói" },
      { key: "COSMETICS", label: "Mỹ phẩm & Chăm sóc cá nhân", defaultUnit: "chai" },
      { key: "HOUSEHOLD", label: "Đồ gia dụng & Tiện ích thông minh", defaultUnit: "cái" },
      { key: "STATIONERY", label: "Văn phòng phẩm & Dụng cụ học tập", defaultUnit: "bộ" },
      { key: "ELECTRONICS_ACC", label: "Phụ kiện công nghệ & Điện tử", defaultUnit: "chiếc" },
      { key: "MOM_BABY", label: "Mẹ & Bé dinh dưỡng", defaultUnit: "hộp" },
    ],
    occasions: [
      { key: "PAYDAY_SALE", label: "Lễ hội Lương về Ngày hội mua sắm", suggestedPromotion: "Giảm 10% toàn bộ đơn hàng trên 300k" },
      { key: "WEEKEND_PROMO", label: "Siêu sale cuối tuần", suggestedPromotion: "Mua combo tiết kiệm tới 30%" },
      { key: "BACK_TO_SCHOOL", label: "Mùa tựu trường Back-to-school", suggestedPromotion: "Tặng bút viết hoặc sổ tay xinh xắn" },
      { key: "SUMMER_VACATION", label: "Mùa du lịch & Trải nghiệm hè", suggestedPromotion: "Set du lịch mini tiện lợi" },
    ],
    priceRanges: [
      { label: "Dưới 100.000 ₫", min: 0, max: 100000 },
      { label: "100.000 – 300.000 ₫", min: 100000, max: 300000 },
      { label: "300.000 – 800.000 ₫", min: 300000, max: 800000 },
      { label: "Trên 800.000 ₫", min: 800000 },
    ],
    pricingPresets: {
      weekendIsPeak: false,
      variantDimensions: [
        { key: "VOLUME", label: "Dung tích / Khối lượng", values: ["100 ml", "250 ml", "500 ml", "1 lít", "100 g", "500 g", "1 kg"] },
        { key: "COLOR", label: "Màu", values: ["Đen", "Trắng", "Xám", "Xanh", "Đỏ", "Hồng"] },
        { key: "PACK", label: "Quy cách", values: ["Lẻ", "Lốc", "Hộp", "Thùng"] },
        { key: "EDITION", label: "Phiên bản", values: ["Tiêu chuẩn", "Cao cấp", "Giới hạn"] },
      ],
    },
  },
  bomSpec: {
    measurementUnits: ["cái", "hộp", "thùng", "bịch", "chai", "gói"],
    componentRoles: [
      { key: "PRIMARY", label: "Sản phẩm chính", isRequired: true },
      { key: "BUNDLED", label: "Hàng tặng kèm", isRequired: false },
      { key: "PACKAGING", label: "Bao bì đóng gói", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "TAG",
        title: "Tem nhãn mã vạch & Bảng giá kệ hàng",
        description: "Tem in mã vạch chuẩn, tên sản phẩm, đơn vị tính và giá bán lẻ",
        defaultFrontTitle: "Tem Nhãn Phụ Hàng Hóa",
        defaultBackInstructions: [
          "Bảo quản nơi khô ráo, tránh nhiệt độ cao",
          "Kiểm tra hạn sử dụng in trên bao bì trước khi dùng",
        ],
      },
      {
        type: "DISPATCH",
        title: "Phiếu giao nhận & Thẻ cảm ơn khách hàng",
        description: "Phiếu đóng gói đơn hàng kèm QR đổi trả thuận tiện",
        defaultFrontTitle: "Cảm Ơn Quý Khách Đã Mua Sắm",
        defaultBackInstructions: [
          "Hỗ trợ đổi trả trong vòng 7 ngày nếu sản phẩm lỗi nhà sản xuất",
          "Vui lòng quay video mở kiện hàng để được xử lý nhanh nhất",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện bao bì sản phẩm, nhãn phụ, mã vạch, hạn sử dụng và tính nguyên vẹn kiện hàng",
    studioBackgroundStyles: ["Kệ trưng bày siêu thị hiện đại", "Bàn phẳng studio chụp ảnh sản phẩm sạch sẽ", "Không gian gia đình tiện nghi"],
    marketingToneExamples: [
      "Hàng chính hãng chất lượng cao, giá thành hợp lý cho mọi gia đình",
      "Tiện lợi, an tâm mua sắm với chính sách giao nhận hỏa tốc và đổi trả dễ dàng",
    ],
    sampleProductNames: [
      "Set nước hoa hồng cấp ẩm dịu nhẹ 150ml",
      "Nồi lẩu điện đa năng nắp kính dung tích 3L",
      "Hộp viên giặt xả 3 trong 1 hương hoa thảo mộc",
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  craftFee: {
    feeLabel: "Phí gia công",
    defaultPercent: 30,
    minVnd: 50_000,
    maxVnd: 1_000_000,
    partnerPercent: 70,
    complexityLabels: { EASY: "Đóng gói", MEDIUM: "Lắp ráp", HARD: "Gia công riêng" },
    laborByComplexityVnd: { EASY: 20_000, MEDIUM: 80_000, HARD: 200_000 },
    peakDays: [],
  },
  costing: null,
}
