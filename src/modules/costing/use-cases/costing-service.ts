import { notFound, unprocessable, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import { getPricingRuleRepository } from "@/modules/products/infra/pricing-rule-repository"
import { mergeEffectiveFloorCeilingRatio } from "@/modules/products/domain/pricing-rules"
import { draftRecipeFromBom } from "../domain/bom-adapters"
import { computeProductCost } from "../domain/cost-calculator"
import { parseCostingOverrides, resolveCostConfig } from "../domain/cost-config"
import { aggregateMaterialNeeds } from "../domain/material-needs"
import { detectPriceChange } from "../domain/price-change"
import { priceScenarios } from "../domain/price-scenarios"
import { getCostingRepository, type MaterialInput } from "../infra/costing-repository"

const NOT_SUPPORTED = "Ngành của cửa hàng chưa được hỗ trợ cho công cụ tính giá"

/** Hồ sơ ngành + cấu hình chi phí hiệu lực của cửa hàng. `spec = null` khi ngành chưa hỗ trợ. */
export async function loadCostingProfile(ctx: TenantContext) {
  const org = await getOrganizationRepository().current(ctx)
  const settings = (org?.settings as Record<string, unknown> | null) ?? {}
  const plugin = getIndustryPlugin(typeof settings.industry === "string" ? settings.industry : null)
  const spec = plugin.costing
  if (!spec) return { industryKey: plugin.identity.key, spec: null, config: null, alertPercent: null } as const
  const rows = await getPricingRuleRepository().currentRows(ctx)
  const overrides = parseCostingOverrides(rows.filter((r) => r.branch_id === null).map((r) => ({ key: r.key, value: r.value })))
  return {
    industryKey: plugin.identity.key,
    spec,
    config: resolveCostConfig(spec, plugin.craftFee, overrides),
    alertPercent: overrides.price_change_alert_percent ?? spec.priceChangeAlertPercent,
  } as const
}

async function requireSpec(ctx: TenantContext) {
  const profile = await loadCostingProfile(ctx)
  if (!profile.spec || !profile.config) throw unprocessable(NOT_SUPPORTED)
  return { ...profile, spec: profile.spec, config: profile.config }
}

function validateMaterial(input: Partial<MaterialInput>, spec: IndustryCostingSpec, partial: boolean) {
  const errors: Record<string, string> = {}
  if (!partial || input.name !== undefined) if (!input.name?.trim()) errors.name = "Cần tên nguyên liệu"
  if (!partial || input.unit !== undefined) if (!input.unit?.trim()) errors.unit = "Cần đơn vị tính"
  if (!partial || input.categoryKey !== undefined)
    if (!spec.materialCategories.some((c) => c.key === input.categoryKey)) errors.categoryKey = "Nhóm nguyên liệu không thuộc ngành của cửa hàng"
  if (input.unitCostVnd !== undefined && input.unitCostVnd !== null && !(input.unitCostVnd >= 0)) errors.unitCostVnd = "Đơn giá không được âm"
  if (input.onHandQty !== undefined && input.onHandQty !== null && !(input.onHandQty >= 0)) errors.onHandQty = "Tồn kho không được âm"
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
}

/** #32 — danh sách nguyên liệu kèm cảnh báo biến động giá. */
export async function listMaterialsWithAlerts(ctx: TenantContext, includeInactive: boolean) {
  const { alertPercent } = await requireSpec(ctx)
  const repo = getCostingRepository()
  const materials = await repo.listMaterials(ctx, includeInactive)
  return Promise.all(
    materials.map(async (m) => ({ ...m, priceChange: detectPriceChange(await repo.priceHistory(ctx, m.id, 2), alertPercent) })),
  )
}

export async function createMaterial(ctx: TenantContext, input: MaterialInput) {
  const { spec } = await requireSpec(ctx)
  validateMaterial(input, spec, false)
  return getCostingRepository().createMaterial(ctx, { ...input, name: input.name.trim(), unit: input.unit.trim() }, ctx.userId)
}

export async function updateMaterial(ctx: TenantContext, id: string, patch: Partial<MaterialInput> & { active?: boolean }) {
  const { spec } = await requireSpec(ctx)
  validateMaterial(patch, spec, true)
  const row = await getCostingRepository().updateMaterial(ctx, id, patch, ctx.userId)
  if (!row) throw notFound()
  return row
}

export async function materialHistory(ctx: TenantContext, id: string) {
  const repo = getCostingRepository()
  if (!(await repo.findMaterial(ctx, id))) throw notFound()
  return repo.priceHistory(ctx, id)
}

/** #31 — công thức đã lưu, hoặc bản nháp đọc từ BOM do AI bóc tách khi chưa có. */
export async function getRecipe(ctx: TenantContext, productId: string) {
  const { spec } = await requireSpec(ctx)
  const repo = getCostingRepository()
  const product = await repo.productForCosting(ctx, productId)
  if (!product) throw notFound()
  const saved = await repo.findRecipe(ctx, productId)
  if (saved) return { product: { id: product.id, name: product.name }, recipe: saved, draft: null }
  const materials = await repo.listMaterials(ctx)
  return { product: { id: product.id, name: product.name }, recipe: null, draft: draftRecipeFromBom(product.bom, spec, materials) }
}

export async function saveRecipe(
  ctx: TenantContext,
  productId: string,
  input: { lines: { materialId: string; quantity: number }[]; wastePercent: number | null; laborMinutes: number | null; note: string | null },
) {
  await requireSpec(ctx)
  const repo = getCostingRepository()
  if (!(await repo.productForCosting(ctx, productId))) throw notFound()
  const lines = input.lines.filter((l) => l.quantity > 0)
  if (input.wastePercent !== null && (input.wastePercent < 0 || input.wastePercent >= 100)) throw validationFailed({ wastePercent: "Hao hụt phải từ 0 đến dưới 100%" })
  const saved = await repo.saveRecipe(ctx, { productId, lines, wastePercent: input.wastePercent, laborMinutes: input.laborMinutes, note: input.note }, ctx.userId)
  if (!saved) throw notFound() // nguyên liệu không thuộc tổ chức → như không tồn tại (404, không 403)
  return saved
}

/** #33 + #34 — giá vốn và các kịch bản giá bán của một sản phẩm. */
export async function productCostAndPrice(ctx: TenantContext, productId: string, competitorPriceVnd: number | null) {
  const { spec, config } = await requireSpec(ctx)
  const repo = getCostingRepository()
  const product = await repo.productForCosting(ctx, productId)
  if (!product) throw notFound()
  const recipe = await repo.findRecipe(ctx, productId)
  if (!recipe) return { product: { id: product.id, name: product.name, priceVnd: product.priceVnd }, hasRecipe: false, cost: null, scenarios: [] }
  const cost = computeProductCost(recipe, await repo.listMaterials(ctx, true), config, product.complexity)
  const ratio = mergeEffectiveFloorCeilingRatio(await getPricingRuleRepository().currentRows(ctx), ctx.branchId ?? null)
  const scenarios = cost.complete
    ? priceScenarios({
        costVnd: cost.totalVnd,
        presets: spec.priceScenarios,
        roundingVnd: spec.priceRoundingVnd,
        currentPriceVnd: product.priceVnd,
        competitorPriceVnd,
        floorRatio: ratio.floorRatio,
        ceilingRatio: ratio.ceilingRatio,
      })
    : []
  return { product: { id: product.id, name: product.name, priceVnd: product.priceVnd }, hasRecipe: true, cost, scenarios }
}

/**
 * Đề xuất giá vốn từ BOM của sản phẩm × đơn giá nguyên liệu của tiệm (checklist ALG 7.2): công thức
 * nháp ghép theo tên, chưa lưu. Nguyên liệu chưa ghép được hoặc chưa có đơn giá liệt kê rõ, không đoán số.
 */
export async function suggestCostFromBom(ctx: TenantContext, productId: string) {
  const { spec, config } = await requireSpec(ctx)
  const repo = getCostingRepository()
  const product = await repo.productForCosting(ctx, productId)
  if (!product) throw notFound()
  const materials = await repo.listMaterials(ctx)
  const draft = draftRecipeFromBom(product.bom, spec, materials)
  const lines = draft.flatMap((l) => (l.materialId ? [{ materialId: l.materialId, quantity: l.quantity }] : []))
  const cost = computeProductCost({ productId, lines, wastePercent: null, laborMinutes: null }, materials, config, product.complexity)
  return { draft, cost, unmatched: draft.filter((l) => !l.materialId).map((l) => l.name) }
}

/** #34 — áp một mức giá cho sản phẩm (người dùng đã xác nhận ở giao diện). Ghi nhật ký kèm giá vốn lúc áp. */
export async function applyPrice(ctx: TenantContext, productId: string, priceVnd: number, scenarioKey: string) {
  if (!(priceVnd > 0) || !Number.isFinite(priceVnd)) throw validationFailed({ priceVnd: "Giá bán phải lớn hơn 0" })
  const current = await productCostAndPrice(ctx, productId, null)
  const result = await getCostingRepository().applyProductPrice(ctx, productId, Math.round(priceVnd), {
    costVnd: current.cost?.totalVnd ?? 0,
    scenarioKey,
  })
  if (!result) throw notFound()
  return result
}

/** #35 — dự toán mua nguyên liệu cho đơn giao trong khoảng ngày. */
export async function materialNeeds(ctx: TenantContext, from: string, to: string) {
  const { config, spec } = await requireSpec(ctx)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw validationFailed({ range: "Khoảng ngày không hợp lệ" })
  const repo = getCostingRepository()
  const demand = await repo.demandBetween(ctx, from, to)
  const recipes = await repo.listRecipes(ctx, [...new Set(demand.map((d) => d.productId))])
  const result = aggregateMaterialNeeds(demand, recipes, await repo.listMaterials(ctx, true), config.wastePercentByCategory)
  return { ...result, perishable: spec.perishable, orderCount: new Set(demand.map((d) => d.orderId)).size }
}

/** #35 — ghi nhận đã mua theo dự toán: cộng tồn, cập nhật đơn giá thực mua. */
export async function recordPurchase(ctx: TenantContext, items: { materialId: string; quantity: number; unitCostVnd: number | null }[]) {
  await requireSpec(ctx)
  if (items.length === 0) throw validationFailed({ items: "Chưa chọn nguyên liệu nào" })
  const result = await getCostingRepository().recordPurchase(ctx, items, ctx.userId)
  if (!result) throw notFound()
  return result
}
