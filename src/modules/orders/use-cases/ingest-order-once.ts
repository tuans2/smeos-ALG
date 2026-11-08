/**
 * Chống bấm đúp khi tạo đơn (audit API-11, PO duyệt 07/11/2026; chuẩn API Contract v1.1 §7).
 *
 * Client gửi `Idempotency-Key` (một khoá cho mỗi lần soạn đơn). Cùng tổ chức + cùng khoá → trả lại đơn đã tạo,
 * không tạo đơn thứ hai; khoá duy nhất `(organization_id, idempotency_key)` ở `orders` chặn cả hai request gửi
 * đồng thời. Không lưu thân yêu cầu nên không phân biệt "cùng khoá, thân khác" — khoá do client sinh cho từng
 * lần soạn đơn. Không có khoá → tạo đơn như trước.
 */

import { AppError } from "@/core/http/errors"
import { branchScopeOf } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IngestOrderInput, OrderRecord } from "../domain/order-types"
import { getOrderRepository } from "../infra/order-repository"
import { ingestOrder, type IngestOrderDeps } from "./ingest-order"

export const ORDER_IDEMPOTENCY_KEY_MAX = 255

export interface IngestOnceResult {
  order: OrderRecord
  /** `true` khi khoá đã dùng — đây là đơn tạo từ lần gửi trước. */
  replayed: boolean
}

export interface IngestOnceDeps {
  findByKey: (organizationId: string, key: string) => Promise<OrderRecord | null>
  ingest: (ctx: TenantContext, input: IngestOrderInput, deps?: IngestOrderDeps) => Promise<OrderRecord>
}

function defaultDeps(): IngestOnceDeps {
  return { findByKey: (org, key) => getOrderRepository().findByIdempotencyKey(org, key), ingest: ingestOrder }
}

export async function ingestOrderOnce(
  ctx: TenantContext,
  input: IngestOrderInput,
  idempotencyKey: string | null,
  deps: IngestOnceDeps = defaultDeps()
): Promise<IngestOnceResult> {
  if (!idempotencyKey) return { order: await deps.ingest(ctx, input), replayed: false }

  const replay = async (): Promise<IngestOnceResult | null> => {
    const existing = await deps.findByKey(ctx.organizationId, idempotencyKey)
    if (!existing) return null
    // Nhân viên chi nhánh chỉ thấy đơn chi nhánh mình — khoá của đơn chi nhánh khác không trả đơn đó ra
    const scope = branchScopeOf(ctx)
    if (scope && existing.branchId !== scope) {
      throw new AppError("CONFLICT", "Mã chống gửi trùng này đã được dùng cho một đơn khác.")
    }
    return { order: existing, replayed: true }
  }

  const earlier = await replay()
  if (earlier) return earlier
  try {
    return { order: await deps.ingest(ctx, { ...input, idempotencyKey }), replayed: false }
  } catch (error) {
    // Hai request cùng khoá gửi đồng thời: người thua vỡ ở khoá duy nhất (giao dịch đã cuộn lại) — trả đơn
    // của người thắng thay vì lỗi. Không thấy đơn nào thì là lỗi thật.
    const winner = await replay()
    if (winner) return winner
    throw error
  }
}
