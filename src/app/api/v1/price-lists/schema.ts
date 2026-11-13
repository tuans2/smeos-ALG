import { z } from "zod"

import type { PriceListInput } from "@/modules/products/domain/price-list"

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()

/** Thân yêu cầu tạo/sửa bảng giá — dùng chung cho POST và PUT. */
export const priceListBodySchema = z.object({
  name: z.string().max(200),
  heading: z.string().max(400).optional(),
  note: z.string().max(2000).optional(),
  categories: z.array(z.string().max(100)).max(50).optional(),
  product_ids: z.array(z.string().max(64)).max(500).nullable().optional(),
  valid_from: day,
  valid_to: day,
  show_peak_price: z.boolean().optional(),
  show_promotions: z.boolean().optional(),
  active: z.boolean().optional(),
})

export function toPriceListInput(d: z.infer<typeof priceListBodySchema>): PriceListInput {
  return {
    name: d.name,
    heading: d.heading?.trim() ?? "",
    note: d.note?.trim() ?? "",
    categories: d.categories ?? [],
    productIds: d.product_ids ?? null,
    validFrom: d.valid_from ?? null,
    validTo: d.valid_to ?? null,
    showPeakPrice: d.show_peak_price ?? true,
    showPromotions: d.show_promotions ?? true,
    active: d.active ?? true,
  }
}
