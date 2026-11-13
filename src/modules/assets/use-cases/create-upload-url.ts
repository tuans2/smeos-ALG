import { randomUUID } from "node:crypto"

import type { TenantContext } from "@/core/tenancy"
import { buildStorageKey, extensionForMimeType } from "@/modules/assets/domain/storage-key"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"

const UPLOAD_URL_TTL_SECONDS = 15 * 60

/**
 * `POST /assets/upload-url` (`G2`, đặc tả 06 mục 6). Tự sinh `storage_key`
 * theo `org/<organization_id>/<product_id>/<asset_id>.<ext>` — client không
 * đề xuất đường dẫn, nhận đường dẫn từ client là mở đường ghi đè chéo tổ
 * chức. `asset_id` cấp ở đây, dùng lại nguyên vẹn ở `POST /assets`
 * (`register-asset.ts`) để id bản ghi khớp với đường dẫn đã ký.
 *
 * **Luôn trả URL proxy server** (`/api/v1/storage/...`) thay vì URL ký sẵn
 * trực tiếp của R2/S3. Lý do: browser PUT thẳng lên R2 gặp lỗi CORS
 * ("Failed to fetch") vì R2 không có CORS rule cho domain Render. Server nhận
 * PUT qua route `/api/v1/storage/[...key]` rồi ghi lên kho phía sau —
 * không cần cấu hình CORS phía kho, an toàn hơn, đúng chuẩn proxy pattern.
 */
export async function createUploadUrl(
  ctx: TenantContext,
  input: { productId: string | null; mimeType: string }
) {
  const extension = extensionForMimeType(input.mimeType)
  const assetId = randomUUID()
  const storageKey = buildStorageKey({
    organizationId: ctx.organizationId,
    productId: input.productId,
    assetId,
    extension,
  })

  // Luôn dùng URL proxy server để tránh CORS khi browser PUT thẳng lên R2.
  // Route PUT /api/v1/storage/[...key] nhận file rồi server ghi lên kho sau.
  const expiresAt = Date.now() + UPLOAD_URL_TTL_SECONDS * 1000
  const signature = signStorageUrl(storageKey, expiresAt, "PUT")
  const uploadUrl = `/api/v1/storage/${storageKey}?exp=${expiresAt}&sig=${signature}`

  return {
    asset_id: assetId,
    storage_key: storageKey,
    upload_url: uploadUrl,
    expires_in: UPLOAD_URL_TTL_SECONDS,
  }
}
