"use client"

import React from "react"
import type { InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"
import {
  fulfilmentProgress,
  type FulfilmentStep,
  type SubcontractCardPayload,
  type SubcontractCardView,
} from "@/modules/internal-chat/domain/subcontract-card"
import { Package } from "@/components/ui/icon-set/package"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/i18n/formatters"

const STEP_LABEL: Record<FulfilmentStep, string> = {
  FINISHED_PHOTO: "Ảnh thành phẩm",
  SHIPPER: "Thông tin giao hàng",
  DELIVERY_PROOF: "Ảnh bàn giao",
}

const NEXT_ACTION_LABEL: Record<FulfilmentStep, string> = {
  FINISHED_PHOTO: "Gửi ảnh thành phẩm",
  SHIPPER: "Nhập thông tin giao hàng",
  DELIVERY_PROOF: "Gửi ảnh bàn giao",
}

function statusText(view: SubcontractCardView): { text: string; tone: "warning" | "primary" | "muted" | "success" } {
  if (view.stage === "INVITED") return { text: "Đang mời nhận đơn", tone: "warning" }
  if (view.stage === "GRACE") return { text: "Đã nhận — còn thời gian huỷ nhận", tone: "primary" }
  if (view.stage === "IN_PROGRESS") return { text: "Đang thực hiện", tone: "primary" }
  if (view.closedReason === "DONE") return { text: "Đã giao xong", tone: "success" }
  if (view.closedReason === "TAKEN") return { text: "Đã có nơi khác nhận", tone: "muted" }
  if (view.closedReason === "CANCELLED") return { text: "Đơn đã huỷ", tone: "muted" }
  return { text: "Lời mời đã hết hạn", tone: "muted" }
}

const TONE_CLASS = {
  warning: "bg-warning-subtle text-warning-text",
  primary: "bg-primary-subtle text-primary",
  success: "bg-success-subtle text-success",
  muted: "bg-surface-muted text-text-muted",
} as const

function deadlineText(iso: string | null): string | null {
  return iso ? formatDateTime(iso) || null : null
}

/**
 * Thẻ đơn gia công trong phòng trao đổi: trạng thái thật của đơn (tính lúc đọc) và nút mở Thẻ Gia Công để nhận đơn,
 * chốt làm, gửi ảnh thành phẩm, nhập thông tin giao hàng, gửi ảnh bàn giao — cùng quy trình với link Telegram.
 */
export function SubcontractTaskCard({ message }: { message: InternalChatMessage }) {
  const payload = message.actionPayload as unknown as SubcontractCardPayload
  const view = message.subcontractView
  if (!view) return null
  const status = statusText(view)
  const progress = fulfilmentProgress(view)
  const showSteps = view.stage === "IN_PROGRESS" || view.closedReason === "DONE"
  const deadline = deadlineText(view.deadlineAt)
  const actionLabel =
    view.stage === "INVITED" ? "Xem và nhận đơn" : view.stage === "GRACE" ? "Chốt làm hoặc huỷ nhận" : progress.next ? NEXT_ACTION_LABEL[progress.next] : "Mở đơn"

  return (
    <Card className="p-4 max-w-sm text-text space-y-3" variant="default">
      <div className="flex items-start gap-2">
        <Package className="w-4 h-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-meta font-semibold">{payload.title || `Đơn gia công #${payload.orderCode}`}</p>
          <span className={`inline-block mt-1 text-caption font-semibold px-2 py-0.5 rounded-full ${TONE_CLASS[status.tone]}`}>{status.text}</span>
        </div>
      </div>

      {message.content && <p className="text-caption text-text-muted whitespace-pre-line">{message.content}</p>}

      {deadline && (view.stage === "INVITED" || view.stage === "GRACE") && (
        <p className="text-caption text-text-muted inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Hạn: {deadline}
        </p>
      )}

      {showSteps && (
        <ol className="space-y-1" aria-label="Tiến độ thực hiện đơn">
          {(Object.keys(STEP_LABEL) as FulfilmentStep[]).map((step) => {
            const done = progress.done.includes(step)
            return (
              <li key={step} className={`text-caption inline-flex items-center gap-1.5 w-full ${done ? "text-success" : "text-text-muted"}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${done ? "" : "opacity-30"}`} aria-hidden="true" />
                {STEP_LABEL[step]}
                <span className="sr-only">{done ? " — đã xong" : " — chưa xong"}</span>
              </li>
            )
          })}
        </ol>
      )}

      {view.actionUrl && (
        <Button asChild size="sm" className="w-full">
          <a href={view.actionUrl}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {actionLabel}
          </a>
        </Button>
      )}
    </Card>
  )
}
