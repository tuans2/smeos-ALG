/**
 * Ranh giới dữ liệu của một lượt tra cứu sản phẩm — M03, P6. Giữ lại đúng
 * HÌNH DẠNG của `FloraOS/floraos-web/src/lib/locTraCuu.ts` (thu hoạch R,
 * REUSE theo `HARVEST_MANIFEST.md`): kê tên trường được đi ra (không xoá
 * theo danh sách cấm), rồi cắt theo mã năng lực.
 *
 * Bản gốc lọc một BẢN GHI GIÁ ĐÃ TÍNH SẴN theo từng mã sản phẩm (giá bán công
 * bố, khoảng giá chào khách, giá đối tác…) — dữ liệu đó chỉ có khi luồng "thẻ
 * chào giá" tồn tại, ngoài phạm vi P6 (xác nhận 09/10, xem `pricing.ts`).
 * Ở đây, phần "giá" duy nhất còn lại trong phạm vi P6 là CẤU HÌNH giá của tổ
 * chức (`pricing_rules` — `partner_tier_bonus`/`surcharge_groups`/
 * `optimal_price_ratio`/`floor_ceiling_ratio`), không phải một mức giá đã
 * tính cho một sản phẩm cụ thể. Luật cắt giữ nguyên tinh thần bản gốc: kê tên
 * trường sản phẩm luôn đi ra, khối `pricing` chỉ đi ra khi năng lực `L5`
 * (`pricing.read`) có mặt — đúng bảng ở đặc tả 06 mục 6 (`GET /pricing-rules`
 * gác bằng `L5`).
 */

import type { FloorCeilingRatio, PricingRuleRow } from "./pricing-rules"
import { mergeEffectiveFloorCeilingRatio, mergeEffectivePricingConfig } from "./pricing-rules"
import { commerceFromRow, redactCommerce, type ProductCommerceFields } from "./product-commerce"

export interface ProductLookupRaw {
  id: string
  code: string
  name: string
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  status: string
  branch_id: string | null
  /**
   * URL ảnh chính của sản phẩm — `/api/v1/storage/<storage_key>` nếu có ảnh MAIN,
   * `undefined` khi sản phẩm chưa có ảnh. Không bịa placeholder URL tại domain.
   */
  masterImageUrl?: string | undefined
  /**
   * Giá tham chiếu của sản phẩm (đọc từ `products.attributes.price` hoặc variant đầu tiên).
   * `null` = chưa có giá niêm yết — giao diện hiển thị "Liên hệ", tuyệt đối không hiển thị 0đ.
   */
  price_vnd: number | null
  /**
   /** Link Google Drive của thư mục ảnh — `undefined` khi không có.
   * Dùng để hiển thị thumbnail Drive trong trường hợp sản phẩm chưa có ảnh lưu trữ.
   */
  driveLink?: string | undefined
  attributes?: Record<string, unknown> | null
  availability_config?: unknown
  /** Cột bán hàng chuẩn (mã vạch, giá vốn, VAT, khối lượng, thẻ) — vắng thì coi như chưa khai. */
  commerce?: Partial<ProductCommerceFields> | undefined
}

export interface ProductPricingSummary {
  partner_tier_bonus: Record<string, number>
  surcharge_groups: unknown[]
  optimal_price_ratio: number
  floor_ceiling_ratio: FloorCeilingRatio
}

export interface ProductLookupResult {
  id: string
  code: string
  name: string
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  status: string
  branch_id: string | null
  /** URL ảnh chính — `undefined` khi chưa có ảnh. */
  masterImageUrl?: string | undefined
  /** Giá tham chiếu — `null` nghĩa là "Liên hệ để báo giá", không phải 0đ. */
  price_vnd: number | null
  /** Link Google Drive của thư mục ảnh (import Excel). `undefined` khi không có. */
  driveLink?: string | undefined
  /** `null` khi năng lực `L5` không có mặt — khác `null` do tổ chức chưa cấu hình. */
  pricing: ProductPricingSummary | null
  /** Kê tên khối bị cắt, để giao diện viết đúng câu — tương ứng `bi_cat` bản gốc. */
  redacted_fields: string[]
  attributes?: Record<string, unknown> | null | undefined
  availability_config?: unknown
  /** Giá vốn `null` + có trong `redacted_fields` khi thiếu `L5`. */
  commerce: ProductCommerceFields
}

/**
 * Khoá trong `attributes` chỉ người có `L5` (`pricing.read`) được thấy: thành phần hoa (BOM — lộ
 * công thức/giá vốn), giá sàn/trần nội bộ và phí làm thay của mẫu (`craft_fee_vnd`). Giá bán niêm yết (`price`, `price_vnd`) vẫn đi ra để
 * Sale tư vấn khách (PO 14/10/2026).
 */
export const PRICING_ONLY_ATTRIBUTE_KEYS = ["bom", "priceGuard", "craft_fee_vnd"] as const

/**
 * Lọc một bản ghi sản phẩm theo năng lực của người xem. Kê tên trường sản
 * phẩm luôn đi ra nguyên vẹn; khối `pricing` cắt theo `canReadPricing` (`L5`).
 * `masterImageUrl` và `price_vnd` luôn đi ra (không nhạy cảm).
 */
export function filterProductLookup(
  product: ProductLookupRaw,
  pricingRuleRows: PricingRuleRow[],
  options: { canReadPricing: boolean; branchId: string | null }
): ProductLookupResult {
  const redactedFields: string[] = []

  let pricing: ProductPricingSummary | null = null
  if (options.canReadPricing) {
    const config = mergeEffectivePricingConfig(pricingRuleRows, options.branchId)
    pricing = {
      partner_tier_bonus: config.partnerTierBonus,
      surcharge_groups: config.surchargeGroups,
      optimal_price_ratio: config.optimalPriceRatio,
      floor_ceiling_ratio: mergeEffectiveFloorCeilingRatio(pricingRuleRows, options.branchId),
    }
  } else {
    redactedFields.push("pricing")
  }

  let attributes = product.attributes ?? null
  if (!options.canReadPricing && attributes) {
    const hidden = PRICING_ONLY_ATTRIBUTE_KEYS.filter((k) => k in attributes!)
    if (hidden.length > 0) {
      attributes = Object.fromEntries(
        Object.entries(attributes).filter(([k]) => !(PRICING_ONLY_ATTRIBUTE_KEYS as readonly string[]).includes(k))
      )
      redactedFields.push(...hidden)
    }
  }

  const { commerce, redacted } = redactCommerce(commerceFromRow(product.commerce ?? {}), options.canReadPricing)
  redactedFields.push(...redacted)

  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category: product.category,
    shape: product.shape,
    facing: product.facing,
    container: product.container,
    status: product.status,
    branch_id: product.branch_id,
    masterImageUrl: product.masterImageUrl ?? ((product.attributes?.imageUrl) as string | undefined),
    price_vnd: product.price_vnd ?? ((product.attributes?.price_vnd ?? product.attributes?.price) as number | null) ?? null,
    driveLink: product.driveLink ?? ((product.attributes?.drive_link) as string | undefined),
    attributes,
    pricing,
    redacted_fields: redactedFields,
    availability_config: product.availability_config,
    commerce,
  }
}
