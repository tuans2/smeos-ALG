import type { IndustryPluginContract } from "../industry-plugin-contract"

export const SERVICES_INDUSTRY: IndustryPluginContract = {
  identity: {
    key: "SERVICES",
    name: "Dịch vụ & Kỹ thuật",
    description: "Dịch vụ làm đẹp, bảo dưỡng, kỹ thuật, sửa chữa",
    iconName: "Wrench",
  },
  terminology: {
    makerTitle: "Kỹ thuật viên / Chuyên viên",
    makerAction: "Thực hiện dịch vụ",
    productRecipe: "Quy trình & Vật tư thực hiện",
    sampleProduct: "Gói dịch vụ chuẩn",
    rawMaterialItem: "Vật tư tiêu hao",
    completedProductPhoto: "Ảnh nghiệm thu hoàn thành",
    printablesTitle: "Phiếu bảo hành & Lịch hẹn",
    catalogTitle: "Menu Dịch vụ & Gói trị liệu",
    createButtonLabel: "Thêm gói dịch vụ",
    scanButtonLabel: "Quét ảnh hiện trạng",
    defaultMeasurementUnits: ["lượt", "giờ", "buổi", "gói", "lần"],
    defaultComponentRoles: [
      { key: "SERVICE", label: "Nội dung dịch vụ chính", isRequired: true },
      { key: "CONSUMABLE", label: "Vật tư tiêu hao", isRequired: false },
      { key: "EQUIPMENT", label: "Dụng cụ hỗ trợ", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
      { key: "SPA_MASSAGE", label: "Spa thư giãn & Dưỡng sinh", defaultUnit: "buổi" },
      { key: "SKINCARE", label: "Chăm sóc da & Trị liệu chuyên sâu", defaultUnit: "lượt" },
      { key: "HAIR_NAIL", label: "Làm tóc & Chăm sóc móng nghệ thuật", defaultUnit: "lần" },
      { key: "MAINTENANCE", label: "Bảo dưỡng & Sửa chữa thiết bị", defaultUnit: "lần" },
      { key: "CLEANING", label: "Vệ sinh công nghiệp & Giặt là", defaultUnit: "gói" },
      { key: "PACKAGE", label: "Thẻ liệu trình nhiều buổi", defaultUnit: "thẻ" },
    ],
    occasions: [
      { key: "FIRST_TIME_TRIAL", label: "Trải nghiệm lần đầu cho khách mới", suggestedPromotion: "Ưu đãi trải nghiệm giảm 30%" },
      { key: "WEEKDAY_RELAX", label: "Ngày trong tuần Thư thái nạp năng lượng", suggestedPromotion: "Đi 2 người tính tiền 1.5 người" },
      { key: "MEMBERSHIP_LOYALTY", label: "Tri ân Hội viên thân thiết", suggestedPromotion: "Tặng 01 buổi ngâm chân thảo dược" },
      { key: "HOLIDAY_DETOX", label: "Mùa làm mới bản thân đón lễ", suggestedPromotion: "Tặng gói soi da hoặc kiểm tra miễn phí" },
    ],
    priceRanges: [
      { label: "Dưới 150.000 ₫", min: 0, max: 150000 },
      { label: "150.000 – 400.000 ₫", min: 150000, max: 400000 },
      { label: "400.000 – 1.000.000 ₫", min: 400000, max: 1000000 },
      { label: "Trên 1.000.000 ₫", min: 1000000 },
    ],
    pricingPresets: {
      weekendIsPeak: true,
      variantDimensions: [
        { key: "PACKAGE", label: "Gói dịch vụ", values: ["Cơ bản", "Tiêu chuẩn", "Cao cấp", "VIP"] },
        { key: "DURATION", label: "Thời lượng", values: ["30 phút", "60 phút", "90 phút", "120 phút"] },
        { key: "SESSIONS", label: "Số buổi", values: ["1 buổi", "5 buổi", "10 buổi", "20 buổi"] },
        { key: "PROVIDER", label: "Người thực hiện", values: ["Kỹ thuật viên", "Chuyên viên", "Chuyên gia"] },
      ],
    },
  },
  bomSpec: {
    measurementUnits: ["lượt", "giờ", "buổi", "gói", "lần"],
    componentRoles: [
      { key: "SERVICE", label: "Nội dung dịch vụ chính", isRequired: true },
      { key: "CONSUMABLE", label: "Vật tư tiêu hao", isRequired: false },
      { key: "EQUIPMENT", label: "Dụng cụ hỗ trợ", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "WARRANTY",
        title: "Phiếu bảo hành & Cam kết chất lượng",
        description: "Phiếu cam kết hiệu quả liệu trình hoặc thời hạn bảo hành kỹ thuật",
        defaultFrontTitle: "Phiếu Cam Kết Chất Lượng Dịch Vụ",
        defaultBackInstructions: [
          "Bảo hành kỹ thuật miễn phí trong thời gian ghi trên phiếu",
          "Vui lòng mang theo phiếu hoặc cung cấp số điện thoại khi tái khám/kiểm tra",
        ],
      },
      {
        type: "CARD",
        title: "Thẻ hẹn lịch & Tích điểm hội viên",
        description: "Thẻ theo dõi số buổi liệu trình và nhắc lịch hẹn tiếp theo",
        defaultFrontTitle: "Lịch Trình Chăm Sóc Định Kỳ",
        defaultBackInstructions: [
          "Đến đúng giờ hẹn để được phục vụ chu đáo nhất",
          "Báo trước tối thiểu 2 giờ nếu quý khách muốn đổi lịch hẹn",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện hiện trạng trước và sau khi làm dịch vụ, độ sạch bóng bề mặt và biểu cảm hài lòng của khách",
    studioBackgroundStyles: ["Không gian phòng spa ánh nến thư giãn", "Góc kỹ thuật hiện đại sạch sẽ", "Phòng chờ đón tiếp sang trọng"],
    marketingToneExamples: [
      "Tận hưởng dịch vụ tận tâm, mang lại sự thư thái và hiệu quả vượt trội",
      "Đội ngũ kỹ thuật viên tay nghề cao đồng hành cùng bạn chăm sóc sức khỏe và sắc đẹp",
    ],
    sampleProductNames: [
      "Liệu trình gội đầu dưỡng sinh thảo mộc 60 phút",
      "Gói chăm sóc phục hồi da mụn chuyên sâu",
      "Thẻ hội viên 10 buổi massage thư giãn toàn thân",
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  craftFee: {
    feeLabel: "Phí thực hiện dịch vụ",
    defaultPercent: 60,
    minVnd: 100_000,
    maxVnd: 5_000_000,
    partnerPercent: 80,
    complexityLabels: { EASY: "Cơ bản", MEDIUM: "Nâng cao", HARD: "Chuyên sâu" },
    laborByComplexityVnd: { EASY: 100_000, MEDIUM: 300_000, HARD: 800_000 },
    peakDays: [],
  },
  costing: null,
}
