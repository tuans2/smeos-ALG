import { randomUUID } from "node:crypto"

import { conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { listActiveShopPromotions, type ActiveShopPromotion } from "@/modules/greeting-card/use-cases/active-shop-promotions"

import {
  buildPriceListGroups,
  categoryLabel,
  MAX_PRICE_LIST_PRODUCTS,
  MAX_PRICE_LISTS,
  parsePriceList,
  priceListKey,
  priceListStatus,
  PRICE_LIST_KEY_PREFIX,
  validatePriceList,
  type PriceListConfig,
  type PriceListGroup,
  type PriceListInput,
  type PriceListStatus,
} from "../domain/price-list"
import type { IPricingRuleRepository } from "../domain/repositories/pricing-rule-repository.interface"
import type { IProductRepository } from "../domain/repositories/product-repository.interface"
import { getPricingRuleRepository } from "../infra/pricing-rule-repository"
import { getProductRepository } from "../infra/product-repository"

export type PriceListView = PriceListConfig & { status: PriceListStatus; updatedAt: Date }

export interface PriceListDocument {
  priceList: PriceListView
  groups: PriceListGroup[]
  promotions: ActiveShopPromotion[]
  /** Loại sản phẩm đang có — để màn hình chọn lọc */
  categories: CategoryOption[]
  productCount: number
}

type PromotionLoader = (organizationId: string) => Promise<ActiveShopPromotion[]>

/** Ngày hôm nay `YYYY-MM-DD` theo giờ Việt Nam (UTC+7, không có giờ mùa hè). */
function todayVn(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
}

async function current(ctx: TenantContext, repo: IPricingRuleRepository): Promise<PriceListView[]> {
  const today = todayVn()
  return (await repo.currentRows(ctx))
    .filter((r) => r.key.startsWith(PRICE_LIST_KEY_PREFIX) && r.branch_id === null)
    .flatMap((r) => {
      const config = parsePriceList(r.key, r.value)
      return config && !config.archived ? [{ ...config, status: priceListStatus(config, today), updatedAt: r.effective_from }] : []
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

async function findOrThrow(ctx: TenantContext, id: string, repo: IPricingRuleRepository): Promise<PriceListView> {
  const found = (await current(ctx, repo)).find((p) => p.id === id)
  if (!found) throw notFound()
  return found
}

export interface CategoryOption {
  /** Giá trị lưu ở sản phẩm — dùng để lọc */
  value: string
  /** Tên hiện cho người dùng */
  label: string
}

const categoriesOf = (products: readonly { category: string | null }[]): CategoryOption[] =>
  [...new Set(products.map((p) => p.category?.trim()).filter((c): c is string => Boolean(c)))]
    .map((value) => ({ value, label: categoryLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"))

/** Bảng giá của tổ chức (`L1`), mới sửa trước, kèm các loại sản phẩm đang bán để chọn lọc. */
export async function listPriceLists(
  ctx: TenantContext,
  repo: IPricingRuleRepository = getPricingRuleRepository(),
  productRepo: IProductRepository = getProductRepository(),
): Promise<{ data: PriceListView[]; categories: CategoryOption[] }> {
  const [data, products] = await Promise.all([
    current(ctx, repo),
    productRepo.list(ctx, { status: "ACTIVE" }, { limit: MAX_PRICE_LIST_PRODUCTS }),
  ])
  return { data, categories: categoriesOf(products) }
}

/** Phần cấu hình để ghi lại (bỏ trường suy ra khi đọc). */
function configOf(view: PriceListView): Omit<PriceListConfig, "id"> {
  return {
    name: view.name, heading: view.heading, note: view.note, categories: view.categories, productIds: view.productIds,
    validFrom: view.validFrom, validTo: view.validTo, showPeakPrice: view.showPeakPrice, showPromotions: view.showPromotions,
    active: view.active, archived: view.archived,
  }
}

async function write(ctx: TenantContext, id: string, config: Omit<PriceListConfig, "id">, action: string, repo: IPricingRuleRepository) {
  // Mỗi lần lưu là một dòng mới — dòng cũ giữ làm lịch sử (quy ước của `pricing_rules`)
  await repo.create(ctx, { key: priceListKey(id), value: config, branchId: null, createdBy: ctx.userId })
  await recordAuditLog(ctx, { action, entityType: "price_list", entityId: id, after: { name: config.name, active: config.active, archived: config.archived } })
}

/** Tạo (id = null) hoặc sửa một bảng giá (`L3`). */
export async function savePriceList(
  ctx: TenantContext,
  id: string | null,
  input: PriceListInput,
  repo: IPricingRuleRepository = getPricingRuleRepository(),
): Promise<PriceListView> {
  const errors = validatePriceList(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  if (id) await findOrThrow(ctx, id, repo)
  else if ((await current(ctx, repo)).length >= MAX_PRICE_LISTS) throw conflict(`Mỗi cửa hàng tối đa ${MAX_PRICE_LISTS} bảng giá`)

  const finalId = id ?? randomUUID()
  await write(ctx, finalId, { ...input, name: input.name.trim(), archived: false }, id ? "price_list.update" : "price_list.create", repo)
  return findOrThrow(ctx, finalId, repo)
}

/** Công tắc Đang dùng của một bảng giá. */
export async function setPriceListActive(
  ctx: TenantContext,
  id: string,
  active: boolean,
  repo: IPricingRuleRepository = getPricingRuleRepository(),
): Promise<PriceListView> {
  const config = configOf(await findOrThrow(ctx, id, repo))
  await write(ctx, id, { ...config, active }, active ? "price_list.activate" : "price_list.deactivate", repo)
  return findOrThrow(ctx, id, repo)
}

/** Xoá khỏi danh sách (vẫn giữ lịch sử các phiên bản). */
export async function archivePriceList(ctx: TenantContext, id: string, repo: IPricingRuleRepository = getPricingRuleRepository()): Promise<void> {
  const config = configOf(await findOrThrow(ctx, id, repo))
  await write(ctx, id, { ...config, archived: true, active: false }, "price_list.archive", repo)
}

/** Bảng giá dựng sẵn để xem/in: nhóm theo loại + ưu đãi đang bật (cùng nguồn ma trận ưu đãi). */
export async function getPriceListDocument(
  ctx: TenantContext,
  id: string,
  repo: IPricingRuleRepository = getPricingRuleRepository(),
  productRepo: IProductRepository = getProductRepository(),
  loadPromotions: PromotionLoader = listActiveShopPromotions,
): Promise<PriceListDocument> {
  const priceList = await findOrThrow(ctx, id, repo)
  const [products, promotions] = await Promise.all([
    productRepo.list(ctx, { status: "ACTIVE" }, { limit: MAX_PRICE_LIST_PRODUCTS }),
    priceList.showPromotions ? loadPromotions(ctx.organizationId) : Promise.resolve([]),
  ])
  const groups = buildPriceListGroups(priceList, products)
  return {
    priceList,
    groups,
    promotions,
    categories: categoriesOf(products),
    productCount: groups.reduce((n, g) => n + g.rows.length, 0),
  }
}
