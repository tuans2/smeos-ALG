import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"

export interface OrderReferences {
  customerId?: string | null | undefined
  branchId?: string | null | undefined
  productIds?: ReadonlyArray<string | null | undefined>
  variantIds?: ReadonlyArray<string | null | undefined>
}

const distinct = (ids: ReadonlyArray<string | null | undefined> = []) => [...new Set(ids.filter((id): id is string => !!id))]

/**
 * Mọi ID tham chiếu của đơn phải thuộc đúng tổ chức `ctx` (audit BL-13). Khoá ngoại `orders.customer_id`,
 * `order_items.product_id/variant_id` chỉ bảo đảm bản ghi tồn tại, không bảo đảm cùng tổ chức — thiếu bước
 * này, tổ chức A gắn được khách của tổ chức B vào đơn rồi đọc lại qua quan hệ. Trả tên các trường vi phạm.
 */
export async function findForeignOrderReferences(ctx: TenantContext, refs: OrderReferences): Promise<string[]> {
  const productIds = distinct(refs.productIds)
  const variantIds = distinct(refs.variantIds)
  if (!refs.customerId && !refs.branchId && productIds.length === 0 && variantIds.length === 0) return []

  const [customer, branch, products, variants] = await Promise.all([
    refs.customerId ? prisma.customers.findFirst({ where: scopedWhere(ctx, { id: refs.customerId }), select: { id: true } }) : null,
    refs.branchId ? prisma.branches.findFirst({ where: scopedWhere(ctx, { id: refs.branchId }), select: { id: true } }) : null,
    productIds.length > 0 ? prisma.products.count({ where: scopedWhere(ctx, { id: { in: productIds } }) }) : 0,
    variantIds.length > 0 ? prisma.product_variants.count({ where: scopedWhere(ctx, { id: { in: variantIds } }) }) : 0,
  ])

  const foreign: string[] = []
  if (refs.customerId && !customer) foreign.push("customerId")
  if (refs.branchId && !branch) foreign.push("branchId")
  if (products !== productIds.length) foreign.push("items.productId")
  if (variants !== variantIds.length) foreign.push("items.variantId")
  return foreign
}
