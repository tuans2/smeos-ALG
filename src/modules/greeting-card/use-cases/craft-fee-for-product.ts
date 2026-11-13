/** Phí chế tác theo kiểu dáng của một mẫu, theo ngành và cài đặt của cửa hàng (PO Q8, checklist ALG 3.6). */

import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { craftFeeFor, resolveCraftStyles, resolveHolidayMultiplier, type CraftFeeBreakdown } from "../domain/craft-style-fee"

export function craftFeeForProduct(styleKey: string | null | undefined, shopSettings: unknown, isHoliday: boolean): CraftFeeBreakdown | null {
  if (!styleKey) return null
  const settings = shopSettings && typeof shopSettings === "object" ? (shopSettings as Record<string, unknown>) : {}
  const spec = getIndustryPlugin(typeof settings.industry === "string" ? settings.industry : null).craftFee
  if (!spec?.styles) return null
  return craftFeeFor(styleKey, resolveCraftStyles(spec.styles, settings), resolveHolidayMultiplier(spec.holidayMultiplier, settings), isHoliday)
}
