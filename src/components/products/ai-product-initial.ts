import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"
import type { BomItem } from "./create-product-types"
import type { ProductFormValues } from "./ai-product-helpers"
import { parsePricing } from "@/modules/products/domain/product-pricing"

export interface InitialProductInput {
  id: string
  name: string
  code: string
  category: string | null
  shape: string | null
  facing?: string | null | undefined
  container?: string | null | undefined
  status: "ACTIVE" | "DRAFT" | "PAUSED" | "ARCHIVED"
  attributes?: Record<string, unknown> | null | undefined
  masterImageUrl?: string | undefined
  price_vnd?: number | null | undefined
  driveLink?: string | undefined
}

/**
 * Trích xuất các giá trị form ban đầu từ dữ liệu sản phẩm CSDL
 * Hỗ trợ nhận diện đầy đủ: storage image, imageUrl, và link Google Drive.
 * Đọc BOM linh hoạt từ cả `attributes.bom.materials` (chuẩn mới) lẫn `attributes.bom.flowers` (kế thừa).
 */
export function extractInitialFormValues(
  product: InitialProductInput,
  defaultCategory?: string,
  defaultShape?: string,
  defaultFacing?: string
): {
  values: ProductFormValues
  previewUrl: string | null
} {
  const attrs = (product.attributes as Record<string, unknown> | null) ?? {}
  const rawBom = (attrs.bom as Record<string, unknown> | undefined) ?? {}
  
  // Đọc từ materials trước, nếu không có thì đọc flowers
  const rawList = Array.isArray(rawBom.materials)
    ? rawBom.materials
    : Array.isArray(rawBom.flowers)
    ? rawBom.flowers
    : []

  const bomItems: BomItem[] = rawList.map((f: unknown, i: number) => {
    const row = (f as Record<string, unknown>) ?? {}
    const item: BomItem = {
      id: `bom-init-${i}-${Date.now()}`,
      name: String(row.name ?? ""),
      quantity: Number(row.quantity ?? 1),
      unit: String(row.unit ?? "cái"),
      color: String(row.color ?? ""),
      role: String(row.role ?? "Chủ đạo"),
    }
    if (typeof row.notes === "string" && row.notes) {
      item.notes = row.notes
    }
    return item
  })

  const initialPrice =
    typeof attrs.price === "number" && attrs.price > 0
      ? attrs.price.toLocaleString("vi-VN")
      : typeof product.price_vnd === "number" && product.price_vnd > 0
      ? product.price_vnd.toLocaleString("vi-VN")
      : ""

  const assetId = (attrs.image_asset_id as string) ?? null
  const driveLink = product.driveLink || (typeof attrs.drive_link === "string" ? attrs.drive_link : null)
  const existingUrl =
    product.masterImageUrl ||
    (typeof attrs.imageUrl === "string" ? attrs.imageUrl : null) ||
    (driveLink ? driveThumbProxySrc(driveLink) : null)

  const values: ProductFormValues = {
    name: product.name || "",
    code: product.code || "",
    category: product.category || defaultCategory || "",
    shape: product.shape || defaultShape || "",
    facing: product.facing || defaultFacing || "",
    container: product.container || "",
    priceVnd: initialPrice,
    pricing: parsePricing(attrs),
    primaryColor: (attrs.color as string) || "",
    description: (attrs.description as string) || "",
    status: product.status === "DRAFT" ? "DRAFT" : "ACTIVE",
    flowers: bomItems.length > 0 ? bomItems : [],
    imageAssetId: assetId,
    imageUrl: existingUrl,
    driveLink,
  }

  return { values, previewUrl: existingUrl }
}
