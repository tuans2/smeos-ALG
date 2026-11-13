/**
 * Product Size Variants & Dynamic BOM Scaling Engine (SP-12, SP-13, SP-14).
 * Pure TypeScript Domain - Không phụ thuộc Prisma hay UI.
 * Tự động co giãn công thức cành Atomic BOM theo tỷ lệ kích thước Size S, M, L, XL.
 */

export type ProductSizeKey = "SIZE_S" | "SIZE_M" | "SIZE_L" | "SIZE_XL"

export interface SizeVariantConfig {
  key: ProductSizeKey
  label: string
  shortLabel: string
  scaleMultiplier: number
  description: string
  badgeTone: "neutral" | "accent" | "success" | "warning"
}

export const SIZE_VARIANT_CONFIGS: Record<ProductSizeKey, SizeVariantConfig> = {
  SIZE_S: {
    key: "SIZE_S",
    label: "Size S (Nhỏ gọn / Tiết kiệm)",
    shortLabel: "Size S",
    scaleMultiplier: 0.7,
    description: "Kích thước gọn gàng, phù hợp để bàn làm việc hoặc ngân sách tiết kiệm",
    badgeTone: "neutral",
  },
  SIZE_M: {
    key: "SIZE_M",
    label: "Size M (Tiêu chuẩn / Cân đối)",
    shortLabel: "Size M",
    scaleMultiplier: 1.0,
    description: "Kích thước chuẩn của nghệ nhân, cân đối và hài hòa nhất",
    badgeTone: "accent",
  },
  SIZE_L: {
    key: "SIZE_L",
    label: "Size L (Lớn / Sang trọng)",
    shortLabel: "Size L",
    scaleMultiplier: 1.4,
    description: "Dáng hoa to hoành tráng, nhiều hoa chính hơn, tạo ấn tượng mạnh",
    badgeTone: "success",
  },
  SIZE_XL: {
    key: "SIZE_XL",
    label: "Size XL (Đại / VIP Lộng lẫy)",
    shortLabel: "Size XL",
    scaleMultiplier: 1.8,
    description: "Phiên bản đại tiệc VIP, mật độ hoa dày dặn và lộng lẫy tối đa",
    badgeTone: "warning",
  },
}

export interface AtomicStemItem {
  id: string
  name: string
  quantity: number
  unit: string // cành, nhánh, bông, cuộn
  unitCostVnd: number
  color?: string | undefined
  isMainFlower?: boolean | undefined
}

export interface ScaledBOMResult {
  sizeKey: ProductSizeKey
  config: SizeVariantConfig
  stems: AtomicStemItem[]
  totalStemsCount: number
  mainStemsCount: number
  totalCostVnd: number
  suggestedSellingPriceVnd: number
  summaryText: string
}

/**
 * Co giãn công thức cành Atomic BOM theo tỷ lệ kích thước
 */
export function scaleBOMForSize(
  baseStems: AtomicStemItem[],
  targetSize: ProductSizeKey,
  markupRatio = 2.4, // Hệ số giá bán / giá vốn chuẩn ngành hoa (2.4x)
): ScaledBOMResult {
  const config = SIZE_VARIANT_CONFIGS[targetSize]
  const multiplier = config.scaleMultiplier

  const scaledStems: AtomicStemItem[] = baseStems.map((stem) => {
    // Nếu là phụ liệu (cuộn, tấm, bình), không nhân tỷ lệ quá đà
    const isAccessory = ["cuộn", "tấm", "bình", "hộp", "giỏ"].includes(stem.unit.toLowerCase())
    let newQty: number

    if (isAccessory) {
      newQty = stem.quantity // Giữ nguyên 1 giỏ/hộp hoặc giấy gói
    } else {
      newQty = Math.max(1, Math.round(stem.quantity * multiplier))
    }

    return {
      ...stem,
      quantity: newQty,
    }
  })

  let totalCost = 0
  let totalStems = 0
  let mainStems = 0

  for (const item of scaledStems) {
    totalCost += item.quantity * item.unitCostVnd
    const isFlower = ["cành", "nhánh", "bông"].includes(item.unit.toLowerCase())
    if (isFlower) {
      totalStems += item.quantity
      if (item.isMainFlower) {
        mainStems += item.quantity
      }
    }
  }

  // Làm tròn giá bán đến hàng chục nghìn
  const rawSellingPrice = totalCost * markupRatio
  const roundedSellingPrice = Math.round(rawSellingPrice / 10_000) * 10_000

  const summary = `${config.shortLabel}: ${mainStems} thành phần chính (${totalStems} thành phần tổng cộng)`

  return {
    sizeKey: targetSize,
    config,
    stems: scaledStems,
    totalStemsCount: totalStems,
    mainStemsCount: mainStems,
    totalCostVnd: totalCost,
    suggestedSellingPriceVnd: roundedSellingPrice,
    summaryText: summary,
  }
}

/**
 * Tính toán toàn bộ 4 kích thước cùng lúc để nhân viên tư vấn so sánh trực tiếp
 */
export function calculateAllSizes(
  baseStems: AtomicStemItem[],
  markupRatio = 2.4,
): Record<ProductSizeKey, ScaledBOMResult> {
  return {
    SIZE_S: scaleBOMForSize(baseStems, "SIZE_S", markupRatio),
    SIZE_M: scaleBOMForSize(baseStems, "SIZE_M", markupRatio),
    SIZE_L: scaleBOMForSize(baseStems, "SIZE_L", markupRatio),
    SIZE_XL: scaleBOMForSize(baseStems, "SIZE_XL", markupRatio),
  }
}
