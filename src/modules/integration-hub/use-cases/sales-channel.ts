/**
 * Kênh bán hàng — phần chung cho mọi sàn (Trung tâm Tích hợp GĐ4A).
 * Đăng/gỡ sản phẩm và đồng bộ còn/hết hàng: theo phiên (W3). Nhập đơn: từ lượt xử lý sự kiện/kéo đơn,
 * `organizationId` lấy từ kết nối đã xác thực. Mọi lô đều có giới hạn; nhập đơn chống trùng theo mã đơn sàn.
 */

import { requireCapability } from "@/core/rbac/capabilities"
import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { MAX_LISTINGS_PER_PUSH } from "@/core/ports/sales-channel-catalog-provider"
import { MAX_AVAILABILITY_PER_PUSH } from "@/core/ports/sales-channel-order-provider"
import { toChannelListing } from "@/modules/products/domain/channel-listing"
import { findManifest } from "../domain/connector-catalog"
import { channelInStock, chunk, mapChannelOrder } from "../domain/sales-order-mapping"
import { isUsable } from "../domain/connection-lifecycle"
import { openCredential } from "../infra/credential-vault"
import type { ConnectionRecord } from "../infra/connection-repository"
import type { ChannelOrderView, ListingView } from "../infra/sales-channel-repository"
import { isOwnConnectionAllowed } from "./governance-mode"
import { defaultSalesDeps, type SalesDeps } from "./sales-channel-deps"

async function loadSalesConnection(ctx: TenantContext, connectionId: string, deps: SalesDeps) {
  const connection = await deps.connections.get(ctx, connectionId)
  const connector = connection ? deps.getConnector(connection.connectorKey) : null
  if (!connection || connection.status === "DISCONNECTED" || !connector?.sales) throw notFound()
  return { connection, sales: connector.sales }
}

async function usableCredential(connection: ConnectionRecord, deps: SalesDeps) {
  if (!isUsable(connection.status) || !connection.credentialEncrypted) {
    throw new AppError("UNPROCESSABLE_ENTITY", "Kết nối đang lỗi hoặc hết hạn — kiểm tra lại kết nối trước")
  }
  if (!(await isOwnConnectionAllowed(connection.organizationId, connection.connectorKey, deps))) {
    throw new AppError("UNPROCESSABLE_ENTITY", "Cấp trên đã khoá kênh bán này", { violation: "LOCKED_BY_UPPER" })
  }
  return { secret: openCredential(connection.connectorKey, connection.credentialEncrypted) }
}

export async function getSalesChannel(
  ctx: TenantContext,
  connectionId: string,
  deps: SalesDeps = defaultSalesDeps()
): Promise<{ listings: ListingView[]; orders: ChannelOrderView[] }> {
  requireCapability(ctx, "W1")
  await loadSalesConnection(ctx, connectionId, deps)
  const [listings, orders] = await Promise.all([deps.sales.listListings(ctx, connectionId), deps.sales.listOrders(ctx, connectionId, 50)])
  return { listings, orders }
}

/** Đăng hoặc cập nhật tối đa 100 sản phẩm lên kênh. Sản phẩm thiếu dữ liệu không được đẩy — lý do ghi vào tin đăng. */
export async function publishProducts(
  ctx: TenantContext,
  input: { connectionId: string; productIds: readonly string[] },
  deps: SalesDeps = defaultSalesDeps()
): Promise<ListingView[]> {
  requireCapability(ctx, "W3")
  const ids = [...new Set(input.productIds)].slice(0, MAX_LISTINGS_PER_PUSH)
  const { connection, sales } = await loadSalesConnection(ctx, input.connectionId, deps)
  const credential = await usableCredential(connection, deps)
  const products = await deps.listProducts(ctx, { ids }, { limit: MAX_LISTINGS_PER_PUSH })
  const now = deps.now()
  const ready = []
  for (const p of products) {
    const result = toChannelListing(
      {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        price_vnd: p.price_vnd,
        imageUrls: p.masterImageUrl ? [p.masterImageUrl] : [],
        commerce: { barcode: p.barcode ?? null, weight_grams: p.weight_grams ?? null, tags: p.tags ?? [] },
      },
      connection.connectorKey
    )
    if (result.ok) ready.push(result.listing)
    else await deps.sales.saveListing(ctx, connection.id, { productId: p.id, status: "REJECTED", lastError: result.issues.join(", "), at: now })
  }
  for (const batch of chunk(ready, MAX_LISTINGS_PER_PUSH)) {
    const results = await sales.upsertListings(credential, connection.config, batch)
    for (const r of results) {
      await deps.sales.saveListing(ctx, connection.id, {
        productId: r.productId,
        status: r.status === "SYNCED" ? "SYNCED" : "REJECTED",
        ...(r.externalId ? { externalId: r.externalId } : {}),
        lastError: r.status === "SYNCED" ? null : (r.reason ?? "Kênh từ chối tin đăng"),
        at: now,
      })
    }
  }
  await deps.audit(ctx, { action: "integration.sales.publish", entityType: "integration_connection", entityId: connection.id, after: { count: ids.length } })
  return deps.sales.listListings(ctx, connection.id, ids)
}

export async function unpublishProducts(
  ctx: TenantContext,
  input: { connectionId: string; productIds: readonly string[] },
  deps: SalesDeps = defaultSalesDeps()
): Promise<void> {
  requireCapability(ctx, "W3")
  const { connection, sales } = await loadSalesConnection(ctx, input.connectionId, deps)
  const credential = await usableCredential(connection, deps)
  const listings = (await deps.sales.listListings(ctx, connection.id, input.productIds.slice(0, MAX_LISTINGS_PER_PUSH))).filter((l) => l.externalId)
  for (const batch of chunk(listings, MAX_LISTINGS_PER_PUSH)) {
    await sales.removeListings(credential, connection.config, batch.map((l) => l.externalId as string))
    for (const l of batch) await deps.sales.saveListing(ctx, connection.id, { productId: l.productId, status: "REMOVED", lastError: null, at: deps.now() })
  }
  await deps.audit(ctx, { action: "integration.sales.unpublish", entityType: "integration_connection", entityId: connection.id, after: { count: listings.length } })
}

/** Còn/hết hàng cho mọi tin đã đăng: đang mở bán và — nếu sản phẩm theo dõi tồn theo số lượng — còn ít nhất 1 (BL-34). */
export async function syncAvailability(ctx: TenantContext, connectionId: string, deps: SalesDeps = defaultSalesDeps()): Promise<number> {
  requireCapability(ctx, "W3")
  const { connection, sales } = await loadSalesConnection(ctx, connectionId, deps)
  const credential = await usableCredential(connection, deps)
  const listings = (await deps.sales.listListings(ctx, connection.id)).filter((l) => l.status === "SYNCED" && l.externalId)
  const products = await deps.listProducts(ctx, { ids: listings.map((l) => l.productId) }, { limit: MAX_AVAILABILITY_PER_PUSH })
  const byId = new Map(products.map((p) => [p.id, p]))
  const stock = await deps.sales.trackedStock(ctx, products.map((p) => p.id))
  const items = listings.flatMap((l) => {
    const p = byId.get(l.productId)
    return p ? [{ externalId: l.externalId as string, sku: p.code, inStock: channelInStock(p.status, stock.get(p.id)) }] : []
  })
  for (const batch of chunk(items, MAX_AVAILABILITY_PER_PUSH)) await sales.pushAvailability(credential, connection.config, batch)
  return items.length
}

/**
 * Nhập một đơn sàn thành đơn nội bộ (lượt hệ thống). Trùng → bỏ qua. Lỗi → ném để lượt xử lý thử lại.
 * Trả mã đơn nội bộ hoặc null khi đơn đã được nhận trước đó.
 */
export async function importChannelOrder(
  connection: ConnectionRecord,
  externalOrderId: string,
  deps: SalesDeps = defaultSalesDeps()
): Promise<string | null> {
  const connector = deps.getConnector(connection.connectorKey)
  if (!connector?.sales || !connection.credentialEncrypted) throw new Error("NOT_A_SALES_CONNECTION")
  if (!(await deps.sales.claimOrderSystem(connection.organizationId, connection.id, externalOrderId))) return null
  try {
    const order = await connector.sales.getOrder({ secret: openCredential(connection.connectorKey, connection.credentialEncrypted) }, connection.config, externalOrderId)
    if (!order) throw new Error("ORDER_NOT_FOUND")
    const skus = order.items.flatMap((i) => (i.sellerSku ? [i.sellerSku] : []))
    const bySku = await deps.sales.productIdsBySkuSystem(connection.organizationId, skus)
    const mapped = mapChannelOrder(order, bySku, findManifest(connection.connectorKey)?.label ?? "kênh bán")
    if (!mapped) throw new Error("EMPTY_ORDER")
    const systemCtx: TenantContext = { organizationId: connection.organizationId, workspaceId: "system", userId: "system", branchId: null, capabilities: new Set() }
    const created = await deps.createOrder(systemCtx, mapped.input)
    await deps.sales.finishOrderSystem(connection.id, externalOrderId, { orderId: created.id })
    return created.id
  } catch (err) {
    await deps.sales.finishOrderSystem(connection.id, externalOrderId, { errorCode: err instanceof Error ? err.message : "IMPORT_FAILED" })
    throw err
  }
}
