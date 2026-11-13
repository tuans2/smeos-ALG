/**
 * Use-case: Lưu poster/banner đã dựng vào Kho dữ liệu (assets).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-1 (1.2).
 * Quyền: G2 (asset.upload).
 * Trạng thái: kind = MARKETING, approval_state = PENDING, metadata.asset_type_code.
 */

import { randomUUID } from "node:crypto"
import { validationFailed } from "@/core/http/errors"
import type { StorageProvider } from "@/core/ports"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { buildStorageKey } from "@/modules/assets/domain/storage-key"
import { checkUploadContent } from "@/modules/assets/domain/upload-content-rules"
import { getAssetRepository } from "@/modules/assets/infra/asset-repository"

export interface SaveBannerInput {
  title: string
  assetTypeCode: string
  imageData: string
  productId?: string | null | undefined
  width?: number | null | undefined
  height?: number | null | undefined
  metadata?: Record<string, unknown> | null | undefined
}

export interface SaveBannerResult {
  assetId: string
  title: string
  storageKey: string
  assetTypeCode: string
  approvalState: "PENDING"
}

export async function saveBannerToLibraryUseCase(
  ctx: TenantContext,
  input: SaveBannerInput,
  deps: {
    assetRepo?: IAssetRepository
    storage?: StorageProvider
  } = {},
): Promise<SaveBannerResult> {
  const assetRepo = deps.assetRepo ?? getAssetRepository()
  const storage = deps.storage ?? getStorageProvider()

  if (!input.title?.trim()) {
    throw validationFailed({ title: "Tiêu đề không được để trống" })
  }
  if (!input.assetTypeCode?.trim()) {
    throw validationFailed({ assetTypeCode: "Mã loại asset không hợp lệ" })
  }
  if (!input.imageData) {
    throw validationFailed({ imageData: "Dữ liệu hình ảnh không hợp lệ" })
  }

  // 1. Tách chuỗi Base64
  let base64Data = input.imageData
  const match = input.imageData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
  if (match && match[2]) {
    base64Data = match[2]
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64Data, "base64")
  } catch {
    throw validationFailed({ imageData: "Chuỗi Base64 không hợp lệ" })
  }

  if (buffer.byteLength === 0) {
    throw validationFailed({ imageData: "Dữ liệu hình ảnh rỗng" })
  }

  const assetId = randomUUID()
  const storageKey = buildStorageKey({
    organizationId: ctx.organizationId,
    productId: input.productId ?? null,
    assetId,
    extension: "png",
  })

  // 2. Kiểm tra tính hợp lệ của nội dung PNG (magic bytes + dung lượng <= 20MB)
  const inspection = checkUploadContent(storageKey, new Uint8Array(buffer))
  if (!inspection.ok) {
    throw validationFailed({
      imageData:
        inspection.reason === "too_large"
          ? "Kích thước ảnh vượt quá 20MB"
          : "Nội dung tệp không đúng định dạng ảnh PNG hợp lệ",
    })
  }

  // 3. Đưa vào Storage Provider theo cổng chuẩn
  await storage.put(storageKey, new Uint8Array(buffer), inspection.contentType)

  // 4. Lưu bản ghi vào bảng assets với approval_state = PENDING
  await assetRepo.create(ctx, {
    id: assetId,
    productId: input.productId ?? null,
    parentAssetId: null,
    kind: "MARKETING",
    version: 1,
    storageKey,
    mimeType: inspection.contentType,
    fileSize: buffer.byteLength,
    width: input.width ?? null,
    height: input.height ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      title: input.title.trim(),
      asset_type_code: input.assetTypeCode.trim(),
    },
    createdBy: ctx.userId,
  })

  return {
    assetId,
    title: input.title.trim(),
    storageKey,
    assetTypeCode: input.assetTypeCode.trim(),
    approvalState: "PENDING",
  }
}

