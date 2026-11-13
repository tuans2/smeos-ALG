"use client"

import React, { useState } from "react"
import { ChevronLeft, ChevronRight } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"
import type { CalendarDay, TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import { SlaBadge, ViewState, codeOf, StaffNametagGroup } from "./tracking-bits"

const DAY = 86_400_000
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" })

/** Lịch giao: 7 ngày từ ngày chọn (hoặc khoảng ngày giao ở bộ lọc), nhóm theo khung giờ. */
export function CalendarView({ qs, from: fixedFrom, to: fixedTo, onOpen }: { qs: string; from: string; to: string; onOpen: (i: TrackingViewItem) => void }) {
  const [start, setStart] = useState(() => iso(Date.now() + 7 * 3_600_000))
  const from = fixedFrom || start
  const to = fixedTo || iso(Date.parse(from) + 6 * DAY)
  const res = useApi<{ data: { days: CalendarDay[]; total: number } }>(`/api/v1/greeting-card/tracking?view=calendar&from=${from}&to=${to}&${qs}`, { refreshInterval: 30_000 })
  const days = res.data?.data.days ?? []
  return (
    <div className="flex flex-col gap-3">
      {!fixedFrom && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" aria-label="Tuần trước" onClick={() => setStart(iso(Date.parse(start) - 7 * DAY))}><ChevronLeft size={16} aria-hidden="true" /></Button>
          <span className="text-body-sm font-semibold text-text">{label(from)} – {label(to)}</span>
          <Button type="button" variant="outline" size="sm" aria-label="Tuần sau" onClick={() => setStart(iso(Date.parse(start) + 7 * DAY))}><ChevronRight size={16} aria-hidden="true" /></Button>
        </div>
      )}
      <ViewState loading={res.isLoading} error={res.error} empty={!!res.data && days.length === 0}>
        <div className="flex flex-col gap-3">
          {days.map((d) => (
            <section key={d.date} aria-label={label(d.date)} className="rounded-2xl border border-border bg-surface p-3">
              <h3 className="mb-2 text-body-sm font-extrabold text-text">{label(d.date)} · {d.count} đơn</h3>
              {d.slots.map((s) => (
                <div key={s.slot} className="mb-2">
                  <p className="text-caption font-semibold text-text-muted">{s.slot}</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {s.items.map((i) => (
                      <li key={i.id}>
                        <Button variant="outline" type="button" onClick={() => onOpen(i)} data-focus-key={i.orderId ?? i.sessionId}
                          className="h-auto font-[inherit] flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left text-body-sm hover:border-primary">
                          <div className="flex flex-wrap items-center gap-2">
                            <span><strong>{i.customerName}</strong> · <span className="font-mono text-caption text-text-muted">{codeOf(i)}</span> · {i.currentStepTitle}</span>
                            <StaffNametagGroup item={i} compact />
                          </div>
                          <SlaBadge item={i} compact />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </ViewState>
    </div>
  )
}
