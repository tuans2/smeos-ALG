"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { MessageSquare, Phone } from "@/components/ui/icons"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { TrackingStepperView } from "@/components/greeting-card/tracking/tracking-stepper-view"
import type { StepOwner } from "@/modules/greeting-card/domain/step-sla"
import { WorkStatus } from "./work-status"
import type { TrackingPipelineItem, TrackingPipelineStepId } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import { StaffNametagGroup } from "@/components/greeting-card/staff-nametag"

interface Props {
  item: TrackingPipelineItem
  /** Vai của người đang xem — việc kẹt đúng vai này được nhấn mạnh "Cần bạn". */
  me: StepOwner
  onOpenNotes: (item: TrackingPipelineItem, stepId?: TrackingPipelineStepId) => void
  /** Nút việc riêng của từng tab (vd. Điều phối: Phân công, Giao ship…). */
  actions?: React.ReactNode
  now: number
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`
export const zaloHref = (phone: string) => `https://zalo.me/${phone.replace(/\D/g, "").replace(/^84/, "0")}`

/** Thẻ đơn: trạng thái hiện tại là phần to nhất; thông tin khách/mẫu gọn bên dưới. */
export function WorkItemCard({ item, me, onOpenNotes, actions, now }: Props) {
  const mine = item.stuck?.owner === me
  const due = [item.deliveryDate?.split("-").reverse().slice(0, 2).join("/"), item.deliveryTimeSlot].filter(Boolean).join(" · ")

  return (
    <article data-focus-key={item.orderId ?? item.sessionId} className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-xs transition-shadow ${mine ? "border-danger/50" : "border-border"}`}>
      <WorkStatus item={item} me={me} now={now}
        code={
          <div className="flex flex-col items-end gap-1.5">
            <span className="font-mono text-caption text-text-muted">{item.orderCode ? `Đơn ${item.orderCode}` : `Link ${item.sendCode}`}</span>
            <StaffNametagGroup item={item} />
          </div>
        } />

      <TrackingStepperView
        steps={item.steps}
        currentStepId={item.currentStepId}
        stuck={!!item.stuck}
        onSelectStepNote={(stepId) => onOpenNotes(item, stepId)}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border">
          <FlowerImage src={item.productImageUrl} alt={item.productName} sizes="48px" fallback="icon" className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-body-sm font-bold text-text">{item.customerName}</p>
          <p className="truncate text-caption text-text-muted">
            {item.productName} · {item.totalVnd > 0 ? vnd(item.totalVnd) : "Chưa có giá"}{due ? ` · Giao ${due}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
          {item.customerPhone && (
            <>
              <a href={`tel:${item.customerPhone}`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-caption font-bold text-text hover:bg-surface-alt">
                <Phone size={13} aria-hidden="true" /> Gọi
              </a>
              <a href={zaloHref(item.customerPhone)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-lg border border-border px-2.5 text-caption font-bold text-text hover:bg-surface-alt">
                Zalo
              </a>
            </>
          )}
          <Button variant="outline"
            type="button"
            onClick={() => onOpenNotes(item, item.currentStepId)}
            className="py-0 inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-caption font-bold text-text hover:bg-surface-alt"
          >
            <MessageSquare size={13} className="text-primary" aria-hidden="true" />
            Nhắn tin
          </Button>
          {actions}
        </div>
      </div>
    </article>
  )
}
