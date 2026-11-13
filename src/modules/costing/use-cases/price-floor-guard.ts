import { unprocessable } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { mergeEffectiveFloorCeilingRatio } from "@/modules/products/domain/pricing-rules"
import { getPricingRuleRepository } from "@/modules/products/infra/pricing-rule-repository"
import { computeProductCost } from "../domain/cost-calculator"
import { aboveCeilingMessage, belowFloorMessage, ceilingPriceVnd, floorPriceVnd } from "../domain/price-floor"
import { getCostingRepository } from "../infra/costing-repository"
import { loadCostingProfile } from "./costing-service"

export type FloorLine = { productId: string | null | undefined; quantity: number }

/** Mã năng lực "đặt giá dưới Sàn" — trần cứng Điều hành (`capability-catalog.ts`). */
export const BELOW_FLOOR_CAPABILITY = "C10"

/** Mã năng lực "đặt giá vượt Trần" (`capability-catalog.ts`) — PO 07/11/2026 (Q3): chặn thật. */
export const ABOVE_CEILING_CAPABILITY = "C9"

/**
 * Tổng giá sàn và giá trần của các dòng hàng; 0 khi cửa hàng chưa đặt hệ số tương ứng hoặc chưa tra được giá vốn.
 * Sàn tính từ phần giá vốn đã có (thiếu tiền công/đơn giá vẫn chặn được giá dưới vốn đã biết — PO 11/11/2026);
 * `floorPartial` = có dòng tính sàn từ giá vốn chưa đủ. Trần chỉ tính khi MỌI dòng có giá vốn ĐỦ (không biết trần thật → không chặn).
 */
export async function priceBoundsVnd(ctx: TenantContext, lines: readonly FloorLine[]): Promise<{ floorVnd: number; ceilingVnd: number; floorPartial?: boolean }> {
  const withProduct = lines.filter((l): l is { productId: string; quantity: number } => Boolean(l.productId) && l.quantity > 0)
  if (withProduct.length === 0) return { floorVnd: 0, ceilingVnd: 0 }
  const profile = await loadCostingProfile(ctx)
  if (!profile.config) return { floorVnd: 0, ceilingVnd: 0 }
  const ratio = mergeEffectiveFloorCeilingRatio(await getPricingRuleRepository().currentRows(ctx), ctx.branchId ?? null)
  if (!(ratio.floorRatio > 0) && !(ratio.ceilingRatio > 0)) return { floorVnd: 0, ceilingVnd: 0 }

  const repo = getCostingRepository()
  const materials = await repo.listMaterials(ctx, true)
  const costByProduct = new Map<string, number>()
  const floorCostByProduct = new Map<string, { vnd: number; partial: boolean }>()
  for (const productId of new Set(withProduct.map((l) => l.productId))) {
    const [product, recipe] = await Promise.all([repo.productForCosting(ctx, productId), repo.findRecipe(ctx, productId)])
    if (!product || !recipe) continue
    const cost = computeProductCost(recipe, materials, profile.config, product.complexity)
    if (cost.complete) costByProduct.set(productId, cost.totalVnd)
    if (cost.totalVnd > 0) floorCostByProduct.set(productId, { vnd: cost.totalVnd, partial: !cost.complete })
  }
  const floorVnd = withProduct.reduce((sum, l) => sum + floorPriceVnd(floorCostByProduct.get(l.productId)?.vnd ?? 0, ratio.floorRatio) * l.quantity, 0)
  const floorPartial = withProduct.some((l) => floorCostByProduct.get(l.productId)?.partial === true)
  const allCosted = withProduct.every((l) => costByProduct.has(l.productId))
  const ceilingVnd = allCosted
    ? withProduct.reduce((sum, l) => sum + ceilingPriceVnd(costByProduct.get(l.productId)!, ratio.ceilingRatio) * l.quantity, 0)
    : 0
  return { floorVnd, ceilingVnd, floorPartial }
}

/** Tổng giá sàn của các dòng hàng; 0 khi cửa hàng chưa đặt hệ số Sàn hoặc chưa tra được giá vốn. */
export async function floorTotalVnd(ctx: TenantContext, lines: readonly FloorLine[]): Promise<number> {
  return (await priceBoundsVnd(ctx, lines)).floorVnd
}

/**
 * Chặn lưu giá dưới sàn (checklist ALG 3.4): người không có C10 nhận 422 `BELOW_FLOOR` kèm giá sàn
 * để xin Điều hành duyệt; Điều hành (C10) lưu được — chính thao tác đó là phê duyệt.
 */
export async function assertNotBelowFloor(ctx: TenantContext, lines: readonly FloorLine[], totalVnd: number): Promise<void> {
  if (hasCapability(ctx, BELOW_FLOOR_CAPABILITY)) return
  const { floorVnd, floorPartial } = await priceBoundsVnd(ctx, lines)
  const message = belowFloorMessage(totalVnd, floorVnd)
  if (message) throw unprocessable(floorPartial ? `${message} (giá vốn của mẫu chưa đủ dữ liệu, sàn tính từ phần đã có)` : message, { reason: "BELOW_FLOOR", floorVnd })
}

/**
 * Chặn giá ngoài khoảng sàn–trần một lần tra giá vốn: dưới sàn cần C10, vượt trần cần C9 (PO 07/11/2026, Q3).
 * `ceilingBaseVnd` = tiền của RIÊNG các dòng có sản phẩm (dòng tự do không có giá vốn nên không so với trần);
 * `null` = không xác định được (vd. báo giá trọn gói cho đơn có dòng tự do) → bỏ qua trần.
 */
export async function assertWithinPriceBounds(
  ctx: TenantContext,
  lines: readonly FloorLine[],
  floorBaseVnd: number,
  ceilingBaseVnd: number | null
): Promise<void> {
  const checkFloor = !hasCapability(ctx, BELOW_FLOOR_CAPABILITY)
  const checkCeiling = ceilingBaseVnd !== null && !hasCapability(ctx, ABOVE_CEILING_CAPABILITY)
  if (!checkFloor && !checkCeiling) return
  const { floorVnd, ceilingVnd, floorPartial } = await priceBoundsVnd(ctx, lines)
  const below = checkFloor ? belowFloorMessage(floorBaseVnd, floorVnd) : null
  if (below) throw unprocessable(floorPartial ? `${below} (giá vốn của mẫu chưa đủ dữ liệu, sàn tính từ phần đã có)` : below, { reason: "BELOW_FLOOR", floorVnd })
  const above = checkCeiling ? aboveCeilingMessage(ceilingBaseVnd, ceilingVnd) : null
  if (above) throw unprocessable(above, { reason: "ABOVE_CEILING", ceilingVnd })
}
