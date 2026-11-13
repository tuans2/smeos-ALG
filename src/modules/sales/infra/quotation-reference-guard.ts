import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { QuotationReferences } from "../domain/repositories/quotation-repository.interface"

/**
 * Kiểm mọi ID tham chiếu của báo giá thuộc đúng tổ chức `ctx`.
 *
 * Khoá ngoại của Postgres chỉ bảo đảm bản ghi tồn tại, không bảo đảm cùng tenant:
 * thiếu bước này, tổ chức A gắn được khách/lead của tổ chức B vào báo giá rồi đọc
 * lại tên và số điện thoại qua quan hệ `include`.
 *
 * Trả về tên các trường vi phạm; mảng rỗng nghĩa là hợp lệ.
 */
export async function findForeignQuotationReferences(
  ctx: TenantContext,
  refs: QuotationReferences,
): Promise<string[]> {
  const foreign: string[] = []
  const productIds = [...new Set((refs.productIds ?? []).filter((id): id is string => !!id))]

  const [lead, customer, assetUsage, ownedProducts] = await Promise.all([
    refs.leadId
      ? prisma.leads.findFirst({ where: scopedWhere(ctx, { id: refs.leadId }), select: { id: true } })
      : null,
    refs.customerId
      ? prisma.customers.findFirst({ where: scopedWhere(ctx, { id: refs.customerId, status: "ACTIVE" as const }), select: { id: true } })
      : null,
    refs.assetUsageId
      ? prisma.asset_usages.findFirst({
          where: scopedWhere(ctx, { id: refs.assetUsageId }),
          select: { id: true },
        })
      : null,
    productIds.length > 0
      ? prisma.products.count({ where: scopedWhere(ctx, { id: { in: productIds } }) })
      : 0,
  ])

  if (refs.leadId && !lead) foreign.push("leadId")
  if (refs.customerId && !customer) foreign.push("customerId")
  if (refs.assetUsageId && !assetUsage) foreign.push("assetUsageId")
  if (ownedProducts !== productIds.length) foreign.push("items.productId")

  return foreign
}
