import type { TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { ownSaleScope, parseVisibility } from "../domain/order-visibility"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"

/** Sale phụ trách cần lọc cho người đang xem (theo cài đặt của Điều hành), hoặc `null` = tất cả. */
export async function resolveSaleScope(ctx: TenantContext): Promise<string | null> {
  const org = await getCurrentOrganization(ctx)
  return ownSaleScope(parseVisibility(org?.settings), { userId: ctx.userId, capabilities: ctx.capabilities })
}

/**
 * Thao tác trên một đơn (thu tiền, báo giá, huỷ, hoàn) chỉ trong phạm vi xem của người làm:
 * sale "chỉ khách của mình" không đụng được đơn của sale khác — trả 404, không lộ là có tồn tại.
 */
export async function assertOrderInScope(ctx: TenantContext, orderId: string, repo = getBrochureOrderRepository()): Promise<void> {
  const scope = await resolveSaleScope(ctx)
  if (!scope) return
  if ((await repo.saleOfOrder(ctx, orderId)) !== scope) throw notFound()
}
