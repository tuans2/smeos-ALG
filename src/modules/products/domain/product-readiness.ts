/**
 * Tiêu chí đánh giá mức độ sẵn sàng bán của sản phẩm hoa (Product Readiness).
 * SSOT cho vai Product Manager (T6.1 / Role UX 03b).
 *
 * Luật thuần — không import Prisma, không phụ thuộc CSDL.
 */

export interface ProductReadinessInput {
  id: string
  name: string
  code: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" | string
  category?: string | null | undefined
  style?: string | null | undefined
  shape?: string | null | undefined
  masterImageUrl?: string | null | undefined
  pricing?: {
    quotePriceVnd?: number | null | undefined
    costPriceVnd?: number | null | undefined
  } | null | undefined
  bom?: {
    flowers?: Array<unknown> | undefined
  } | null | undefined
  /** Có bài viết bán hàng đã duyệt (checklist ALG 7.3) */
  hasApprovedCopy?: boolean | undefined
}

export interface ProductReadinessResult {
  productId: string
  productCode: string
  productName: string
  isReady: boolean
  score: number // 0 đến 100%
  missingReasons: string[]
  criteria: {
    hasActiveStatus: boolean
    hasMasterImage: boolean
    hasCategory: boolean
    hasPricingOrBom: boolean
    hasApprovedCopy: boolean
  }
}

/**
 * Đánh giá một sản phẩm hoa đã đủ điều kiện thương mại sẵn sàng bán hay chưa.
 * Mỗi tiêu chí đóng góp 20% trọng số (tổng 100 điểm):
 * 1. Trạng thái ACTIVE
 * 2. Đã có ảnh chính thức
 * 3. Đã có phân loại danh mục
 * 4. Đã có công thức chế tác (BOM) hoặc giá bán niêm yết
 * 5. Đã có bài viết bán hàng được duyệt (checklist ALG 7.3)
 */
export function computeProductReadiness(product: ProductReadinessInput): ProductReadinessResult {
  const missingReasons: string[] = []

  const hasActiveStatus = product.status === "ACTIVE"
  if (!hasActiveStatus) {
    missingReasons.push("Sản phẩm chưa kích hoạt (đang ở trạng thái Nháp hoặc Lưu trữ)")
  }

  const hasMasterImage = Boolean(product.masterImageUrl && product.masterImageUrl.trim().length > 0)
  if (!hasMasterImage) {
    missingReasons.push("Thiếu ảnh sản phẩm chính thức")
  }

  const hasCategory = Boolean(product.category && product.category.trim().length > 0)
  if (!hasCategory) {
    missingReasons.push("Chưa phân loại danh mục (Sản phẩm, Giỏ hoa, Kệ khai trương...)")
  }

  const hasQuotePrice = typeof product.pricing?.quotePriceVnd === "number" && product.pricing.quotePriceVnd > 0
  const hasCostPrice = typeof product.pricing?.costPriceVnd === "number" && product.pricing.costPriceVnd > 0
  const hasBomFlowers = Array.isArray(product.bom?.flowers) && product.bom.flowers.length > 0
  const hasPricingOrBom = hasQuotePrice || hasCostPrice || hasBomFlowers

  if (!hasPricingOrBom) {
    missingReasons.push("Chưa có giá niêm yết hoặc công thức thành phần (BOM)")
  }

  const hasApprovedCopy = product.hasApprovedCopy === true
  if (!hasApprovedCopy) {
    missingReasons.push("Chưa có bài viết bán hàng được duyệt")
  }

  const score = [hasActiveStatus, hasMasterImage, hasCategory, hasPricingOrBom, hasApprovedCopy].filter(Boolean).length * 20

  return {
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    isReady: missingReasons.length === 0,
    score,
    missingReasons,
    criteria: {
      hasActiveStatus,
      hasMasterImage,
      hasCategory,
      hasPricingOrBom,
      hasApprovedCopy,
    },
  }
}

/** Danh sách còn thiếu khi mở bán (bỏ tiêu chí trạng thái) — chỉ cảnh báo, không chặn (PO 05/11/2026). */
export function activationWarnings(product: ProductReadinessInput): string[] {
  return computeProductReadiness({ ...product, status: "ACTIVE" }).missingReasons
}
