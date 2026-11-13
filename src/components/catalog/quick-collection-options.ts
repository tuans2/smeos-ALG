/** Lựa chọn nhanh của "Tạo nhanh bộ sưu tập": dịp tặng, dáng hoa, nguyên liệu, tone màu, khung giá. */

export const COMMON_OCCASIONS = [
  "Sinh nhật",
  "Khai trương",
  "Kỷ niệm",
  "Chúc mừng",
  "Cảm ơn",
  "Chia buồn",
]

export const COMMON_CATEGORIES = [
  "Sản phẩm",
  "Giỏ hoa",
  "Kệ hoa",
  "Lẵng hoa",
  "Hộp hoa",
  "Bình hoa",
]

export const COMMON_FLOWERS = [
  "Hoa hồng",
  "Lan hồ điệp",
  "Hướng dương",
  "Cẩm tú cầu",
  "Baby",
  "Cúc tana",
]

export const COMMON_COLORS = [
  "Pastel",
  "Đỏ",
  "Vàng / Cam",
  "Hồng",
  "Trắng",
  "Xanh / Tím",
]

import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

export interface IndustryQuickCollectionOptions {
  occasions: readonly string[]
  categories: readonly string[]
  materials: readonly string[]
  colors: readonly string[]
}

export function getIndustryQuickCollectionOptions(industryKey?: string | null): IndustryQuickCollectionOptions {
  const plugin = getIndustryPlugin(industryKey)
  const occasions = plugin.taxonomy.occasions.length > 0
    ? plugin.taxonomy.occasions.map((o) => o.label)
    : COMMON_OCCASIONS

  const categories = plugin.taxonomy.defaultCategories.length > 0
    ? plugin.taxonomy.defaultCategories.map((c) => c.label)
    : COMMON_CATEGORIES

  const materials = plugin.aiConfig.sampleProductNames.length > 0
    ? plugin.aiConfig.sampleProductNames.slice(0, 6)
    : COMMON_FLOWERS

  return {
    occasions,
    categories,
    materials,
    colors: COMMON_COLORS,
  }
}


