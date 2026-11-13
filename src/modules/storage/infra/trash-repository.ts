import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedProductWhere, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { asset_state, product_status } from "@/generated/prisma/client"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import {
  calculateDaysRemaining,
  createTrashMeta,
  trashExpiresAt,
  type TrashItem,
  type TrashItemType,
} from "../domain/trash-types"

import { isUnderLegalHold } from "@/modules/assets/domain/asset-lifecycle"
import { deleteAssetAndEnqueuePayloads } from "@/modules/assets/infra/payload-outbox"
import { organizationLegalHoldUntil } from "@/modules/assets/infra/legal-hold"
import type { ITrashRepository, TrashDeleteResult } from "../domain/repositories/trash-repository.interface"

const PREVIEW_EXPIRES_IN = 86400

export class TrashRepository implements ITrashRepository {
  async listTrash(ctx: TenantContext): Promise<TrashItem[]> {
    const storage = getStorageProvider()
    const now = new Date()

    // 1. Lấy danh sách assets bị archived / trashed
    const trashedAssets = await prisma.assets.findMany({
      where: scopedWhere(ctx, {
        state: "ARCHIVED" as asset_state,
      }),
      orderBy: { created_at: "desc" },
    })

    // 2. Lấy danh sách products bị archived / trashed
    const trashedProducts = await prisma.products.findMany({
      where: scopedWhere(ctx, {
        status: "ARCHIVED" as product_status, ...branchScopedProductWhere(ctx, undefined), // chi nhánh khác không thấy (T-5b)
      }),
      include: {
        images: { where: { role: "MAIN" }, take: 1 },
      },
      orderBy: { created_at: "desc" },
    })

    const trashItems: TrashItem[] = []

    // Xử lý assets
    for (const asset of trashedAssets) {
      const meta = (asset.metadata as Record<string, unknown> | null) ?? {}
      const trashedAt =
        asset.trashed_at?.toISOString() ??
        (typeof meta.trashed_at === "string" ? meta.trashed_at : asset.created_at.toISOString())
      const expiresAt =
        asset.purge_after?.toISOString() ??
        (typeof meta.expires_at === "string"
          ? meta.expires_at
          : trashExpiresAt(new Date(trashedAt)).toISOString())

      // Quá hạn thì ẩn khỏi danh sách; xoá vĩnh viễn do cron dọn rác làm
      // (`sweep-expired-trash.ts`, có legal hold) — không xoá lúc đang đọc.
      if (new Date(expiresAt).getTime() < now.getTime()) continue

      let imageUrl: string | null = null
      if (asset.storage_key) {
        try {
          imageUrl = await storage.signedUrl(asset.storage_key, PREVIEW_EXPIRES_IN)
        } catch {
          imageUrl = null
        }
      }

      const originalName = (meta.filename as string) || (meta.name as string) || `Ảnh #${asset.id.slice(0, 8)}`

      trashItems.push({
        id: asset.id,
        type: "RAW_ASSET",
        name: originalName,
        code: null,
        imageUrl,
        trashedAt,
        trashedBy: (meta.trashed_by as string) || null,
        expiresAt,
        daysRemaining: calculateDaysRemaining(expiresAt),
        category: null,
      })
    }

    // Xử lý products
    for (const prod of trashedProducts) {
      const attrs = (prod.attributes as Record<string, unknown> | null) ?? {}
      const trashedAt = typeof attrs.trashed_at === "string" ? attrs.trashed_at : prod.updated_at.toISOString()
      const expiresAt =
        typeof attrs.expires_at === "string"
          ? attrs.expires_at
          : trashExpiresAt(new Date(trashedAt)).toISOString()

      // Tự động dọn dẹp nếu đã quá TRASH_RETENTION_DAYS
      if (new Date(expiresAt).getTime() < now.getTime()) {
        void this.permanentDelete(ctx, { id: prod.id, type: "PRODUCT" }).catch(() => {})
        continue
      }

      let imageUrl: string | null = null
      const mainImage = prod.images[0]
      if (mainImage) {
        const imgAsset = await prisma.assets.findUnique({
          where: { id: mainImage.asset_id },
          select: { storage_key: true },
        })
        if (imgAsset?.storage_key) {
          try {
            imageUrl = await storage.signedUrl(imgAsset.storage_key, PREVIEW_EXPIRES_IN)
          } catch {
            imageUrl = null
          }
        }
      }

      trashItems.push({
        id: prod.id,
        type: "PRODUCT",
        name: prod.name,
        code: prod.code,
        imageUrl,
        trashedAt,
        trashedBy: (attrs.trashed_by as string) || null,
        expiresAt,
        daysRemaining: calculateDaysRemaining(expiresAt),
        priceVnd: typeof attrs.price === "number" ? attrs.price : null,
        category: prod.category,
      })
    }

    return trashItems.sort(
      (a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime()
    )
  }

  async moveToTrash(
    ctx: TenantContext,
    input: { id: string; type: TrashItemType; userId?: string | null | undefined }
  ): Promise<boolean> {
    const trashMeta = createTrashMeta(input.userId)

    if (input.type === "RAW_ASSET") {
      const asset = await prisma.assets.findFirst({
        where: scopedWhere(ctx, { id: input.id }),
      })
      if (!asset) return false

      const existingMeta = (asset.metadata as Record<string, unknown> | null) ?? {}
      await prisma.assets.update({
        where: { id: asset.id },
        data: {
          state: "ARCHIVED" as asset_state,
          metadata: { ...existingMeta, ...trashMeta } as any,
          trashed_at: new Date(trashMeta.trashed_at),
          purge_after: new Date(trashMeta.expires_at),
        },
      })
      return true
    }

    if (input.type === "APPROVED_ANALYSIS") {
      const analysis = await prisma.product_analyses.findFirst({
        where: scopedWhere(ctx, { id: input.id }),
      })
      if (!analysis) return false

      const asset = await prisma.assets.findFirst({
        where: scopedWhere(ctx, { id: analysis.asset_id }),
      })
      if (asset) {
        const existingMeta = (asset.metadata as Record<string, unknown> | null) ?? {}
        await prisma.assets.update({
          where: { id: asset.id },
          data: {
            state: "ARCHIVED" as asset_state,
            metadata: { ...existingMeta, ...trashMeta } as any,
            trashed_at: new Date(trashMeta.trashed_at),
            purge_after: new Date(trashMeta.expires_at),
          },
        })
      }

      await prisma.product_analyses.update({
        where: { id: analysis.id },
        data: {
          approval_state: "REJECTED",
        },
      })
      return true
    }

    if (input.type === "PRODUCT") {
      const product = await prisma.products.findFirst({
        where: scopedWhere(ctx, { id: input.id, ...branchScopedProductWhere(ctx, undefined) }),
      })
      if (!product) return false

      const existingAttrs = (product.attributes as Record<string, unknown> | null) ?? {}
      await prisma.products.update({
        where: { id: product.id },
        data: {
          status: "ARCHIVED" as product_status,
          attributes: { ...existingAttrs, ...trashMeta } as any,
        },
      })
      return true
    }

    return false
  }

  async restoreFromTrash(
    ctx: TenantContext,
    input: { id: string; type: TrashItemType }
  ): Promise<boolean> {
    if (input.type === "RAW_ASSET" || input.type === "APPROVED_ANALYSIS") {
      const asset = await prisma.assets.findFirst({
        where: scopedWhere(ctx, { id: input.id }),
      })
      if (!asset) return false

      const meta = { ...((asset.metadata as Record<string, unknown> | null) ?? {}) }
      delete meta.trashed_at
      delete meta.trashed_by
      delete meta.expires_at

      await prisma.assets.update({
        where: { id: asset.id },
        data: {
          state: "READY" as asset_state,
          metadata: meta as any,
          trashed_at: null,
          purge_after: null,
        },
      })
      return true
    }

    if (input.type === "PRODUCT") {
      const product = await prisma.products.findFirst({
        where: scopedWhere(ctx, { id: input.id, ...branchScopedProductWhere(ctx, undefined) }),
      })
      if (!product) return false

      const attrs = { ...((product.attributes as Record<string, unknown> | null) ?? {}) }
      delete attrs.trashed_at
      delete attrs.trashed_by
      delete attrs.expires_at

      await prisma.products.update({
        where: { id: product.id },
        data: {
          status: "ACTIVE" as product_status,
          attributes: attrs as any,
        },
      })
      return true
    }

    return false
  }

  async findTargetAssetId(ctx: TenantContext, input: { id: string; type: TrashItemType }): Promise<string | null> {
    if (input.type === "RAW_ASSET") return input.id
    if (input.type !== "APPROVED_ANALYSIS") return null
    const analysis = await prisma.product_analyses.findFirst({ where: scopedWhere(ctx, { id: input.id }), select: { asset_id: true } })
    return analysis?.asset_id ?? null
  }

  async permanentDelete(
    ctx: TenantContext,
    input: { id: string; type: TrashItemType }
  ): Promise<TrashDeleteResult> {
    const now = new Date()
    if (isUnderLegalHold({ legal_hold_until: await organizationLegalHoldUntil(ctx.organizationId) }, now)) {
      return "legal_hold"
    }
    if (input.type === "RAW_ASSET" || input.type === "APPROVED_ANALYSIS") {
      const asset = await prisma.assets.findFirst({
        where: scopedWhere(ctx, { id: input.id }),
      })
      if (!asset) return "not_found"
      if (isUnderLegalHold(asset, now)) return "legal_hold"
      return (await deleteAssetAndEnqueuePayloads(ctx, asset, "trash.permanent_delete")) ? "deleted" : "not_found"
    }

    if (input.type === "PRODUCT") {
      const product = await prisma.products.findFirst({
        where: scopedWhere(ctx, { id: input.id, ...branchScopedProductWhere(ctx, undefined) }),
      })
      if (!product) return "not_found"
      // Mẫu đã có đơn chỉ được lưu trữ, không xoá vĩnh viễn — đơn cũ vẫn trỏ tới mẫu (checklist ALG 2.3)
      const [orderLines, bookings] = await Promise.all([
        prisma.order_items.count({ where: scopedWhere(ctx, { product_id: product.id }) }),
        prisma.product_bookings.count({ where: scopedWhere(ctx, { product_id: product.id }) }),
      ])
      if (orderLines + bookings > 0) return "in_use"

      await prisma.$transaction(async (tx) => {
        await tx.product_images.deleteMany({ where: { product_id: product.id } })
        await tx.product_variants.deleteMany({ where: { product_id: product.id } })
        await tx.product_inventory.deleteMany({ where: { product_id: product.id } })
        await tx.products.deleteMany({ where: scopedWhere(ctx, { id: product.id }) })
      })
      return "deleted"
    }

    return "not_found"
  }
}

let defaultTrashRepository: ITrashRepository | null = null

export function getTrashRepository(): ITrashRepository {
  if (!defaultTrashRepository) {
    defaultTrashRepository = new TrashRepository()
  }
  return defaultTrashRepository
}
