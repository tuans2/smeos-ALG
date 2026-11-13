import { conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository, getAssetRepository } from "@/modules/assets/infra/asset-repository"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { randomUUID } from "crypto"

/**
 * `POST /media/promote-to-master` (`I2`) — Skip M04a: duyệt nhanh ảnh
 * ORIGINAL thành MASTER 1-chạm.
 *
 * Logic:
 * 1. Tìm asset gốc, kiểm tra `kind === ORIGINAL`, `organization_id` khớp.
 * 2. Tạo bản sao asset mới:
 *    - `kind = MASTER`, `approval_state = APPROVED`
 *    - `parent_asset_id = asset_id` (liên kết về gốc — đúng `YC-A1`)
 *    - Copy `storage_key` (cùng file ảnh, không duplicate file)
 * 3. Ghi audit log.
 *
 * Invariant: biến thể chỉ dựng từ MASTER. Hàm này tạo đường tắt cho user
 * không muốn qua cổng Identity Guard, nhưng vẫn giữ invariant đó.
 */
export async function promoteOriginalToMaster(
  ctx: TenantContext,
  assetId: string
): Promise<{ master_asset_id: string; approval_state: "APPROVED" }> {
  const assetRepo = getAssetRepository()
  const original = await assetRepo.findById(ctx, assetId)

  if (!original) throw notFound()

  if (original.kind !== "ORIGINAL") {
    throw validationFailed({ asset_id: "Chỉ ảnh ORIGINAL mới được promote thành MASTER" })
  }

  // Kiểm tra đã promote chưa — tránh tạo trùng
  // 23/09/2026: lọc đúng con của ảnh gốc này — bản trước chỉ đọc MASTER mới
  // nhất của CẢ tổ chức (limit 1) nên thường không thấy bản đã promote, tạo trùng.
  const existingMaster = await assetRepo.list(ctx, {
    kind: "MASTER",
    parentAssetId: original.id,
    limit: 5,
  })
  // Tìm master có parent_asset_id = original.id
  const alreadyPromoted = existingMaster.find(
    (m) => m.parent_asset_id === original.id && m.approval_state === "APPROVED"
  )
  if (alreadyPromoted) {
    return {
      master_asset_id: alreadyPromoted.id,
      approval_state: "APPROVED",
    }
  }

  const masterId = randomUUID()

  await runInTransaction(async (tx) => {
    const txRepo = getAssetRepository(tx)

    await txRepo.create(ctx, {
      id: masterId,
      productId: original.product_id,
      parentAssetId: original.id,
      kind: "MASTER",
      version: 1,
      storageKey: original.storage_key,
      thumbKey: original.thumb_key ?? null,
      mimeType: original.mime_type,
      width: original.width,
      height: original.height,
      aspectRatio: original.aspect_ratio,
      fileSize: original.file_size,
      metadata: { promoted_from: original.id, skip_m04a: true },
      createdBy: ctx.userId,
    })

    // Duyệt ngay lập tức — skip M04a = skip Identity Guard
    await txRepo.approve(ctx, masterId, {
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    })

    await recordAuditLog(
      ctx,
      {
        action: "media.promote_to_master",
        entityType: "assets",
        entityId: masterId,
        before: { kind: "ORIGINAL", asset_id: original.id },
        after: { kind: "MASTER", approval_state: "APPROVED", promoted_from: original.id },
      },
      tx
    )
  })

  return { master_asset_id: masterId, approval_state: "APPROVED" }
}
