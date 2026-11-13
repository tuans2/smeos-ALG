/**
 * `POST /api/v1/orders/:id/quote` (R15) — Sale báo giá đơn ngoài Thẻ chào (§2.1, PO 31/10/2026).
 * Chỉ đơn nháp, chưa thu đồng nào. Thẻ chào giữ báo giá R11 riêng (B2) — đơn BROCHURE trả 404 ở đây.
 */

import { notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { assertWithinPriceBounds } from "@/modules/costing/use-cases/price-floor-guard"
import type { TenantContext } from "@/core/tenancy"
import { ApprovalRequestRepository } from "../infra/approval-request-repository"

export const MAX_QUOTE_VND = 1_000_000_000

export async function quoteOrder(
  ctx: TenantContext,
  orderId: string,
  input: { totalVnd?: unknown; note?: unknown },
  repo: Pick<ApprovalRequestRepository, "findOrder" | "quote"> = new ApprovalRequestRepository(),
) {
  const total = input.totalVnd
  if (typeof total !== "number" || !Number.isInteger(total) || total <= 0 || total > MAX_QUOTE_VND) {
    throw validationFailed({ totalVnd: "Giá phải là số nguyên dương (đồng)" })
  }
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 500) : null
  const order = await repo.findOrder(ctx, orderId)
  if (!order) throw notFound()
  // Dưới sàn cần C10 (checklist ALG 3.4); vượt trần cần C9 (PO 07/11/2026, Q3) — giá trọn gói chỉ so với trần khi
  // mọi dòng đều là sản phẩm có giá vốn (dòng tự do không có trần)
  const items = order.items ?? []
  const allProducts = items.length > 0 && items.every((i) => i.product_id)
  await assertWithinPriceBounds(ctx, items.map((i) => ({ productId: i.product_id, quantity: i.quantity })), total, allProducts ? total : null)
  if (!(await repo.quote(ctx, orderId, total, note))) throw unprocessable("Chỉ báo giá được đơn nháp chưa thu tiền")
  return { orderId, totalVnd: total }
}
