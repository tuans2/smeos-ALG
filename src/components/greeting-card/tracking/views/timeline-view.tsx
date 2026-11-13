"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { usePagedList, useApi } from "@/components/greeting-card/greeting-api"
import { formatMinutes } from "@/modules/greeting-card/domain/step-sla"
import type { StepSegment, TimelineEvent } from "@/modules/greeting-card/domain/tracking-timeline"
import type { TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import { ListView } from "./list-view"
import type { TrackingViewState } from "./tracking-view-state"

const when = (s: string) => new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })

/** Dòng thời gian: danh sách đơn/link — bấm một đơn để mở Thẻ đơn hàng (lịch sử nằm trong tab "Lịch sử đơn hàng"). */
export function TimelineView({ qs, state, onChange, onOpen }: {
  qs: string; state: TrackingViewState; onChange: (p: Partial<TrackingViewState>) => void
  onOpen: (i: TrackingViewItem) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-text-muted">Chọn một đơn hoặc link để mở thẻ đơn hàng.</p>
      <ListView qs={qs} state={state} onChange={onChange} onOpen={onOpen} />
    </div>
  )
}

/** Lịch sử một đơn/link: từng bước đã qua so với thời gian chuẩn + mọi sự kiện. */
export function OrderHistoryPanel({ orderId, sessionId }: { orderId?: string | null | undefined; sessionId?: string | null | undefined }) {
  const refQs = orderId ? `order_id=${orderId}` : sessionId ? `session_id=${sessionId}` : null
  if (!refQs) return null
  return <HistoryContent refQs={refQs} />
}

function HistoryContent({ refQs }: { refQs: string }) {
  const url = `/api/v1/greeting-card/tracking/timeline?${refQs}`
  const head = useApi<{ segments: StepSegment[] }>(`${url}&limit=1`)
  const events = usePagedList<TimelineEvent>(url, 50)
  const segments = head.data?.segments ?? []
  return (
    <div className="flex flex-col gap-4">
      {head.error ? <p role="alert" className="text-body-sm text-danger">{(head.error as Error).message}</p> : (
        <ol className="flex flex-col gap-2" aria-label="Các bước đã qua">
          {segments.map((s) => (
            <li key={s.stepId} className={`rounded-xl border p-3 text-body-sm ${s.overMinutes > 0 ? "border-danger/50 bg-danger-bg/40" : "border-border bg-surface"}`}>
              <p className="font-bold text-text">{s.title}</p>
              <p className="text-caption text-text-muted">
                Vào {when(s.enteredAt)} · {s.leftAt ? `ở ${formatMinutes(s.durationMinutes)}` : `đang ở ${formatMinutes(s.durationMinutes)}`}
                {s.slaMinutes !== null && ` · chuẩn ${formatMinutes(s.slaMinutes)}`}
                {s.overMinutes > 0 && <span className="font-semibold text-danger"> · vượt {formatMinutes(s.overMinutes)}</span>}
              </p>
            </li>
          ))}
        </ol>
      )}
      <section aria-label="Sự kiện" className="flex flex-col gap-1">
        <h4 className="text-body-sm font-extrabold text-text">Sự kiện</h4>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {events.items.map((e, n) => (
            <li key={`${e.at}-${n}`} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-body-sm">
              <span>{e.label}{e.note ? ` · ${e.note}` : ""}</span>
              <span className="text-caption text-text-muted">{when(e.at)}</span>
            </li>
          ))}
        </ul>
        {events.hasMore && (
          <Button variant="outline" type="button" onClick={() => void events.loadMore()} className="px-0 py-0 gap-0 min-h-11 rounded-xl border border-border bg-surface text-body-sm font-semibold hover:bg-surface">
            {events.isLoadingMore ? "Đang tải..." : "Tải thêm"}
          </Button>
        )}
      </section>
    </div>
  )
}
