import {
  parsePricing,
  serializePricing,
  validatePricing,
  type ProductPricing,
} from "@/modules/products/domain/product-pricing"

export const EMPTY_PRICING: ProductPricing = parsePricing({})

export function parseVndInput(v: string): number | null {
  const n = Number(v.replace(/\D/g, ""))
  return n > 0 ? n : null
}

export function formatVndInput(v: number | null): string {
  return v === null ? "" : v.toLocaleString("vi-VN")
}

/**
 * Thuộc tính giá để lưu vào `products.attributes`. Giá xác định lấy từ ô "Giá niêm yết"
 * (`priceVnd`) để giữ nguyên luồng AI gợi ý giá. Sai → ném lỗi tiếng Việt cho form hiển thị.
 */
export function pricingAttributes(priceVnd: string, pricing: ProductPricing | undefined): ReturnType<typeof serializePricing> {
  const p: ProductPricing = { ...(pricing ?? EMPTY_PRICING), priceVnd: parseVndInput(priceVnd) }
  const errors = validatePricing(p)
  if (errors.length > 0) throw new Error(errors[0])
  return serializePricing(p)
}
