"use client"

import { Disclosure } from "@/components/ui/disclosure"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import React from "react"
import { ArrowDown, ArrowUp } from "@/components/ui/icons"
import { usePagedList } from "@/components/greeting-card/greeting-api"
import { formatMinutes } from "@/modules/greeting-card/domain/step-sla"
import type { SortField, TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import { LIST_COLUMNS, getIndustryListColumns, type ListColumn, type TrackingViewState } from "./tracking-view-state"
import { SlaBadge, ViewState, codeOf, vnd, StaffNametagGroup } from "./tracking-bits"
import { useSession } from "@/lib/session"

const SORTABLE: Partial<Record<ListColumn, SortField>> = { customer: "customerName", step: "step", age: "age", sla: "urgency", total: "totalVnd", delivery: "deliveryDate" }

function cell(c: ListColumn, i: TrackingViewItem): React.ReactNode {
  switch (c) {
    case "code": return codeOf(i)
    case "customer": return i.customerName
    case "sale": return <StaffNametagGroup item={i} />
    case "step": return i.currentStepTitle
    case "age": return formatMinutes(i.sla.ageMinutes)
    case "sla": return <SlaBadge item={i} compact />
    case "total": return vnd(i.totalVnd)
    case "delivery": return i.deliveryDate ? `${i.deliveryDate}${i.deliveryTimeSlot ? ` · ${i.deliveryTimeSlot}` : ""}` : "—"
    case "product": return i.productName
    case "channel": return i.channel
    case "phone": return i.customerPhone || "—"
  }
}

/** Danh sách: lọc, sắp xếp, phân trang ở máy chủ; chọn cột hiển thị. */
export function ListView({ qs, state, onChange, onOpen, onDetail, view = "list" }: {
  qs: string; state: TrackingViewState; onChange: (p: Partial<TrackingViewState>) => void; onOpen: (i: TrackingViewItem) => void
  onDetail?: ((i: TrackingViewItem) => void) | undefined
  view?: "list" | "queue"
}) {
  const { organization } = useSession()
  const listColumns = getIndustryListColumns(organization?.industry)
  const list = usePagedList<TrackingViewItem>(`/api/v1/greeting-card/tracking?view=${view}&${qs}`, 25)
  const cols = listColumns.filter((c) => state.columns.includes(c.id))
  const toggleSort = (f: SortField) => onChange(state.sort === f ? { dir: state.dir === "asc" ? "desc" : "asc" } : { sort: f, dir: "desc" })
  return (
    <div className="flex flex-col gap-3">
      {view === "list" && (
        <Disclosure label="Cột hiển thị" className="text-body-sm">
          <div className="mt-2 flex flex-wrap gap-3">
            {listColumns.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5">
                <Checkbox checked={state.columns.includes(c.id)}
                  onCheckedChange={(checked) => onChange({ columns: (checked === true) ? [...state.columns, c.id] : state.columns.filter((x) => x !== c.id) })} />
                {c.label}
              </label>
            ))}
          </div>
        </Disclosure>
      )}
      <ViewState loading={list.isLoading} error={list.error} empty={!list.isLoading && list.items.length === 0}>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-border bg-surface-alt text-caption text-text-muted">
              <tr>
                {cols.map((c) => {
                  const f = view === "list" ? SORTABLE[c.id] : undefined
                  return (
                    <th key={c.id} className="px-3 py-2" aria-sort={f && state.sort === f ? (state.dir === "asc" ? "ascending" : "descending") : undefined}>
                      {f ? (
                        <Button variant="ghost" type="button" onClick={() => toggleSort(f)} className="text-[length:inherit] h-auto p-0 inline-flex items-center gap-1 font-semibold">
                          {c.label}{state.sort === f && (state.dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                        </Button>
                      ) : c.label}
                    </th>
                  )
                })}
                {onDetail && <th className="px-3 py-2 text-right">Tác vụ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.items.map((i) => (
                <tr key={i.id} data-focus-key={i.orderId ?? i.sessionId} className="hover:bg-surface-alt">
                  {cols.map((c, n) => (
                    <td key={c.id} className="px-3 py-2 align-top">
                      {n === 0 ? <Button variant="ghost" type="button" onClick={() => onOpen(i)} className="text-[length:inherit] h-auto p-0 justify-start gap-0 text-left font-semibold text-primary hover:underline">{cell(c.id, i)}</Button> : cell(c.id, i)}
                    </td>
                  ))}
                  {onDetail && (
                    <td className="px-3 py-2 text-right align-top">
                      <Button variant="outline"
                        type="button"
                        onClick={() => onDetail(i)}
                        className="h-auto gap-0 rounded-lg border border-border px-2 py-1 text-caption font-semibold text-text hover:bg-surface-alt hover:text-primary"
                      >
                        Chi tiết
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.hasMore && (
          <Button variant="outline" type="button" onClick={() => void list.loadMore()} className="px-0 py-0 gap-0 min-h-11 rounded-xl border border-border bg-surface text-body-sm font-semibold hover:bg-surface">
            {list.isLoadingMore ? "Đang tải..." : "Tải thêm"}
          </Button>
        )}
      </ViewState>
    </div>
  )
}
