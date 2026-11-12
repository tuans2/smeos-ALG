"use client"

import React, { useState } from "react"
import { Clock, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { PhotoFeedbackForm } from "./photo-feedback-form"

export interface PhotoApprovalCardProps {
  orderCode: string
  sendCode?: string | null | undefined
  uploadedAt: string
  countdownMinutes: number
  /** Đơn đặt cọc còn nợ: sau xác nhận ảnh sẽ hiện mã QR thanh toán lần 2. */
  hasBalanceDue?: boolean
  /** Khách đã góp ý: đồng hồ dừng, chờ cửa hàng gửi lại ảnh (checklist ALG 5.13). */
  feedbackSent?: boolean
  onApproved: () => void
}

export function PhotoApprovalCard({
  orderCode,
  sendCode,
  uploadedAt,
  countdownMinutes,
  hasBalanceDue = false,
  feedbackSent = false,
  onApproved,
}: PhotoApprovalCardProps) {
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expireTime = Date.parse(uploadedAt) + countdownMinutes * 60_000
  const [timeLeftMs, setTimeLeftMs] = useState(() => Math.max(0, expireTime - Date.now()))

  React.useEffect(() => {
    if (timeLeftMs <= 0 || feedbackSent) return
    const timer = setInterval(() => {
      const left = Math.max(0, expireTime - Date.now())
      setTimeLeftMs(left)
      if (left <= 0) {
        clearInterval(timer)
        onApproved()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [expireTime, onApproved, timeLeftMs, feedbackSent])

  async function handleApprove() {
    setApproving(true)
    setError(null)
    try {
      const url = `/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}/approve-photo${
        sendCode ? `?link=${encodeURIComponent(sendCode)}` : ""
      }`
      await apiSend(url, "POST", {})
      onApproved()
    } catch {
      setError("Không thể xác nhận, vui lòng thử lại")
    } finally {
      setApproving(false)
    }
  }

  if (feedbackSent) {
    return (
      <div role="status" className="p-4 rounded-xl border border-border bg-surface-alt flex flex-col gap-1 mt-1">
        <span className="text-body-sm font-extrabold text-text">Đã gửi góp ý cho cửa hàng</span>
        <span className="text-caption text-text-muted">Cửa hàng sẽ chỉnh theo góp ý và gửi lại ảnh để bạn xem trước khi giao.</span>
      </div>
    )
  }

  const totalSec = Math.floor(timeLeftMs / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0")
  const ss = String(totalSec % 60).padStart(2, "0")

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-3 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
          <Clock size={16} className="text-primary animate-pulse motion-reduce:animate-none" />
          <span>Xác nhận hình ảnh sản phẩm</span>
        </span>
        <span className="text-body-sm font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg tabular-nums">
          {mm}:{ss}
        </span>
      </div>

      <p className="text-caption text-text-muted leading-relaxed">
        Vui lòng xem kỹ ảnh hoa thành phẩm ở trên.{" "}
        {hasBalanceDue ? (
          <>
            Sau khi xác nhận, bạn sẽ được hướng dẫn <strong>thanh toán phần còn lại</strong> để cửa hàng tiến hành giao hoa.
          </>
        ) : (
          <>
            Sau khi đồng hồ kết thúc, hệ thống sẽ <strong>tự động xác nhận</strong> để xưởng tiến hành bàn giao đơn cho tài xế giao hoa.
          </>
        )}
      </p>

      {error && <p className="text-caption text-danger">{error}</p>}

      <Button
        type="button"
        size="sm"
        onClick={() => void handleApprove()}
        disabled={approving || timeLeftMs <= 0}
        className="h-10 w-full gap-1.5 rounded-xl font-bold bg-primary text-white"
      >
        <CheckCircle2 size={16} />
        <span>
          {approving
            ? "Đang xác nhận..."
            : hasBalanceDue
            ? "Xác nhận ảnh và tiếp tục thanh toán"
            : "Tôi đồng ý với hình ảnh sản phẩm này"}
        </span>
      </Button>
      <PhotoFeedbackForm orderCode={orderCode} sendCode={sendCode} disabled={approving || timeLeftMs <= 0} onSent={onApproved} />
    </div>
  )
}
