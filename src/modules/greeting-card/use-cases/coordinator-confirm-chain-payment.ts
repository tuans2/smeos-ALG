/**
 * coordinator-confirm-chain-payment.ts
 *
 * PO 22/10/2026 — với tổ chức Chuỗi, nút của Điều phối là "Xác nhận đã nhận tiền", không phải "nhận đơn":
 * chỉ ghi nhận thanh toán rồi chọn cửa hàng gia công (tự động hoặc thủ công). Đơn KHÔNG chuyển sang
 * "Đã phân công" và khách KHÔNG nhận tin "Đã nhận đơn" ở bước này — tin đó gửi khi chi nhánh chốt làm
 * (`SubcontractOrderRepository`, tự xác nhận đơn khi chi nhánh chốt).
 */

import type { TenantContext } from "@/core/tenancy"
import type { BrochureOrderRepository } from "../infra/brochure-order-repository"
import { dispatchAfterPaymentConfirmed, type DispatchAfterPaymentOutcome } from "./dispatch-after-payment"

type ProgressOrder = Parameters<BrochureOrderRepository["applyProgress"]>[1] & { status: string }

export async function confirmChainPaymentAndDispatch(
  ctx: TenantContext,
  order: ProgressOrder,
  input: { note?: string | undefined; manualDispatch?: boolean | undefined },
  repo: Pick<BrochureOrderRepository, "applyProgress">,
  dispatch: typeof dispatchAfterPaymentConfirmed = dispatchAfterPaymentConfirmed
): Promise<Awaited<ReturnType<BrochureOrderRepository["applyProgress"]>> & { dispatch: DispatchAfterPaymentOutcome }> {
  const result = await repo.applyProgress(ctx, order, {
    eventType: "COORDINATOR_PAYMENT_CONFIRMED",
    orderStatus: order.status === "DRAFT" ? "CONFIRMED" : undefined,
    noteAppend: `[Điều phối xác nhận đã nhận tiền] ${input.note?.trim() || "Đã đối chiếu ảnh chuyển khoản"}`,
  })
  const outcome = await dispatch(ctx, order.id, { manualDispatch: input.manualDispatch })
  return { ...result, dispatch: outcome }
}
