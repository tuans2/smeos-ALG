/**
 * dispatch-after-payment.ts
 *
 * PO 22/10/2026 — tổ chức Chuỗi: xác nhận đã nhận tiền (Điều hành, Điều phối qua ảnh bill, SePay, hay tự
 * duyệt sau 15 phút) xong thì chọn cửa hàng gia công theo cài đặt:
 * - Tự động hoàn toàn (mặc định, `chain_dispatch_policy.enabled`): hệ thống tự chọn và phát lệnh ngay.
 * - Thủ công: Điều phối tự chọn trong Thẻ gia công.
 * - Đang tự động nhưng người xác nhận tick "Tự chọn cửa hàng cho đơn này" → đơn đó thủ công.
 * Tiệm một cửa hàng không đi luồng này. Gọi lặp an toàn: đơn đã có phiên mời thì không phát lại.
 */

import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { parseBrochureWorkflowPolicy } from "../domain/brochure-workflow-policy"
import { parseChainDispatchPolicy } from "../domain/chain-dispatch-policy"
import { GreetingCardRepository } from "../infra/greeting-card-repository"
import { SubcontractOrderRepository } from "../infra/subcontract-order-repository"
import { startChainDispatch } from "./start-chain-dispatch"

export type DispatchAfterPaymentOutcome =
  | { mode: "NOT_CHAIN" }
  | { mode: "MANUAL" }
  | { mode: "ALREADY_DISPATCHED" }
  | { mode: "AUTO"; dispatched: boolean; sentCount: number; reason?: string }

export interface DispatchAfterPaymentDeps {
  loadShop: (organizationId: string) => Promise<{ settings: unknown; type: string | null }>
  hasDispatch: (ctx: TenantContext, orderId: string) => Promise<boolean>
  dispatch: (ctx: TenantContext, orderId: string) => Promise<{ dispatched: boolean; sentCount: number }>
}

const defaultDeps: DispatchAfterPaymentDeps = {
  loadShop: async (orgId) => {
    const shop = await new GreetingCardRepository().getShopProfile(orgId)
    return { settings: shop.settings, type: shop.type ?? null }
  },
  hasDispatch: async (ctx, orderId) => {
    const state = await new SubcontractOrderRepository().loadSubcontractState(ctx, orderId)
    // Đã chuyển Điều phối (hết vòng) hay đã huỷ thì để người chọn lại bằng tay, không tự phát
    return Boolean(state)
  },
  dispatch: (ctx, orderId) => startChainDispatch(ctx, orderId),
}

export async function dispatchAfterPaymentConfirmed(
  ctx: TenantContext,
  orderId: string,
  opts: { manualDispatch?: boolean | undefined } = {},
  deps: DispatchAfterPaymentDeps = defaultDeps
): Promise<DispatchAfterPaymentOutcome> {
  const shop = await deps.loadShop(ctx.organizationId)
  const workflow = parseBrochureWorkflowPolicy(shop.settings, shop.type)
  if (!workflow.requireCoordinatorAcceptance) return { mode: "NOT_CHAIN" }

  const policy = parseChainDispatchPolicy(shop.settings)
  if (!policy.enabled || opts.manualDispatch) return { mode: "MANUAL" }
  if (await deps.hasDispatch(ctx, orderId)) return { mode: "ALREADY_DISPATCHED" }

  try {
    const res = await deps.dispatch(ctx, orderId)
    log.info("chain_dispatch.auto_after_payment", { organizationId: ctx.organizationId, orderId, sentCount: res.sentCount })
    return { mode: "AUTO", dispatched: res.dispatched, sentCount: res.sentCount }
  } catch (err) {
    // Không có chi nhánh phù hợp / đơn đổi trạng thái — tiền vẫn đã ghi nhận, Điều phối chọn tay
    const reason = err instanceof Error ? err.message : String(err)
    log.warn("chain_dispatch.auto_after_payment_failed", { organizationId: ctx.organizationId, orderId, reason })
    return { mode: "AUTO", dispatched: false, sentCount: 0, reason }
  }
}
