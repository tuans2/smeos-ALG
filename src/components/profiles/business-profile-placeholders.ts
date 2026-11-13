/**
 * Gợi ý placeholder theo ngành nghề cho BusinessProfileForm
 */
export function getIndustryPlaceholders(ind: string) {
  switch (ind) {
    case "FASHION":
      return {
        displayName: "Ví dụ: Thời Trang Thiết Kế Lin Boutique",
        legalName: "Ví dụ: Công ty TNHH Thời Trang Lin Boutique",
        description: "Chuyên may đo, thiết kế đầm tiệc, thời trang công sở và phụ kiện cao cấp",
      }
    case "FNB":
      return {
        displayName: "Ví dụ: Tiệm Bánh & Cafe Mùa Hạ",
        legalName: "Ví dụ: Công ty CP Ẩm Thực Mùa Hạ",
        description: "Chuyên cà phê pha máy, bánh ngọt tươi trong ngày và set quà teabreak sự kiện",
      }
    case "CRAFT_GIFT":
      return {
        displayName: "Ví dụ: Quà Tặng & Gốm Thủ Công An Nhiên",
        legalName: "Ví dụ: Hộ kinh doanh Thủ công mỹ nghệ An Nhiên",
        description: "Chuyên đồ gốm thủ công mộc, nến thơm nghệ thuật và quà tặng doanh nghiệp độc bản",
      }
    case "RETAIL_GENERAL":
      return {
        displayName: "Ví dụ: Siêu Thị Tiện Lợi Bách Hóa Gia Hưng",
        legalName: "Ví dụ: Công ty TNHH Bách Hóa Gia Hưng",
        description: "Chuyên cung cấp lẻ và sỉ hàng tiêu dùng, thực phẩm đóng gói và đồ gia dụng",
      }
    case "SERVICES":
      return {
        displayName: "Ví dụ: Spa & Viện Chăm Sóc Sắc Đẹp Mộc Lan",
        legalName: "Ví dụ: Công ty TNHH Chăm Sóc Sắc Đẹp Mộc Lan",
        description: "Dịch vụ trị liệu da chuyên sâu, thư giãn dưỡng sinh và chăm sóc sắc đẹp",
      }
    case "HOMESTAY":
      return {
        displayName: "Ví dụ: Homestay Villa Mây Sơn",
        legalName: "Ví dụ: Hộ kinh doanh Du lịch Mây Sơn",
        description: "Homestay nguyên căn sân vườn view thung lũng, không gian yên tĩnh nghỉ dưỡng",
      }
    case "FLORAL":
    default:
      return {
        displayName: "Ví dụ: Tiệm Sản Phẩm Thảo Mộc",
        legalName: "Ví dụ: Công ty TNHH Sản Phẩm Việt Nam",
        description: "Chuyên hoa sự kiện, hoa cưới, hoa sinh nhật thiết kế cao cấp",
      }
  }
}
