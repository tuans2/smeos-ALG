/**
 * ALG Template Engine — Variable Catalog
 * Danh mục token chuẩn hóa & Resolver trích xuất dữ liệu.
 *
 * DỰ TRỮ, KHÔNG PHẢI NỢ (nợ #99, chốt 17/09) — xem chú thích đầy đủ ở
 * `../golden-templates.ts`. `buildInterpolationContext()` không được luồng
 * thật nào gọi; `generate-product-copy.ts`/`sales-pitch-template.ts` tự xây
 * dữ liệu tenant/sản phẩm bằng đường riêng của chúng, không qua tệp này.
 */

import type { TemplateVariableMeta, InterpolationContext } from "./template-types"

export const STANDARD_VARIABLES: TemplateVariableMeta[] = [
  // Product
  { key: "product.name", label: "Tên sản phẩm", category: "product", description: "Tên thương mại của sản phẩm", exampleValue: "Sản Phẩm Nắng Sớm" },
  { key: "product.sku", label: "Mã SKU", category: "product", description: "Mã quản lý kho", exampleValue: "SP-001" },
  { key: "product.style", label: "Phong cách", category: "product", description: "Phong cách thiết kế", exampleValue: "Hàn Quốc nhẹ nhàng" },
  { key: "product.category", label: "Phân loại", category: "product", description: "Dạng sản phẩm (Bó, Giỏ, Kệ...)", exampleValue: "Sản phẩm" },

  // Flower
  { key: "flower.summary_list", label: "Cấu phần tóm tắt", category: "flower", description: "Danh sách hoa chính gộp chuỗi", exampleValue: "10 Hồng Ohara, 5 Cúc Tana, Lá bạc" },
  { key: "flower.main_tones", label: "Tone màu", category: "flower", description: "Bảng màu chủ đạo", exampleValue: "Hồng pastel, Trắng kem" },
  { key: "flower.facing", label: "Hướng nhìn", category: "flower", description: "Góc ngắm của hoa", exampleValue: "Mặt trước (1 hướng)" },
  { key: "flower.wrapping", label: "Giấy gói & Nơ", category: "flower", description: "Vật liệu bao gói", exampleValue: "Giấy xốp Hàn Quốc hồng cam, nơ voan" },
  { key: "flower.total_stems", label: "Tổng số cành", category: "flower", description: "Tổng số thành phần và lá", exampleValue: "15" },

  // Pricing
  { key: "pricing.selling_price_vnd", label: "Giá bán thực tế", category: "pricing", description: "Giá sau giảm, định dạng VNĐ", exampleValue: "650.000đ" },
  { key: "pricing.original_price_vnd", label: "Giá niêm yết gốc", category: "pricing", description: "Giá trước giảm", exampleValue: "750.000đ" },
  { key: "pricing.discount_percent", label: "Tỷ lệ giảm giá", category: "pricing", description: "Phần trăm giảm nếu có", exampleValue: "15%" },
  { key: "pricing.segment", label: "Phân khúc giá", category: "pricing", description: "Mức giá thị trường", exampleValue: "Tiêu chuẩn" },

  // Service
  { key: "service.gifts_bullets", label: "Quà tặng đính kèm", category: "service", description: "Danh sách quà tặng gạch đầu dòng", exampleValue: "• Thiệp cao cấp viết tay\n• Banner in theo yêu cầu" },
  { key: "service.commitments_bullets", label: "Cam kết dịch vụ", category: "service", description: "Cam kết chất lượng cửa hàng", exampleValue: "• Sản phẩm bền trên 3 ngày\n• Chụp ảnh gửi duyệt trước khi giao" },

  // Shop
  { key: "shop.name", label: "Tên cửa hàng", category: "shop", description: "Tên thương hiệu cửa hàng", exampleValue: "Flora Boutique" },
  { key: "shop.hotline", label: "Hotline", category: "shop", description: "Số điện thoại đặt hàng", exampleValue: "0901 234 567" },
  { key: "shop.address", label: "Địa chỉ", category: "shop", description: "Địa chỉ cửa hàng", exampleValue: "123 Hai Bà Trưng, Q.1, TP.HCM" },
  { key: "shop.zalo_link", label: "Link Zalo", category: "shop", description: "Đường dẫn chat Zalo OA", exampleValue: "https://zalo.me/0901234567" },
]

/**
 * Format tiền tệ VNĐ chuẩn hóa
 */
export function formatCurrencyVnd(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "—"
  return `${amount.toLocaleString("vi-VN")}đ`
}

/**
 * Xây dựng `InterpolationContext` từ dữ liệu thực tế
 */
export function buildInterpolationContext(params: {
  productName?: string
  sku?: string
  style?: string
  flowersSummary?: string
  mainTones?: string
  wrapping?: string
  totalStems?: number
  price?: number
  originalPrice?: number
  gifts?: string[]
  commitments?: string[]
  shopName?: string
  shopHotline?: string
  shopAddress?: string
}): InterpolationContext {
  const discount =
    params.originalPrice && params.price && params.originalPrice > params.price
      ? Math.round(((params.originalPrice - params.price) / params.originalPrice) * 100)
      : undefined

  const giftsList = params.gifts && params.gifts.length > 0 ? params.gifts : ["Thiệp chúc mừng cao cấp", "Banner in theo yêu cầu", "Gói thuốc dưỡng hoa Chrysal"]
  const commitmentsList = params.commitments && params.commitments.length > 0 ? params.commitments : ["Sản phẩm mới trong ngày, bền 3-5 ngày", "Chụp ảnh sản phẩm thực tế trước khi giao", "Giao hoa hỏa tốc đúng giờ"]

  return {
    product: {
      name: params.productName || "Sản phẩm thiết kế",
      sku: params.sku || "SP-M01",
      style: params.style || "Hàn Quốc hiện đại",
    },
    flower: {
      summaryList: params.flowersSummary || "Hoa hồng nhập khẩu, hoa phụ và lá trang trí cao cấp",
      mainTones: params.mainTones || "Hồng cam pastel",
      wrapping: params.wrapping || "Giấy xốp mờ cao cấp, nơ voan",
      totalStems: params.totalStems,
    },
    pricing: {
      sellingPrice: params.price,
      sellingPriceVnd: formatCurrencyVnd(params.price),
      originalPrice: params.originalPrice,
      originalPriceVnd: formatCurrencyVnd(params.originalPrice),
      discountPercent: discount,
    },
    service: {
      giftsList,
      giftsBullets: giftsList.map((g) => `• ${g}`).join("\n"),
      commitmentsList,
      commitmentsBullets: commitmentsList.map((c) => `• ${c}`).join("\n"),
    },
    shop: {
      name: params.shopName || "Flora Boutique",
      hotline: params.shopHotline || "0901 234 567",
      address: params.shopAddress,
    },
  }
}
