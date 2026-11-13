import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"

export interface FeaturedProductRow {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly category: string | null
  readonly price: number | null
  readonly active: boolean
}

/** Sản phẩm chủ đạo theo đúng thứ tự chủ tiệm chọn; sản phẩm đã vào thùng rác / của tổ chức khác bị bỏ. */
export async function listFeaturedProducts(ctx: TenantContext, ids: readonly string[]): Promise<FeaturedProductRow[]> {
  if (ids.length === 0) return []
  const rows = await prisma.products.findMany({
    where: scopedWhere(ctx, { id: { in: [...ids] }, status: { not: "ARCHIVED" as const } }),
    select: { id: true, name: true, code: true, category: true, status: true, attributes: true },
    take: ids.length,
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  return ids.flatMap((id) => {
    const r = byId.get(id)
    if (!r) return []
    const attr = (r.attributes as Record<string, unknown> | null) ?? {}
    const price = typeof attr.price === "number" ? attr.price : null
    return [{ id: r.id, name: r.name, code: r.code, category: r.category, price, active: r.status === "ACTIVE" }]
  })
}
