/**
 * industries/index.ts — Registry trung tâm của toàn bộ các ngành trên ALG
 *
 * Để mở rộng một ngành mới trong tương lai:
 * 1. Tạo file mới trong thư mục này tuân thủ `IndustryPluginContract`
 * 2. Đăng ký vào `INDUSTRY_REGISTRY` dưới đây.
 * Toàn bộ hệ thống sẽ tự động nhận diện mà không cần chỉnh sửa code rải rác.
 */

import type { IndustryPluginContract } from "../industry-plugin-contract"
import { FLORAL_INDUSTRY } from "./floral"
import { FASHION_INDUSTRY } from "./fashion"
import { FNB_INDUSTRY } from "./fnb"
import { CRAFT_GIFT_INDUSTRY } from "./craft-gift"
import { RETAIL_GENERAL_INDUSTRY } from "./retail-general"
import { SERVICES_INDUSTRY } from "./services"
import { HOMESTAY_INDUSTRY } from "./homestay"

export const INDUSTRY_REGISTRY: Record<string, IndustryPluginContract> = {
  FLORAL: FLORAL_INDUSTRY,
  FASHION: FASHION_INDUSTRY,
  FNB: FNB_INDUSTRY,
  CRAFT_GIFT: CRAFT_GIFT_INDUSTRY,
  RETAIL_GENERAL: RETAIL_GENERAL_INDUSTRY,
  SERVICES: SERVICES_INDUSTRY,
  HOMESTAY: HOMESTAY_INDUSTRY,
}

export {
  FLORAL_INDUSTRY,
  FASHION_INDUSTRY,
  FNB_INDUSTRY,
  CRAFT_GIFT_INDUSTRY,
  RETAIL_GENERAL_INDUSTRY,
  SERVICES_INDUSTRY,
  HOMESTAY_INDUSTRY,
}
