/**
 * Catalogue Collection Content Generator.
 * Hỗ trợ 3 phong cách trưng bày: EDITORIAL_LOOKBOOK, MODERN_SHOWROOM, COMPACT_LIST.
 * Pure Domain - Không phụ thuộc DB hay mạng.
 */

export type CatalogStyleVariant = "EDITORIAL_LOOKBOOK" | "MODERN_SHOWROOM" | "COMPACT_LIST"

export interface CatalogContentInput {
  shopName: string
  collectionName: string
  occasion?: string | undefined
  productCount: number
  styleVariant: CatalogStyleVariant
  userDirectives?: string | undefined
  /** Mô tả bán hàng ĐÃ DUYỆT của vài mẫu tiêu biểu (máy chủ tự đọc, không nhận từ trình duyệt) */
  sellingNotes?: readonly string[] | undefined
}

export interface GeneratedCatalogContent {
  styleVariant: CatalogStyleVariant
  badge: string
  title: string
  description: string
  curatorNote: string
  ctaText: string
}

export const CATALOG_STYLE_OPTIONS: Array<{
  id: CatalogStyleVariant
  name: string
  desc: string
  previewIcon: string
}> = [
  {
    id: "MODERN_SHOWROOM",
    name: "Showroom Hiện Đại",
    desc: "Bố cục lưới sản phẩm cân đối, bộ lọc đa năng, tối ưu cho việc lướt xem hàng ngày",
    previewIcon: "grid",
  },
  {
    id: "EDITORIAL_LOOKBOOK",
    name: "Tạp Chí Nghệ Thuật (Lookbook)",
    desc: "Ảnh lớn 4:5 sang trọng, phông chữ thanh lịch, nhấn mạnh câu chuyện và cảm xúc",
    previewIcon: "book-open",
  },
  {
    id: "COMPACT_LIST",
    name: "Đặt Nhanh Sự Kiện (B2B List)",
    desc: "Danh mục hàng ngang cô đọng, hiển thị rõ số lượng cành và nút chọn đặt số lượng lớn",
    previewIcon: "list",
  },
]

/**
 * Sinh nội dung giới thiệu bộ sưu tập Catalogue theo phong cách đã chọn
 */
export function generateCatalogContent(input: CatalogContentInput): GeneratedCatalogContent {
  const shop = input.shopName || "Siin Store"
  const collection = input.collectionName || "Bộ Sưu Tập Sản Phẩm Tuyển Chọn"
  const occasion = input.occasion ? `cho dịp ${input.occasion}` : "dành cho những khoảnh khắc đáng nhớ"

  switch (input.styleVariant) {
    case "EDITORIAL_LOOKBOOK":
      return {
        styleVariant: "EDITORIAL_LOOKBOOK",
        badge: "Bộ sưu tập chọn lọc",
        title: collection,
        description: `${input.productCount} mẫu của ${shop} cắm tay ${occasion} — lướt ảnh, chọn mẫu hợp ý và nhắn tiệm để đặt.`,
        curatorNote: "Mẫu được chọn theo màu và kiểu dáng dễ tặng; cần đổi tông màu, cứ nhắn tiệm.",
        ctaText: "Xem mẫu và nhắn tiệm",
      }

    case "COMPACT_LIST":
      return {
        styleVariant: "COMPACT_LIST",
        badge: "Danh mục đặt nhanh",
        title: collection,
        description: `Danh mục ${input.productCount} sản phẩm tiêu chuẩn, tối ưu thời gian chọn mẫu và đặt số lượng lớn cho công ty, sự kiện và hội nghị.`,
        curatorNote: "Cần hóa đơn, in logo hay giao nhiều địa điểm, vui lòng nhắn tiệm để được xác nhận.",
        ctaText: "Đặt nhanh sản phẩm",
      }

    case "MODERN_SHOWROOM":
    default:
      return {
        styleVariant: "MODERN_SHOWROOM",
        badge: "Bộ sưu tập trực tuyến",
        title: collection,
        description: `${input.productCount} mẫu từ ${shop} ${occasion} — xem ảnh thật, chọn mẫu và nhắn tiệm để đặt.`,
        curatorNote: "Mỗi mẫu do tiệm tự chọn và cắm; cần tư vấn thêm, cứ nhắn tiệm.",
        ctaText: "Tư vấn qua Zalo",
      }
  }
}
