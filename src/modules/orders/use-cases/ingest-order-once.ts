/**
 * Chống bấm đúp khi tạo đơn (audit API-11, PO duyệt 07/11/2026; chuẩn API Contract v1.1 §7).
 *
 * Client gửi `Idempotency-Key` (một khoá cho mỗi lần soạn đơn). Cùng tổ chức + cùng khoá → trả lại đơn đã tạo,
 * không tạo đơn thứ hai; khoá duy nhất `(organization_id, idempotency_key)` ở `orders` chặn cả hai request gửi
 * đồng thời. Lưu kèm băm SHA-256 dạng chuẩn của thân đã kiểm (PO 11/11/2026): cùng khoá mà thân khác → 422
 * `IDEMPOTENCY_KEY_REUSED` (`details.order_id`), như job nội bộ. Đơn tạo trước khi có cột băm (băm NULL) vẫn trả lại
 * như cũ. Không có khoá → tạo đơn như trước.
 */

import { createHash } from "node:crypto"

import { AppError } from "@/core/http/errors"
import { branchScopeOf } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IngestOrderInput, OrderRecord } from "../domain/order-types"
import { canonicalJson } from "@/modules/jobs/domain/idempotency"
import { getOrderRepository } from "../infra/order-repository"
import { ingestOrder, type IngestOrderDeps } from "./ingest-order"

export const ORDER_IDEMPOTENCY_KEY_MAX = 255

export interface IngestOnceResult {
  order: OrderRecord
  /** `true` khi khoá đã dùng — đây là đơn tạo từ lần gửi trước. */
  replayed: boolean
}

export interface IngestOnceDeps {
  findByKey: (organizationId: string, key: string) => Promise<{ order: OrderRecord; bodyHash: string | null } | null>
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
  const bodyHash = orderBodyHash(input)

  const replay = async (): Promise<IngestOnceResult | null> => {
    const found = await deps.findByKey(ctx.organizationId, idempotencyKey)
    if (!found) return null
    const existing = found.order
    // Nhân viên chi nhánh chỉ thấy đơn chi nhánh mình — khoá của đơn chi nhánh khác không trả đơn đó ra
    const scope = branchScopeOf(ctx)
    if (scope && existing.branchId !== scope) {
      throw new AppError("CONFLICT", "Mã chống gửi trùng này đã được dùng cho một đơn khác.")
    }
    if (found.bodyHash !== null && found.bodyHash !== bodyHash) {
      throw new AppError("IDEMPOTENCY_KEY_REUSED", "Mã chống gửi trùng này đã dùng cho một đơn có nội dung khác — vui lòng tạo lại đơn.", { order_id: existing.id })
    }
    return { order: existing, replayed: true }
  }

  const earlier = await replay()
  if (earlier) return earlier
  try {
    return { order: await deps.ingest(ctx, { ...input, idempotencyKey, idempotencyBodyHash: bodyHash }), replayed: false }
  } catch (error) {
    // Hai request cùng khoá gửi đồng thời: người thua vỡ ở khoá duy nhất (giao dịch đã cuộn lại) — trả đơn
    // của người thắng thay vì lỗi. Không thấy đơn nào thì là lỗi thật.
    const winner = await replay()
    if (winner) return winner
    throw error
  }
}

/** Băm thân đã kiểm (không gồm khoá) theo dạng chuẩn JSON — thứ tự khoá không ảnh hưởng. */
export function orderBodyHash(input: IngestOrderInput): string {
  return createHash("sha256").update(canonicalJson(input)).digest("hex")
}
