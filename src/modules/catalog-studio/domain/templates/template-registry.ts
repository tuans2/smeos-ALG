/**
 * Universal Catalog Studio 2026 — 5 Core Prototypes (T01–T05).
 * Pure Domain — Zero ORM.
 */

import type { CatalogTemplateId, CatalogTemplatePrototype } from "../entities/catalog-studio.types"

export const CATALOG_TEMPLATES: Record<CatalogTemplateId, CatalogTemplatePrototype> = {
  T01_SIGNATURE_COLLECTION: {
    id: "T01_SIGNATURE_COLLECTION",
    name: "Bộ sưu tập đặc trưng",
    subtitle: "Bộ sưu tập nghệ thuật & Tạp chí thời trang",
    badge: "Tạp chí thời trang",
    defaultStyleId: "S01_EDITORIAL_MAGAZINE",
    description: "Bố cục tạp chí biên tập ấn tượng, ảnh lớn 4:5, khoảng trắng rộng rãi tôn vinh phẩm cấp thương hiệu.",
    recommendedFor: "Bộ sưu tập theo mùa, dòng sản phẩm cao cấp, thời trang, hoa tươi nghệ thuật và quà tặng VIP.",
    structure: [
      { layoutId: "L01_COVER", title: "Bìa tạp chí nghệ thuật" },
      { layoutId: "L02_BRAND_STORY", title: "Câu chuyện & Triết lý chế tác" },
      { layoutId: "L04_HERO_PRODUCT", title: "Tác phẩm chủ đạo nổi bật" },
      { layoutId: "L05_PRODUCT_GRID", title: "Lưới danh mục tinh tuyển" },
      { layoutId: "L08_CLOSING", title: "Trang kết & Liên hệ đặt hàng" },
    ],
  },

  T02_MINIMAL_PRODUCT_LIST: {
    id: "T02_MINIMAL_PRODUCT_LIST",
    name: "Danh sách tối giản",
    subtitle: "Danh mục tối giản, thông tin mạch lạc chuẩn Bắc Âu",
    badge: "Tối giản",
    defaultStyleId: "S02_PURE_MINIMAL",
    description: "Lưới sản phẩm quang đãng, bố cục gọn gàng, tối đa sự tập trung vào sản phẩm, tối ưu cho danh mục nhiều mẫu.",
    recommendedFor: "Bán lẻ, mỹ phẩm, phụ kiện, hàng thiết kế và danh mục nhiều mặt hàng cần duyệt nhanh.",
    structure: [
      { layoutId: "L01_COVER", title: "Bìa tối giản thanh lịch" },
      { layoutId: "L05_PRODUCT_GRID", title: "Lưới sản phẩm đa tầng" },
      { layoutId: "L06_PRODUCT_DETAIL", title: "Chi tiết mẫu tiêu biểu" },
      { layoutId: "L08_CLOSING", title: "Thông tin thanh toán & Đặt hàng" },
    ],
  },

  T03_PREMIUM_LOOKBOOK: {
    id: "T03_PREMIUM_LOOKBOOK",
    name: "Sách ảnh cao cấp",
    subtitle: "Sách ảnh sang trọng, kể chuyện bằng hình ảnh",
    badge: "Sang trọng",
    defaultStyleId: "S03_QUIET_LUXURY",
    description: "Tông ấm trầm sang trọng, từng trang là một trải nghiệm thị giác tĩnh tại, đậm chất thơ và giá trị độc bản.",
    recommendedFor: "Sự kiện cưới, quà kỷ niệm, đồ nội thất cao cấp, trang sức và các bộ sưu tập giới hạn.",
    structure: [
      { layoutId: "L01_COVER", title: "Bìa sách ảnh sang trọng" },
      { layoutId: "L02_BRAND_STORY", title: "Cảm xúc & Nguồn cảm hứng" },
      { layoutId: "L04_HERO_PRODUCT", title: "Tác phẩm đỉnh cao" },
      { layoutId: "L05_PRODUCT_GRID", title: "Các mẫu trong bộ sưu tập" },
      { layoutId: "L08_CLOSING", title: "Trân trọng cảm ơn & Kết nối" },
    ],
  },

  T04_BENTO_SHOWCASE: {
    id: "T04_BENTO_SHOWCASE",
    name: "Trưng bày ô lưới",
    subtitle: "Ô lưới năng động cho cửa hàng hiện đại",
    badge: "Xu hướng",
    defaultStyleId: "S08_BENTO_GALLERY",
    description: "Bố cục chia ô lưới cân bằng, kết hợp hình ảnh nổi bật với thẻ thông tin phụ trực quan, tối ưu cho lướt nhanh và chốt đơn tức thì.",
    recommendedFor: "Thương mại tổng hợp, F&B, bán lẻ Gen Z, sản phẩm đa dạng cần trình bày sinh động không nhàm chán.",
    structure: [
      { layoutId: "L01_COVER", title: "Bìa ô lưới năng động" },
      { layoutId: "L03_COLLECTION_DIVIDER", title: "Phân chương theo nhóm mẫu" },
      { layoutId: "L05_PRODUCT_GRID", title: "Lưới sản phẩm ô vuông" },
      { layoutId: "L08_CLOSING", title: "Gọi hành động & Đặt hàng ngay" },
    ],
  },

  T05_DARK_CINEMATIC: {
    id: "T05_DARK_CINEMATIC",
    name: "Điện ảnh nền tối",
    subtitle: "Nền tối điện ảnh, cao cấp",
    badge: "Nền tối",
    defaultStyleId: "S11_DARK_SHOWCASE",
    description: "Nền đen huyền bí sang trọng, ánh sáng tập trung tôn từng chi tiết sản phẩm, tương phản mạnh như một thước phim.",
    recommendedFor: "Trang sức, đồng hồ, mỹ phẩm cao cấp, rượu vang, công nghệ cao cấp và thương hiệu cần định vị độc bản.",
    structure: [
      { layoutId: "L01_COVER", title: "Bìa điện ảnh huyền bí" },
      { layoutId: "L04_HERO_PRODUCT", title: "Mẫu nổi bật" },
      { layoutId: "L05_PRODUCT_GRID", title: "Các mẫu trong bộ sưu tập" },
      { layoutId: "L06_PRODUCT_DETAIL", title: "Chi tiết mẫu tiêu biểu" },
      { layoutId: "L08_CLOSING", title: "Kết nối VIP & Đặt hàng riêng" },
    ],
  },
}

export const CATALOG_TEMPLATE_LIST = Object.values(CATALOG_TEMPLATES)
