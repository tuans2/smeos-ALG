import type { IndustryPluginContract } from "../industry-plugin-contract"

export const HOMESTAY_INDUSTRY: IndustryPluginContract = {
  identity: {
    key: "HOMESTAY",
    name: "Homestay & Lưu trú nghỉ dưỡng",
    description: "Homestay, biệt thự nghỉ dưỡng, căn hộ dịch vụ và hostel lưu trú",
    iconName: "Home",
  },
  terminology: {
    makerTitle: "Chủ nhà / Quản gia / Lễ tân",
    makerAction: "Chuẩn bị phòng & Đón tiếp",
    productRecipe: "Tiện nghi & Vật tư phòng",
    sampleProduct: "Hạng phòng chuẩn",
    rawMaterialItem: "Vật tư & Tiện ích phòng",
    completedProductPhoto: "Ảnh không gian phòng hoàn thiện",
    printablesTitle: "Nội quy & Thẻ chào mừng",
    catalogTitle: "Danh sách Phòng & Gói lưu trú",
    createButtonLabel: "Thêm hạng phòng",
    scanButtonLabel: "Quét ảnh không gian phòng",
    defaultMeasurementUnits: ["đêm", "phòng", "căn", "giờ", "khách", "combo"],
    defaultComponentRoles: [
      { key: "AMENITY", label: "Tiện nghi phòng chính", isRequired: true },
      { key: "LINEN", label: "Chăn ga & Đồ vải tiêu chuẩn", isRequired: true },
      { key: "CONSUMABLE", label: "Vật phẩm vệ sinh & Đồ tiêu hao", isRequired: false },
      { key: "COMPLIMENTARY", label: "Đồ uống & Quà chào mừng miễn phí", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
      { key: "STUDIO_ROOM", label: "Phòng Studio khép kín", defaultUnit: "đêm" },
      { key: "FAMILY_ROOM", label: "Phòng gia đình nhiều giường", defaultUnit: "đêm" },
      { key: "ENTIRE_VILLA", label: "Thuê nguyên căn Villa / Nhà riêng", defaultUnit: "đêm" },
      { key: "DORM_BED", label: "Giường tầng tập thể Dormitory", defaultUnit: "giường" },
      { key: "BUNGALOW", label: "Bungalow sân vườn view thiên nhiên", defaultUnit: "căn" },
      { key: "DAY_USE", label: "Gói nghỉ ngơi theo giờ / Trong ngày", defaultUnit: "giờ" },
    ],
    occasions: [
      { key: "WEEKEND_GETAWAY", label: "Nghỉ dưỡng cuối tuần thư giãn", suggestedPromotion: "Ưu đãi đặt phòng 2 đêm giảm 15%" },
      { key: "HOLIDAY_VACATION", label: "Kỳ nghỉ lễ & Mùa du lịch cao điểm", suggestedPromotion: "Tặng bữa sáng đặc sản địa phương miễn phí" },
      { key: "HONEYMOON_ROMANCE", label: "Trăng mật & Kỷ niệm lãng mạn", suggestedPromotion: "Setup phòng trăng mật với nến thơm và bánh ngọt chào mừng" },
      { key: "WORKATION", label: "Làm việc từ xa & Lưu trú dài hạn", suggestedPromotion: "Giảm 30% cho khách đặt lưu trú theo tuần/tháng" },
    ],
    priceRanges: [
      { label: "Dưới 500.000 ₫ / đêm", min: 0, max: 500000 },
      { label: "500.000 – 1.200.000 ₫ / đêm", min: 500000, max: 1200000 },
      { label: "1.200.000 – 3.000.000 ₫ / đêm", min: 1200000, max: 3000000 },
      { label: "Trên 3.000.000 ₫ / đêm", min: 3000000 },
    ],
    pricingPresets: {
      weekendIsPeak: true,
      variantDimensions: [
        { key: "ROOM_TYPE", label: "Loại phòng", values: ["Phòng đơn", "Phòng đôi", "Phòng gia đình", "Phòng tập thể", "Nguyên căn"] },
        { key: "GUESTS", label: "Số khách", values: ["1 khách", "2 khách", "4 khách", "6 khách", "10 khách"] },
        { key: "VIEW", label: "Hướng phòng", values: ["Hướng núi", "Hướng biển", "Hướng vườn", "Hướng phố"] },
        { key: "BOARD", label: "Gói kèm", values: ["Chỉ phòng", "Kèm ăn sáng", "Trọn gói ăn uống"] },
      ],
    },
  },
  bomSpec: {
    measurementUnits: ["đêm", "phòng", "căn", "giờ", "khách", "combo"],
    componentRoles: [
      { key: "AMENITY", label: "Tiện nghi phòng chính", isRequired: true },
      { key: "LINEN", label: "Chăn ga & Đồ vải tiêu chuẩn", isRequired: true },
      { key: "CONSUMABLE", label: "Vật phẩm vệ sinh & Đồ tiêu hao", isRequired: false },
      { key: "COMPLIMENTARY", label: "Đồ uống & Quà chào mừng miễn phí", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "CARD",
        title: "Thẻ chào mừng & Mật khẩu Wi-Fi",
        description: "Thẻ A6 đặt trên bàn đầu giường với thông tin Wi-Fi, hotline hỗ trợ và lời đón tiếp ấm áp",
        defaultFrontTitle: "Chào Mừng Quý Khách Đến Nghỉ Dưỡng",
        defaultBackInstructions: [
          "Mạng Wi-Fi: Homestay_Guest | Mật khẩu: ChucQuyKhachNghiNgoiVuiVe",
          "Hotline hỗ trợ & dịch vụ phòng 24/7: Vui lòng nhắn tin qua Zalo hoặc lễ tân",
        ],
      },
      {
        type: "CARE_GUIDE",
        title: "Nội quy lưu trú & Hướng dẫn sử dụng thiết bị",
        description: "Bản hướng dẫn nhận/trả phòng, sử dụng điều hòa, bình nước nóng và giữ gìn không gian chung",
        defaultFrontTitle: "Cẩm Nang Lưu Trú & Giữ Gìn Không Gian Chung",
        defaultBackInstructions: [
          "Giờ nhận phòng: từ 14:00 | Giờ trả phòng: trước 12:00 hôm sau",
          "Giữ yên tĩnh chung sau 22:00 để tôn trọng kỳ nghỉ của mọi người xung quanh",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện phong cách bài trí phòng (Scandinavian, Bohemian, Vintage, Hiện đại), độ ngăn nắp sạch sẽ của ga nệm, ánh sáng tự nhiên và view cửa sổ",
    studioBackgroundStyles: ["Không gian phòng ngủ đón nắng sớm ấm áp", "Góc ban công ngắm hoàng hôn chill", "Phòng khách sinh hoạt chung ấm cúng vintage"],
    marketingToneExamples: [
      "Trải nghiệm không gian nghỉ ngơi thư thái, nơi bạn tìm thấy sự bình yên như chính ngôi nhà của mình",
      "Căn phòng tràn ngập ánh sáng tự nhiên và góc ban công cực chill cho kỳ nghỉ trọn vẹn",
    ],
    sampleProductNames: [
      "Phòng Studio Deluxe ban công view thung lũng",
      "Căn hộ nghỉ dưỡng 2 phòng ngủ ấm cúng cho gia đình",
      "Villa nguyên căn sân vườn tiệc nướng BBQ ngoài trời",
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  // Lưu trú không thuê ngoài sản xuất — không có Phí gia công
  craftFee: null,
  costing: null,
}
