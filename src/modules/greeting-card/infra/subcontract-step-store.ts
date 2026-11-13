import { randomUUID } from "node:crypto"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { delivery_status, order_status, Prisma, production_status } from "@/generated/prisma/client"

type Db = typeof prisma

/** Một dòng `order_events` (trục đổi giá trị) ghi cùng giao dịch với bước gia công. */
export interface SubcontractOrderEvent {
  axis: string // order · production · delivery (POD bỏ qua cũ ghi "status")
  fromValue: string | null
  toValue: string
  actorId: string
  reason?: string | null | undefined
}

/** Trạng thái đơn mà một bước gia công được phép đổi. */
export interface SubcontractOrderStatusPatch {
  status?: string | undefined
  production_status?: string | undefined
  delivery_status?: string | undefined
}

/** Điều kiện trạng thái HIỆN TẠI của đơn để bước gia công được ghi. */
export interface SubcontractOrderPrecondition {
  /** Đơn không được ở các trạng thái này (mặc định: đã huỷ, đã hoàn tất). */
  notStatus?: order_status[] | undefined
  productionStatus?: production_status[] | undefined
  deliveryStatus?: delivery_status[] | undefined
}

export type MetadataChange = (current: Record<string, unknown>) => Record<string, unknown>

export interface SubcontractStepWrite {
  organizationId: string
  orderId: string
  order?: SubcontractOrderStatusPatch | undefined
  /** Tính metadata MỚI từ bản đang khoá — chỉ đổi khoá của bước mình, giữ nguyên phần còn lại. */
  metadata?: MetadataChange | undefined
  events?: SubcontractOrderEvent[] | undefined
  /** Không khớp → không ghi gì, `applyStep` trả `false` (route trả 409). */
  require?: SubcontractOrderPrecondition | undefined
  /**
   * Bước làm đơn chuyển "đã xong": ghi ảnh `qc_photos` (sau khi đổi metadata) thành ảnh thành phẩm
   * của đơn — `assets` + `order_qc_records` PRODUCT_PHOTO_UPLOADED — để khách xem và duyệt trên trang
   * theo dõi như đơn 1 cửa hàng, và bước giao chờ khách duyệt (PO 22/10/2026).
   */
  recordProductPhoto?: { createdBy: string } | undefined
}

export const DEFAULT_CLOSED_ORDER_STATUSES: order_status[] = ["CANCELLED", "COMPLETED"]

/**
 * Đọc/ghi phiên gia công của một đơn: `order_coordinations.metadata`, trạng thái `orders` và
 * `order_events`. Mọi truy vấn lọc theo `organization_id` — trước đây các route gọi thẳng
 * `prisma.*` theo `order_id` (luật kiến trúc 4, test `khong-import-prisma-ngoai-infra`).
 */
export class SubcontractStepStore {
  constructor(private readonly db: Db = prisma) {}

  /** Metadata của phiên điều phối, hoặc `null` nếu đơn chưa có phiên điều phối. */
  async findMetadata(organizationId: string, orderId: string): Promise<Record<string, unknown> | null> {
    const row = await this.db.order_coordinations.findFirst({
      where: { organization_id: organizationId, order_id: orderId },
      select: { metadata: true },
    })
    if (!row) return null
    return (row.metadata as Record<string, unknown> | null) ?? {}
  }

  async readMetadata(organizationId: string, orderId: string): Promise<Record<string, unknown>> {
    return (await this.findMetadata(organizationId, orderId)) ?? {}
  }

  /**
   * Đọc–sửa–ghi metadata dưới khoá dòng (SELECT … FOR UPDATE). `change` nhận bản MỚI NHẤT và trả
   * bản mới, hoặc `null` để không ghi. Trước 22/10/2026 nơi gọi đọc từ trước (có khi trước cả một
   * lời gọi AI vài giây) rồi ghi đè cả khối JSON, làm mất thay đổi của luồng khác (rà soát cụm G).
   */
  async mutateMetadata<T = void>(
    organizationId: string,
    orderId: string,
    change: (current: Record<string, unknown>) => { next: Record<string, unknown> | null; result: T }
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      const locked = await lockCoordination(tx, organizationId, orderId)
      const { next, result } = change(locked?.metadata ?? {})
      if (next && locked) {
        await tx.order_coordinations.update({ where: { id: locked.id }, data: { metadata: next as Prisma.InputJsonValue } })
      }
      return result
    })
  }

  /**
   * Ghi một bước gia công trong MỘT giao dịch, dưới khoá dòng: kiểm điều kiện trạng thái đơn, đổi
   * trạng thái đơn, metadata, nhật ký sự kiện. Trả `false` (không ghi gì) nếu đơn không còn ở
   * trạng thái cho phép — vd. chi nhánh gửi ảnh giao hàng cho đơn vừa bị huỷ.
   */
  async applyStep(input: SubcontractStepWrite): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const locked = await lockCoordination(tx, input.organizationId, input.orderId)
      const req = input.require ?? {}
      const where: Prisma.ordersWhereInput = {
        organization_id: input.organizationId,
        id: input.orderId,
        status: { notIn: req.notStatus ?? DEFAULT_CLOSED_ORDER_STATUSES },
        ...(req.productionStatus ? { production_status: { in: req.productionStatus } } : {}),
        ...(req.deliveryStatus ? { delivery_status: { in: req.deliveryStatus } } : {}),
      }
      const hasOrderPatch = input.order && Object.keys(input.order).length > 0
      const matched = hasOrderPatch
        ? (await tx.orders.updateMany({ where, data: input.order as Prisma.ordersUpdateManyMutationInput })).count
        : await tx.orders.count({ where })
      if (matched === 0) return false

      let metadata = locked?.metadata ?? {}
      if (input.metadata && locked) {
        metadata = input.metadata(locked.metadata)
        await tx.order_coordinations.update({ where: { id: locked.id }, data: { metadata: metadata as Prisma.InputJsonValue } })
      }
      if (input.recordProductPhoto) await recordProductPhoto(tx, input.organizationId, input.orderId, metadata, input.recordProductPhoto.createdBy)
      for (const e of input.events ?? []) {
        await tx.order_events.create({
          data: {
            id: randomUUID(),
            organization_id: input.organizationId,
            order_id: input.orderId,
            axis: e.axis,
            from_value: e.fromValue,
            to_value: e.toValue,
            actor_id: e.actorId,
            reason: e.reason ?? null,
          },
        })
      }
      return true
    })
  }
}

const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" }

async function recordProductPhoto(
  tx: Prisma.TransactionClient,
  organizationId: string,
  orderId: string,
  metadata: Record<string, unknown>,
  createdBy: string
): Promise<void> {
  // Chỉ khoá trong kho của chính tổ chức (route tải ảnh đã chặn khoá lạ — chặn thêm ở đây)
  const keys = (Array.isArray(metadata.qc_photos) ? metadata.qc_photos : []).filter(
    (k): k is string => typeof k === "string" && k.startsWith(`org/${organizationId}/`)
  )
  if (keys.length === 0) return
  const assetIds: string[] = []
  for (const key of keys) {
    const id = randomUUID()
    const ext = key.split(".").pop()?.toLowerCase() ?? ""
    await tx.assets.create({
      data: { id, organization_id: organizationId, kind: "ORIGINAL", state: "READY", storage_key: key, mime_type: MIME_BY_EXT[ext] ?? "image/jpeg", created_by: createdBy, metadata: { source: "subcontract_qc", orderId } },
    })
    assetIds.push(id)
  }
  await tx.order_qc_records.create({
    data: { organization_id: organizationId, order_id: orderId, status: "PASSED", notes: "PRODUCT_PHOTO_UPLOADED", image_asset_ids: assetIds },
  })
}

async function lockCoordination(
  tx: Prisma.TransactionClient,
  organizationId: string,
  orderId: string
): Promise<{ id: string; metadata: Record<string, unknown> } | null> {
  const rows = await tx.$queryRaw<Array<{ id: string; metadata: unknown }>>`
    SELECT "id", "metadata" FROM "order_coordinations"
    WHERE "organization_id" = ${organizationId} AND "order_id" = ${orderId}
    FOR UPDATE`
  const row = rows[0]
  if (!row) return null
  const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {}
  return { id: row.id, metadata }
}
