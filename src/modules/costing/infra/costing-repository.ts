import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import type { Material, Recipe } from "../domain/costing-types"
import type { DemandItem } from "../domain/material-needs"
import type { PricePoint } from "../domain/price-change"

type Db = typeof prisma

const toNum = (d: Prisma.Decimal | null): number | null => (d === null ? null : Number(d))

function toMaterial(row: {
  id: string
  name: string
  unit: string
  category_key: string
  unit_cost_vnd: Prisma.Decimal | null
  on_hand_qty: Prisma.Decimal | null
  active: boolean
  supplier_name: string | null
}): Material & { supplierName: string | null } {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    categoryKey: row.category_key,
    unitCostVnd: toNum(row.unit_cost_vnd),
    onHandQty: toNum(row.on_hand_qty),
    active: row.active,
    supplierName: row.supplier_name,
  }
}

export interface MaterialInput {
  name: string
  unit: string
  categoryKey: string
  unitCostVnd: number | null
  supplierName: string | null
  onHandQty: number | null
}

/** Nhóm công cụ 6 — truy cập dữ liệu nguyên liệu/công thức, luôn trong phạm vi tổ chức của phiên. */
export class CostingRepository {
  constructor(private readonly db: Db = prisma) {}

  async listMaterials(ctx: TenantContext, includeInactive = false) {
    const rows = await this.db.materials.findMany({
      where: scopedWhere(ctx, includeInactive ? {} : { active: true }),
      orderBy: [{ category_key: "asc" }, { name: "asc" }],
    })
    return rows.map(toMaterial)
  }

  async findMaterial(ctx: TenantContext, id: string) {
    const row = await this.db.materials.findFirst({ where: scopedWhere(ctx, { id }) })
    return row ? toMaterial(row) : null
  }

  /** Tạo nguyên liệu; có đơn giá thì ghi luôn mốc giá đầu tiên vào lịch sử. */
  async createMaterial(ctx: TenantContext, input: MaterialInput, userId: string) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.materials.create({
        data: scopedData(ctx, {
          name: input.name,
          unit: input.unit,
          category_key: input.categoryKey,
          unit_cost_vnd: input.unitCostVnd,
          supplier_name: input.supplierName,
          on_hand_qty: input.onHandQty,
          created_by: userId,
        }),
      })
      if (input.unitCostVnd !== null) {
        await tx.material_price_history.create({
          data: scopedData(ctx, { material_id: row.id, unit_cost_vnd: input.unitCostVnd, source: "MANUAL", created_by: userId }),
        })
      }
      return toMaterial(row)
    })
  }

  /** Sửa nguyên liệu; đổi đơn giá thì ghi một mốc lịch sử mới (không sửa mốc cũ). */
  async updateMaterial(ctx: TenantContext, id: string, patch: Partial<MaterialInput> & { active?: boolean }, userId: string, source = "MANUAL") {
    return this.db.$transaction(async (tx) => {
      const current = await tx.materials.findFirst({ where: scopedWhere(ctx, { id }) })
      if (!current) return null
      const row = await tx.materials.update({
        where: { id: current.id },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
          ...(patch.categoryKey !== undefined ? { category_key: patch.categoryKey } : {}),
          ...(patch.unitCostVnd !== undefined ? { unit_cost_vnd: patch.unitCostVnd } : {}),
          ...(patch.supplierName !== undefined ? { supplier_name: patch.supplierName } : {}),
          ...(patch.onHandQty !== undefined ? { on_hand_qty: patch.onHandQty } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
        },
      })
      const oldCost = toNum(current.unit_cost_vnd)
      if (patch.unitCostVnd !== undefined && patch.unitCostVnd !== null && patch.unitCostVnd !== oldCost) {
        await tx.material_price_history.create({
          data: scopedData(ctx, { material_id: id, unit_cost_vnd: patch.unitCostVnd, source, created_by: userId }),
        })
      }
      return toMaterial(row)
    })
  }

  async priceHistory(ctx: TenantContext, materialId: string, take = 20): Promise<PricePoint[]> {
    const rows = await this.db.material_price_history.findMany({
      where: scopedWhere(ctx, { material_id: materialId }),
      orderBy: { effective_at: "desc" },
      take,
    })
    return rows.map((r) => ({ unitCostVnd: Number(r.unit_cost_vnd), effectiveAt: r.effective_at }))
  }

  async findRecipe(ctx: TenantContext, productId: string): Promise<(Recipe & { version: number; note: string | null }) | null> {
    const row = await this.db.product_recipes.findFirst({ where: scopedWhere(ctx, { product_id: productId }), include: { items: true } })
    if (!row) return null
    return {
      productId,
      version: row.version,
      note: row.note,
      wastePercent: toNum(row.waste_percent),
      laborMinutes: row.labor_minutes,
      lines: row.items.map((i) => ({ materialId: i.material_id, quantity: Number(i.quantity) })),
    }
  }

  async listRecipes(ctx: TenantContext, productIds: readonly string[]): Promise<Map<string, Recipe>> {
    const rows = await this.db.product_recipes.findMany({
      where: scopedWhere(ctx, { product_id: { in: [...productIds] } }),
      include: { items: true },
    })
    return new Map(
      rows.map((row) => [
        row.product_id,
        {
          productId: row.product_id,
          wastePercent: toNum(row.waste_percent),
          laborMinutes: row.labor_minutes,
          lines: row.items.map((i) => ({ materialId: i.material_id, quantity: Number(i.quantity) })),
        },
      ]),
    )
  }

  /** Lưu công thức (thay toàn bộ dòng), tăng phiên bản. Nguyên liệu phải thuộc chính tổ chức này. */
  async saveRecipe(ctx: TenantContext, recipe: Recipe & { note: string | null }, userId: string) {
    return this.db.$transaction(async (tx) => {
      const materialIds = [...new Set(recipe.lines.map((l) => l.materialId))]
      const owned = await tx.materials.count({ where: scopedWhere(ctx, { id: { in: materialIds } }) })
      if (owned !== materialIds.length) return null
      const existing = await tx.product_recipes.findFirst({ where: scopedWhere(ctx, { product_id: recipe.productId }) })
      const saved = existing
        ? await tx.product_recipes.update({
            where: { id: existing.id },
            data: { version: existing.version + 1, waste_percent: recipe.wastePercent, labor_minutes: recipe.laborMinutes, note: recipe.note, updated_by: userId },
          })
        : await tx.product_recipes.create({
            data: scopedData(ctx, { product_id: recipe.productId, waste_percent: recipe.wastePercent, labor_minutes: recipe.laborMinutes, note: recipe.note, updated_by: userId }),
          })
      await tx.product_recipe_items.deleteMany({ where: scopedWhere(ctx, { recipe_id: saved.id }) })
      if (recipe.lines.length > 0) {
        await tx.product_recipe_items.createMany({
          data: recipe.lines.map((l) => scopedData(ctx, { recipe_id: saved.id, material_id: l.materialId, quantity: l.quantity })),
        })
      }
      return { version: saved.version }
    })
  }

  /** Sản phẩm của tổ chức + BOM: ưu tiên `attributes.bom`, không có thì lấy từ lần phân tích ảnh mới nhất. */
  async productForCosting(ctx: TenantContext, productId: string) {
    const row = await this.db.products.findFirst({
      where: scopedWhere(ctx, { id: productId }),
      select: { id: true, name: true, attributes: true, analyses: { orderBy: { created_at: "desc" }, take: 1, select: { raw: true, edited: true } } },
    })
    if (!row) return null
    const attrs = (row.attributes as Record<string, unknown> | null) ?? {}
    // Bản người đã sửa thắng bản máy đọc (đặc tả phân tích ảnh: `edited` tách khỏi `raw`).
    const analysis = row.analyses[0]
    const analysisData = (analysis?.edited ?? analysis?.raw) as Record<string, unknown> | null | undefined
    const analysisBom = (analysisData?.bom as unknown) ?? null
    const price = typeof attrs.price === "number" && attrs.price > 0 ? attrs.price : null
    const complexity = attrs.craft_complexity
    return {
      id: row.id,
      name: row.name,
      bom: attrs.bom ?? analysisBom,
      priceVnd: price,
      complexity: complexity === "EASY" || complexity === "MEDIUM" || complexity === "HARD" ? complexity : null,
    } as const
  }

  /**
   * #35 — "đã mua": cộng tồn kho; có đơn giá mua thì cập nhật đơn giá + mốc lịch sử nguồn `PURCHASE`.
   * Mọi nguyên liệu phải thuộc tổ chức; không thì không ghi gì và trả `null`.
   */
  async recordPurchase(ctx: TenantContext, items: readonly { materialId: string; quantity: number; unitCostVnd: number | null }[], userId: string) {
    return this.db.$transaction(async (tx) => {
      const ids = [...new Set(items.map((i) => i.materialId))]
      const rows = await tx.materials.findMany({ where: scopedWhere(ctx, { id: { in: ids } }) })
      if (rows.length !== ids.length || ids.length !== items.length) return null
      for (const item of items) {
        const row = rows.find((r) => r.id === item.materialId)!
        const onHand = (toNum(row.on_hand_qty) ?? 0) + item.quantity
        const priceChanged = item.unitCostVnd !== null && item.unitCostVnd !== toNum(row.unit_cost_vnd)
        await tx.materials.update({
          where: { id: row.id },
          data: { on_hand_qty: onHand, ...(item.unitCostVnd !== null ? { unit_cost_vnd: item.unitCostVnd } : {}) },
        })
        if (priceChanged) {
          await tx.material_price_history.create({
            data: scopedData(ctx, { material_id: row.id, unit_cost_vnd: item.unitCostVnd as number, source: "PURCHASE", created_by: userId }),
          })
        }
      }
      return { updated: items.length }
    })
  }

  /**
   * #34 — áp giá bán vào `products.attributes.price` và ghi `audit_logs` trong cùng giao dịch
   * (R3: đổi giá ảnh hưởng báo giá/đơn mới). Trả `null` khi sản phẩm không thuộc tổ chức.
   */
  async applyProductPrice(ctx: TenantContext, productId: string, priceVnd: number, basis: { costVnd: number; scenarioKey: string }) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.products.findFirst({ where: scopedWhere(ctx, { id: productId }), select: { id: true, attributes: true } })
      if (!row) return null
      const attrs = (row.attributes as Record<string, unknown> | null) ?? {}
      const before = typeof attrs.price === "number" ? attrs.price : null
      await tx.products.update({ where: { id: row.id }, data: { attributes: { ...attrs, price: priceVnd } as Prisma.InputJsonValue } })
      await recordAuditLog(
        ctx,
        {
          action: "product.price.apply",
          entityType: "products",
          entityId: row.id,
          before: { price: before },
          after: { price: priceVnd, cost_vnd: basis.costVnd, scenario: basis.scenarioKey },
        },
        tx,
      )
      return { previousPriceVnd: before, priceVnd }
    })
  }

  /** Đơn đã xác nhận/đang làm có ngày giao trong khoảng [from, to] (YYYY-MM-DD) — nhu cầu cho #35. */
  async demandBetween(ctx: TenantContext, from: string, to: string): Promise<DemandItem[]> {
    const orders = await this.db.orders.findMany({
      where: scopedWhere(ctx, { status: { in: ["CONFIRMED", "PROCESSING"] as ("CONFIRMED" | "PROCESSING")[] } }),
      select: { id: true, delivery_window: true, items: { select: { product_id: true, quantity: true } } },
    })
    const out: DemandItem[] = []
    for (const o of orders) {
      const date = (o.delivery_window as { date?: unknown } | null)?.date
      if (typeof date !== "string" || date < from || date > to) continue
      for (const it of o.items) if (it.product_id) out.push({ orderId: o.id, productId: it.product_id, quantity: it.quantity })
    }
    return out
  }
}

let instance: CostingRepository | null = null
export function getCostingRepository(): CostingRepository {
  if (!instance) instance = new CostingRepository()
  return instance
}

