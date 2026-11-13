import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { HeartAction } from "../domain/catalog-hearts"

/** Trần số sự kiện tim đọc mỗi lần — bảng "nhiều tim nhất" không cần lịch sử vô hạn. */
const MAX_EVENTS = 50_000

/** Đọc thao tác thả/bỏ tim của MỘT bộ sưu tập từ cả link riêng (phiên) và link công khai. */
export class CatalogHeartsRepository {
  constructor(private readonly db = prisma) {}

  async listHeartActions(ctx: TenantContext, catalogId: string): Promise<HeartAction[]> {
    const [privateRows, publicRows] = await Promise.all([
      this.db.greeting_journey_events.findMany({
        where: scopedWhere(ctx, { event_type: { in: ["PRODUCT_LIKED", "PRODUCT_UNLIKED"] }, session: { catalog_id: catalogId } }),
        select: { session_id: true, event_type: true, metadata: true, created_at: true },
        orderBy: { created_at: "desc" },
        take: MAX_EVENTS,
      }),
      this.db.greeting_catalog_events.findMany({
        where: scopedWhere(ctx, { catalog_id: catalogId, event_type: { in: ["LIKE", "UNLIKE"] }, product_id: { not: null } }),
        select: { visitor_hash: true, event_type: true, product_id: true, created_at: true },
        orderBy: { created_at: "desc" },
        take: MAX_EVENTS,
      }),
    ])
    const actions: HeartAction[] = []
    for (const r of privateRows) {
      const productId = (r.metadata as { productId?: unknown } | null)?.productId
      if (typeof productId !== "string") continue
      actions.push({ source: "private", subject: r.session_id, productId, liked: r.event_type === "PRODUCT_LIKED", at: r.created_at })
    }
    for (const r of publicRows) {
      actions.push({ source: "public", subject: r.visitor_hash, productId: r.product_id!, liked: r.event_type === "LIKE", at: r.created_at })
    }
    return actions
  }
}

let _catalogHeartsRepositorySingleton: CatalogHeartsRepository | null = null
export function getCatalogHeartsRepository(): CatalogHeartsRepository {
  if (!_catalogHeartsRepositorySingleton) _catalogHeartsRepositorySingleton = new CatalogHeartsRepository()
  return _catalogHeartsRepositorySingleton
}
