/**
 * Tin đăng và đơn của kênh bán (GĐ4A). Truy vấn theo phiên đi qua `scopedWhere`; hàm `*System` chỉ
 * dùng từ lượt xử lý sự kiện, với `organizationId` lấy từ chính kết nối đã xác thực.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_ORGANIZATION_ONLY } from "@/modules/organization/infra/active-organization-filter"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { ListingStatus, ListingView, ChannelOrderView } from "../domain/integration-views"

export type { ListingStatus, ListingView, ChannelOrderView }

/** Lượt nhập đơn đang chạy quá ngần này coi như đã chết — cho lượt sau nhận lại. */
export const STALE_IMPORT_CLAIM_MS = 15 * 60_000

export class SalesChannelRepository {
  async listListings(ctx: TenantContext, connectionId: string, productIds?: readonly string[]): Promise<ListingView[]> {
    const rows = await prisma.sales_channel_listings.findMany({
      where: scopedWhere(ctx, { connection_id: connectionId, ...(productIds ? { product_id: { in: [...productIds] } } : {}) }),
      orderBy: { updated_at: "desc" },
      take: 100,
    })
    return rows.map((r) => ({
      productId: r.product_id,
      externalId: r.external_id,
      status: r.status,
      lastError: r.last_error,
      lastSyncedAt: r.last_synced_at?.toISOString() ?? null,
    }))
  }

  async saveListing(
    ctx: TenantContext,
    connectionId: string,
    input: { productId: string; status: ListingStatus; externalId?: string | null; lastError?: string | null; at: Date }
  ): Promise<void> {
    const data = {
      status: input.status,
      last_error: input.lastError ?? null,
      last_synced_at: input.at,
      ...(input.externalId !== undefined ? { external_id: input.externalId } : {}),
    }
    await prisma.sales_channel_listings.upsert({
      where: { connection_id_product_id: { connection_id: connectionId, product_id: input.productId } },
      create: { organization_id: ctx.organizationId, connection_id: connectionId, product_id: input.productId, ...data },
      update: data,
    })
  }

  /**
   * Tồn theo số lượng của các sản phẩm (PO Q9): sản phẩm có dòng `product_inventory` với `quantity_available` khác rỗng
   * là đang theo dõi; trả tổng số còn của mọi chi nhánh. Sản phẩm không theo dõi không có trong kết quả.
   */
  async trackedStock(ctx: TenantContext, productIds: readonly string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map()
    const rows = await prisma.product_inventory.groupBy({
      by: ["product_id"],
      where: scopedWhere(ctx, { product_id: { in: [...productIds] }, quantity_available: { not: null } }),
      _sum: { quantity_available: true },
    })
    return new Map(rows.map((r) => [r.product_id, r._sum?.quantity_available ?? 0]))
  }

  async listOrders(ctx: TenantContext, connectionId: string, limit: number): Promise<ChannelOrderView[]> {
    const rows = await prisma.sales_channel_orders.findMany({
      where: scopedWhere(ctx, { connection_id: connectionId }),
      orderBy: { created_at: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    })
    return rows.map((r) => ({
      externalOrderId: r.external_order_id,
      orderId: r.order_id,
      status: r.status,
      errorCode: r.error_code,
      createdAt: r.created_at.toISOString(),
    }))
  }

  /**
   * Giữ chỗ mã đơn ngoài trước khi tạo đơn — unique (kết nối, mã đơn) chặn hai lượt cùng tạo.
   * false = đơn đã được nhận (trùng).
   */
  async claimOrderSystem(organizationId: string, connectionId: string, externalOrderId: string): Promise<boolean> {
    try {
      await prisma.sales_channel_orders.create({
        data: { organization_id: organizationId, connection_id: connectionId, external_order_id: externalOrderId, status: "FAILED", error_code: "IN_PROGRESS" },
      })
      return true
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        // Lượt trước lỗi giữa chừng → cho nhận lại; đã IMPORTED → trùng. Lượt trước chết khi đang nhập (kẹt IN_PROGRESS quá
        // hạn) cũng nhận lại — trước đây bị coi là "đã nhận" và đơn sàn mất lặng lẽ (audit BL-34)
        const staleBefore = new Date(Date.now() - STALE_IMPORT_CLAIM_MS)
        const res = await prisma.sales_channel_orders.updateMany({
          where: {
            connection_id: connectionId, external_order_id: externalOrderId, status: "FAILED",
            OR: [{ NOT: { error_code: "IN_PROGRESS" } }, { error_code: "IN_PROGRESS", updated_at: { lt: staleBefore } }],
          },
          data: { error_code: "IN_PROGRESS" },
        })
        return res.count === 1
      }
      throw err
    }
  }

  async finishOrderSystem(connectionId: string, externalOrderId: string, outcome: { orderId: string } | { errorCode: string }) {
    await prisma.sales_channel_orders.update({
      where: { connection_id_external_order_id: { connection_id: connectionId, external_order_id: externalOrderId } },
      data: "orderId" in outcome ? { status: "IMPORTED", order_id: outcome.orderId, error_code: null } : { status: "FAILED", error_code: outcome.errorCode.slice(0, 64) },
    })
  }

  /** Sản phẩm của tổ chức theo SKU (`products.code`) — để nối dòng đơn sàn về sản phẩm. */
  async productIdsBySkuSystem(organizationId: string, skus: readonly string[]): Promise<Map<string, string>> {
    if (skus.length === 0) return new Map()
    const rows = await prisma.products.findMany({
      where: { organization_id: organizationId, code: { in: [...skus].slice(0, 100) } },
      select: { id: true, code: true },
    })
    return new Map(rows.map((r) => [r.code, r.id]))
  }

  async cursorSystem(organizationId: string, connectionId: string, resource: string): Promise<string | null> {
    const row = await prisma.integration_sync_cursors.findUnique({ where: { connection_id_resource: { connection_id: connectionId, resource } } })
    return row && row.organization_id === organizationId ? row.cursor : null
  }

  async saveCursorSystem(organizationId: string, connectionId: string, resource: string, cursor: string): Promise<void> {
    await prisma.integration_sync_cursors.upsert({
      where: { connection_id_resource: { connection_id: connectionId, resource } },
      create: { organization_id: organizationId, connection_id: connectionId, resource, cursor },
      update: { cursor },
    })
  }

  /** Kết nối kênh bán đang dùng được (xuyên tổ chức) — lượt kéo đơn dự phòng. */
  async activeSalesConnectionsSystem(connectorKeys: readonly string[], limit: number) {
    return prisma.integration_connections.findMany({
      where: { connector_key: { in: [...connectorKeys] }, status: { in: ["ACTIVE", "DEGRADED"] }, ...ACTIVE_ORGANIZATION_ONLY }, // UJ-26
      orderBy: { updated_at: "asc" },
      take: limit,
      select: { id: true },
    })
  }
}

let _repo: SalesChannelRepository | null = null
export function getSalesChannelRepository(): SalesChannelRepository {
  if (!_repo) _repo = new SalesChannelRepository()
  return _repo
}
