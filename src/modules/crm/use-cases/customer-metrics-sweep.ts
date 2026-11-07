/**
 * Bộ quét nền: khách có đơn vừa đổi → tính lại chi tiêu (thực thu), số đơn và hạng (PO 07/11/2026, Q6).
 * Trước đây chỉ số chỉ được tính lại khi có người MỞ trang chi tiết khách (GET có ghi) — hạng dùng để chiết khấu
 * và phân khúc nên luôn cũ. Quét theo `orders.updated_at` để bắt mọi đường đổi đơn (sổ đơn, Điều phối, Thẻ chào)
 * mà không chèn lời gọi vào từng đường. Vòng lặp có trần; lỗi một khách không dừng cả lượt.
 */

import { log } from "@/core/observability/log"
import { customersWithChangedOrders, syncCustomerMetrics } from "../infra/customer-metrics-repository"

const BATCH = 200
export const CUSTOMER_METRICS_MAX_PAGES = 10
/** Lần đầu sau khi khởi động: quét lại đơn đổi trong 24 giờ qua. */
export const CUSTOMER_METRICS_LOOKBACK_MS = 24 * 60 * 60 * 1000

export interface CustomerMetricsDeps {
  changed: typeof customersWithChangedOrders
  sync: typeof syncCustomerMetrics
}

export async function sweepCustomerMetrics(
  since: Date,
  deps: CustomerMetricsDeps = { changed: customersWithChangedOrders, sync: syncCustomerMetrics },
): Promise<{ synced: number; failed: number; nextSince: Date }> {
  let cursor = since
  let synced = 0
  let failed = 0
  const seen = new Set<string>()
  for (let page = 0; page < CUSTOMER_METRICS_MAX_PAGES; page += 1) {
    const rows = await deps.changed(cursor, BATCH)
    for (const r of rows) {
      const key = `${r.organization_id}:${r.customer_id}`
      if (!r.customer_id || seen.has(key)) continue
      seen.add(key)
      try {
        await deps.sync(r.organization_id, r.customer_id)
        synced += 1
      } catch (error: unknown) {
        failed += 1
        log.warn("crm.customer_metrics_failed", { organizationId: r.organization_id, feature: "crm", message: error instanceof Error ? error.message : String(error) })
      }
    }
    const last = rows.at(-1)
    if (!last) break
    cursor = last.updated_at
    if (rows.length < BATCH) break
  }
  return { synced, failed, nextSince: cursor }
}
