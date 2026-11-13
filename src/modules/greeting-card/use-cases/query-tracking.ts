import type { TenantContext } from "@/core/tenancy"
import { loadTrackingDataset } from "./get-tracking-pipeline"
import { TrackingPipelineRepository, getTrackingPipelineRepository } from "../infra/tracking-pipeline-repository"
import { getIndustryPipelineSteps } from "../domain/tracking-pipeline-types"
import {
  calendarDays, dashboardOf, filterAndSort, kanbanColumns, paginate, slaStatusOf,
  type KanbanColumnLimits, type TrackingFilter, type TrackingSort, type TrackingViewItem,
} from "../domain/tracking-views"

export const TRACKING_VIEWS = ["kanban", "list", "calendar", "queue", "dashboard"] as const
export type TrackingView = (typeof TRACKING_VIEWS)[number]

export interface TrackingQueryParams {
  view: TrackingView
  filter: TrackingFilter
  sort: TrackingSort
  limit: number
  /** Kanban: số thẻ riêng của từng cột (nút "Xem thêm") */
  columnLimits?: KanbanColumnLimits | undefined
  cursor?: string | undefined
  /** Lịch: khoảng ngày giao (YYYY-MM-DD) */
  from?: string | undefined
  to?: string | undefined
}

/**
 * LỚP TRUY VẤN DÙNG CHUNG cho mọi view "Theo dõi tiến độ". Một lần đọc tập dữ liệu
 * (`loadTrackingDataset`: cách ly tổ chức + phạm vi xem của sale + suy bước/SLA), một bộ lọc /
 * sắp xếp chung; mỗi view chỉ khác cách trả kết quả. Trình duyệt chỉ nhận một trang, một nhóm
 * cột rút gọn, một khoảng lịch hoặc số tổng hợp — không nhận cả tập.
 */
export async function queryTracking(ctx: TenantContext, p: TrackingQueryParams, now = new Date(), repo = getTrackingPipelineRepository()) {
  const { items, sla, industryKey } = await loadTrackingDataset(ctx, repo, now)
  const steps = getIndustryPipelineSteps(industryKey)
  const enriched: TrackingViewItem[] = items.map((i) => ({ ...i, sla: slaStatusOf(i, sla, now) }))

  switch (p.view) {
    case "list":
      return { view: p.view, ...paginate(filterAndSort(enriched, p.filter, p.sort), p.limit, p.cursor) }
    case "kanban": {
      // Bộ lọc bước không áp cho Kanban — cột chính là bước
      const rows = filterAndSort(enriched, { ...p.filter, steps: undefined, category: undefined }, p.sort)
      return { view: p.view, columns: kanbanColumns(rows, p.limit, p.columnLimits, now.getTime(), steps), total: rows.length }
    }
    case "calendar": {
      const from = p.from ?? p.filter.deliveryFrom ?? now.toISOString().slice(0, 10)
      const to = p.to ?? p.filter.deliveryTo ?? from
      return { view: p.view, from, to, days: calendarDays(filterAndSort(enriched, p.filter, { field: "deliveryDate", dir: "asc" }), from, to) }
    }
    case "queue": {
      // Việc cần làm: quá hạn hoặc sắp quá hạn, gấp nhất lên đầu
      const rows = filterAndSort(enriched, { ...p.filter, sla: "ATTENTION" }, { field: "urgency", dir: "desc" })
      return { view: p.view, ...paginate(rows, p.limit, p.cursor) }
    }
    case "dashboard":
      return { view: p.view, ...dashboardOf(filterAndSort(enriched, p.filter, p.sort), steps) }
  }
}
