import type { TenantContext } from "@/core/tenancy"
import { loadTrackingDataset } from "./get-tracking-pipeline"
import { TrackingPipelineRepository, getTrackingPipelineRepository } from "../infra/tracking-pipeline-repository"
import { slaStatusOf, type TrackingViewItem } from "../domain/tracking-views"

/**
 * Trạng thái việc của từng ĐƠN cho bảng Điều phối (bước, kẹt, thời gian chuẩn) — cùng nguồn và cách
 * tính với "Theo dõi tiến độ" nhưng bỏ link chưa có đơn. Trước đây bảng Điều phối tải cả tập theo dõi
 * (mọi link khách đang lướt, kể cả phiên rác) mỗi phút chỉ để lấy phần đơn hàng (16/10/2026).
 */
export async function getCoordinatorWork(ctx: TenantContext, repo = getTrackingPipelineRepository(), now = new Date()): Promise<TrackingViewItem[]> {
  const { items, sla } = await loadTrackingDataset(ctx, repo, now, { ordersOnly: true })
  return items.filter((i) => i.orderId).map((i) => ({ ...i, sla: slaStatusOf(i, sla, now) }))
}
