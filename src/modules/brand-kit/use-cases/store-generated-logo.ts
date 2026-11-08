/**
 * Lưu logo của phương án được chọn vào Kho dữ liệu như một ảnh PNG (kho không nhận SVG). Các công cụ khác
 * (catalog, thẻ chào, in ấn, trang chia sẻ) đọc `brand_profiles.logo_asset_id` như logo tải lên.
 */
import { randomUUID } from "node:crypto"
import type { StorageProvider } from "@/core/ports"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { buildStorageKey } from "@/modules/assets/domain/storage-key"
import { checkUploadContent } from "@/modules/assets/domain/upload-content-rules"
import { getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { svgToPng } from "../adapters/svg-rasterizer"

export const LOGO_PNG_SIZE = 1024

export interface StoreLogoDeps {
  readonly storage?: StorageProvider
  readonly assets?: IAssetRepository
  readonly rasterize?: (svg: string, size: number) => Promise<Uint8Array>
}

export async function storeGeneratedLogo(ctx: TenantContext, svg: string, deps: StoreLogoDeps = {}): Promise<string> {
  const storage = deps.storage ?? getStorageProvider()
  const assets = deps.assets ?? getAssetRepository()
  const png = await (deps.rasterize ?? svgToPng)(svg, LOGO_PNG_SIZE)
  const assetId = randomUUID()
  const storageKey = buildStorageKey({ organizationId: ctx.organizationId, productId: null, assetId, extension: "png" })
  const inspection = checkUploadContent(storageKey, png)
  if (!inspection.ok) throw new Error("Logo dựng ra không phải ảnh PNG hợp lệ")
  await storage.put(storageKey, png, inspection.contentType)
  await assets.create(ctx, {
    id: assetId,
    productId: null,
    parentAssetId: null,
    kind: "MARKETING",
    version: 1,
    storageKey,
    mimeType: inspection.contentType,
    fileSize: png.byteLength,
    width: LOGO_PNG_SIZE,
    height: LOGO_PNG_SIZE,
    metadata: { title: "Logo thương hiệu", asset_type_code: "TH01", source: "brand_kit" },
    createdBy: ctx.userId,
  })
  return assetId
}
