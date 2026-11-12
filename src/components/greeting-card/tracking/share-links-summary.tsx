"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { ChevronDown, Link2 } from "@/components/ui/icons"
import { useApi } from "@/components/greeting-card/greeting-api"

const hhmm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"


interface ShareLinkRow { code: string; catalogName: string; ownerName: string; channel: string | null; copiedAt: string; opens: number; orders: number }

/** Link bộ sưu tập đã sao chép (30 ngày): ai sao chép, bao nhiêu khách mở, bao nhiêu đơn — thu gọn. */
export function ShareLinksSummary() {
  const [open, setOpen] = useState(false)
  const links = useApi<{ data: ShareLinkRow[] }>(open ? "/api/v1/greeting-card/share-links" : null)
  return (
    <div className="rounded-2xl border border-border bg-surface">
      <Button variant="ghost" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="py-0 flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-body-sm font-bold text-text hover:bg-surface-alt">
        <span className="flex items-center gap-2"><Link2 size={16} className="text-primary" aria-hidden="true" /> Link bộ sưu tập đã sao chép</span>
        <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
      </Button>
      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {!links.data ? <li className="h-10 animate-pulse motion-reduce:animate-none bg-surface-alt" aria-busy="true" />
            : links.data.data.length === 0 ? <li className="p-3 text-body-sm text-text-muted">Chưa có ai sao chép link bộ sưu tập trong 30 ngày qua.</li>
            : links.data.data.map((l) => (
              <li key={l.code} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-body-sm">
                <span className="min-w-0"><strong>{l.ownerName}</strong> · {l.catalogName}{l.channel ? ` · ${l.channel}` : ""}</span>
                <span className="text-caption text-text-muted">Sao chép {hhmm(l.copiedAt)} · {l.opens} khách mở · {l.orders} đơn</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
