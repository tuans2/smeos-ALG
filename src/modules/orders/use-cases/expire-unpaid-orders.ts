import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { AUTO_CANCEL_REASON } from "@/modules/greeting-card/domain/background-sweep"
import { listExpiredUnpaidOrders } from "../infra/unpaid-order-expiry-query"
import { cancelOrder } from "./cancel-order"

export const UNPAID_EXPIRY_BATCH = 100

export interface ExpireUnpaidDeps {
  list: typeof listExpiredUnpaidOrders
  cancel: (ctx: TenantContext, orderId: string, reason: string) => Promise<unknown>
}

/** Ngữ cảnh hệ thống của lượt quét: không phiên người dùng, chỉ quyền huỷ đơn (trần cứng `R6`). */
function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: "system:unpaid-expiry", branchId: null, capabilities: new Set(["R6"]) }
}

/**
 * Tự huỷ đơn chưa thanh toán quá hạn (audit hành trình O10, gói UJ-12). Huỷ qua đúng `cancelOrder` — cùng luật,
 * cùng bước bù trừ (hoàn tồn, trả lead về "Theo dõi", nhật ký, thông báo). Lý do huỷ trùng với Thẻ chào nên bộ
 * quét "lead cứu đơn" tự nhận các đơn này. Lỗi một đơn không chặn đơn khác; lỗi cả lượt → `null`.
 */
export async function expireUnpaidOrders(
  now: Date = new Date(),
  deps: ExpireUnpaidDeps = { list: listExpiredUnpaidOrders, cancel: (ctx, id, reason) => cancelOrder(ctx, id, reason) },
): Promise<{ cancelled: number; failed: number } | null> {
  try {
    const candidates = await deps.list(now, UNPAID_EXPIRY_BATCH)
    let cancelled = 0
    let failed = 0
    for (const c of candidates) {
      try {
        await deps.cancel(systemContext(c.organizationId), c.orderId, AUTO_CANCEL_REASON)
        cancelled++
      } catch (error) {
        failed++
        log.warn("orders.unpaid_expiry_failed", { orderId: c.orderId, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { cancelled, failed }
  } catch (error) {
    log.error("orders.unpaid_expiry_sweep_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
