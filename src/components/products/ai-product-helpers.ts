/**
 * Tiện ích hỗ trợ phân tích AI và làm giàu dữ liệu sản phẩm (AI Product Enrichment).
 * Kết nối Vision AI (M01/Market Intelligence) và Content Engine (M04/P27).
 */

import type { ProductPricing } from "@/modules/products/domain/product-pricing"
import { pricingAttributes } from "./pricing/pricing-form"
import { emptyUnlessRewriteBlocked } from "@/lib/ai-rewrite-error"

export const CATEGORIES = [
  "Sản phẩm",
  "Giỏ hoa",
  "Hộp hoa",
  "Kệ hoa khai trương",
  "Bình hoa",
  "Hoa chia buồn",
  "Cây cảnh / Quà tặng",
]

export const SHAPES = [
  "Tròn",
  "Tam giác",
  "Tự nhiên (phong cách Hàn Quốc)",
  "Dài, thẳng",
  "Thác nước",
  "Hình quạt",
]

export const FACINGS = ["Một mặt", "Nhiều mặt (360°)", "Hai mặt"]

export const FLOWER_ROLES = ["Chủ đạo", "Phụ", "Điểm nhấn", "Lấp đầy"]

export interface FlowerItem {
  id: string
  name: string
  quantity: number
  unit: string
  color: string
  role: string
}

export interface ProductFormValues {
  name: string
  code: string
  category: string
  shape: string
  facing: string
  container: string
  priceVnd: string
  pricing?: ProductPricing | undefined
  primaryColor: string
  description: string
  status: "ACTIVE" | "DRAFT"
  flowers: FlowerItem[]
  imageAssetId?: string | null
  imageUrl?: string | null
  driveLink?: string | null
}

export interface UploadedAsset {
  assetId: string
  storageKey: string
  viewUrl: string
}

export async function uploadImageFile(file: File): Promise<UploadedAsset> {
  const urlRes = await fetch("/api/v1/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: null, mime_type: file.type }),
  })
  if (!urlRes.ok) throw new Error("Không thể khởi tạo đường dẫn tải ảnh lên.")
  const { asset_id, storage_key, upload_url } = await urlRes.json()

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!putRes.ok) throw new Error("Tải file ảnh lên kho lưu trữ thất bại.")

  const registerRes = await fetch("/api/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset_id,
      product_id: null,
      kind: "ORIGINAL",
      storage_key,
      mime_type: file.type,
      file_size: file.size,
    }),
  })
  if (!registerRes.ok) throw new Error("Không thể ghi nhận tài nguyên ảnh vào hệ thống.")

  return {
    assetId: asset_id,
    storageKey: storage_key,
    viewUrl: `/api/v1/storage/${storage_key}`,
  }
}

export interface VisionExtractResult {
  productName?: string
  components?: Array<{
    flowerType: string
    quantityEstimate?: number
    unit?: string
    role?: string
    color?: string
  }>
  attributes?: {
    mainColors?: string[]
    secondaryColors?: string[]
    style?: string
    shape?: string
  }
  packaging?: {
    wrappingMaterial?: string
    wrappingColor?: string
    ribbon?: string
  }
  context?: {
    likelyOccasions?: string[]
    suggestedPrice?: number
  }
}

export async function callVisionExtract(assetId: string, reanalyzeKey?: string): Promise<VisionExtractResult> {
  const res = await fetch("/api/v1/market-intelligence/vision-extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset_id: assetId,
      ...(reanalyzeKey ? { reanalyze_key: reanalyzeKey } : {}),
    }),
  })
  if (!res.ok) {
    let msg = "Phân tích ảnh thất bại"
    try {
      const body = await res.json()
      msg = body.error?.message || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json()
}

/**
 * Gọi Content Engine để tạo câu chuyện và thông điệp sản phẩm sang trọng, giàu cảm xúc.
 */
export async function callContentEngineMarketing(
  summaryContext: string,
  style: "luxurious" | "sweet" | "creative" | "concise" = "luxurious"
): Promise<string[]> {
  const res = await fetch("/api/v1/content-engine/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: summaryContext, field_type: "description", style }),
  }).catch(() => null)
  if (!res) return []
  // Hết credit / thiếu quyền → ném lỗi kèm câu báo (nơi gọi hiện ra); lỗi khác vẫn trả rỗng như trước
  if (!res.ok) return emptyUnlessRewriteBlocked(res)
  const data = (await res.json().catch(() => null)) as { suggestions?: unknown } | null
  return Array.isArray(data?.suggestions) ? data.suggestions : []
}

/**
 * Suy diễn danh mục từ tên hoặc kiểu dáng
 */
function inferCategory(shapeOrName: string): string {
  const lower = shapeOrName.toLowerCase()
  if (lower.includes("giỏ") || lower.includes("lẵng nhỏ")) return "Giỏ hoa"
  if (lower.includes("bình") || lower.includes("lọ")) return "Bình hoa"
  if (lower.includes("hộp") || lower.includes("box")) return "Hộp hoa"
  if (lower.includes("kệ") || lower.includes("khai trương")) return "Kệ hoa khai trương"
  if (lower.includes("viếng") || lower.includes("chia buồn") || lower.includes("tang")) return "Hoa chia buồn"
  if (lower.includes("cây") || lower.includes("chậu")) return "Cây cảnh / Quà tặng"
  return "Sản phẩm"
}

/**
 * Ánh xạ kết quả Vision AI vào form, chỉ điền vào các ô đang trống hoặc cho phép bổ sung.
 */
export function applyVisionToForm(
  vision: VisionExtractResult,
  current: ProductFormValues
): { updated: ProductFormValues; filledFieldsCount: number } {
  let filledCount = 0
  const next = { ...current }

  // 1. Tên sản phẩm
  if (!next.name.trim() && vision.productName?.trim()) {
    next.name = vision.productName.trim()
    filledCount++
  }

  // 2. Danh mục
  if (!next.category || next.category === CATEGORIES[0]) {
    const inferred = inferCategory(`${vision.attributes?.shape ?? ""} ${vision.productName ?? ""}`)
    if (inferred !== next.category) {
      next.category = inferred
      filledCount++
    }
  }

  // 3. Kiểu dáng
  if ((!next.shape || next.shape === SHAPES[0]) && vision.attributes?.shape) {
    const shapeStr = vision.attributes.shape
    const matchedShape = SHAPES.find((s) => shapeStr.toLowerCase().includes(s.toLowerCase()))
    if (matchedShape) {
      next.shape = matchedShape
      filledCount++
    }
  }

  // 4. Vật chứa / Bao bì
  if (!next.container.trim() && vision.packaging) {
    const pkgParts = [
      vision.packaging.wrappingMaterial,
      vision.packaging.wrappingColor,
      vision.packaging.ribbon,
    ].filter(Boolean)
    if (pkgParts.length > 0) {
      next.container = pkgParts.join(", ")
      filledCount++
    }
  }

  // 5. Tông màu chủ đạo
  if (!next.primaryColor.trim() && vision.attributes?.mainColors?.length) {
    next.primaryColor = vision.attributes.mainColors.join(", ")
    filledCount++
  }

  // 6. Giá tham chiếu
  if (!next.priceVnd.trim() && vision.context?.suggestedPrice && vision.context.suggestedPrice > 0) {
    next.priceVnd = vision.context.suggestedPrice.toLocaleString("vi-VN")
    filledCount++
  }

  // 7. Thành phần hoa (BOM)
  if (vision.components && vision.components.length > 0) {
    const aiFlowers: FlowerItem[] = vision.components.map((c, idx) => ({
      id: `flower-ai-${idx}-${Date.now()}`,
      name: c.flowerType.trim(),
      quantity: c.quantityEstimate || 1,
      unit: c.unit || "cành",
      color: c.color || "Tiêu chuẩn",
      role: c.role === "dominant" ? "Chủ đạo" : c.role === "supporting" ? "Phụ" : "Điểm nhấn",
    }))

    // Nếu hiện tại chỉ có 1 dòng mẫu mặc định trống hoặc chưa có dòng nào
    const firstFlower = next.flowers[0]
    const isCurrentEmpty =
      next.flowers.length === 0 ||
      (next.flowers.length === 1 && (!firstFlower || !firstFlower.name.trim()))

    if (isCurrentEmpty) {
      next.flowers = aiFlowers
      filledCount += aiFlowers.length
    }
  }

  return { updated: next, filledFieldsCount: filledCount }
}

export interface ProductPatchAttributes extends Record<string, unknown> {
  price: number | null
  price_vnd: number | null
  description: string | null
  color: string | null
  bom: {
    flowers: Array<{ name: string; quantity: number; unit: string; color: string; role: string }>
    materials?: Array<{ name: string; quantity: number; unit: string; color: string; role: string }>
  }
  image_asset_id?: string
  imageUrl?: string
  drive_link?: string
}

export interface ProductPatchPayload {
  name: string
  code: string
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  status: "ACTIVE" | "DRAFT"
  attributes: ProductPatchAttributes
  image_asset_id?: string
}

export function buildProductPatchPayload(
  values: ProductFormValues,
  currentAttrs: Record<string, unknown>,
  finalAssetId: string | null | undefined,
  finalImageUrl: string | null | undefined
): ProductPatchPayload {
  const validFlowers = values.flowers
    .filter((f) => f.name.trim().length > 0)
    .map((f) => ({
      name: f.name.trim(),
      quantity: Number(f.quantity) || 1,
      unit: f.unit || "cành",
      color: f.color || "Tiêu chuẩn",
      role: f.role || "Chủ đạo",
    }))

  // Bảo toàn imageUrl, drive_link và imageAssetId từ values hoặc currentAttrs
  const preservedImageUrl = finalImageUrl || values.imageUrl || (currentAttrs.imageUrl as string | undefined) || undefined
  const preservedDriveLink = values.driveLink || (currentAttrs.drive_link as string | undefined) || undefined
  const preservedAssetId = finalAssetId || values.imageAssetId || (currentAttrs.image_asset_id as string | undefined) || undefined

  const mergedAttributes: ProductPatchAttributes = {
    ...currentAttrs,
    ...pricingAttributes(values.priceVnd, values.pricing),
    description: values.description.trim() || null,
    color: values.primaryColor.trim() || null,
    bom: {
      flowers: validFlowers,
      materials: validFlowers,
    },
    // Bảo toàn image_asset_id trong attributes
    ...(preservedAssetId ? { image_asset_id: preservedAssetId } : {}),
    // Bảo toàn imageUrl (storage URL hoặc URL cũ)
    ...(preservedImageUrl ? { imageUrl: preservedImageUrl } : {}),
    // Bảo toàn drive_link nếu có
    ...(preservedDriveLink ? { drive_link: preservedDriveLink } : {}),
  }

  const payload: ProductPatchPayload = {
    name: values.name.trim(),
    code: values.code.trim(),
    category: values.category?.trim() || null,
    shape: values.shape?.trim() || null,
    facing: values.facing?.trim() || null,
    container: values.container?.trim() || null,
    status: values.status === "DRAFT" ? "DRAFT" : "ACTIVE",
    attributes: mergedAttributes,
  }

  // Chỉ gửi image_asset_id khi có asset (mới tải lên hoặc đã có)
  if (preservedAssetId) {
    payload.image_asset_id = preservedAssetId
  }

  return payload
}
