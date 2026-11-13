import { createHash } from "node:crypto"
import type { TenantContext } from "@/core/tenancy"
import { buildChannelFunnel, normalizeChannel, type CatalogEventType } from "../domain/catalog-channel"
import { CatalogEventRepository, getCatalogEventRepository } from "../infra/catalog-event-repository"
import { resolveSaleScope } from "./order-scope"

/** Băm mã khách (ngẫu nhiên trên máy khách) cùng catalog — không lưu IP hay mã thô. */
export function hashVisitor(catalogId: string, visitorId: string): string {
  return createHash("sha256").update(`${catalogId}:${visitorId}`).digest("hex").slice(0, 32)
}

/** Ghi sự kiện công khai; trả false khi catalog không mở (route trả 404). */
export async function recordCatalogEvent(
  input: { catalogId: string; channel: unknown; eventType: CatalogEventType; visitorId: string; orderId?: string | null; productId?: string | undefined },
  repo = getCatalogEventRepository()
): Promise<boolean> {
  return repo.record({
    catalogId: input.catalogId,
    channel: normalizeChannel(input.channel),
    eventType: input.eventType,
    visitorHash: hashVisitor(input.catalogId, input.visitorId),
    orderId: input.orderId,
    productId: input.productId,
  })
}

/**
 * Phễu theo kênh trong `days` ngày (tuỳ chọn lọc 1 catalog). Link chung không thuộc riêng sale nào —
 * sale "chỉ khách của mình" nhận phễu rỗng.
 */
export async function getChannelFunnel(ctx: TenantContext, days: number, catalogId?: string, repo = getCatalogEventRepository()) {
  if (await resolveSaleScope(ctx)) return { days, rows: [] }
  const since = new Date(Date.now() - days * 86_400_000)
  return { days, rows: buildChannelFunnel(await repo.countByChannel(ctx, since, catalogId)) }
}
