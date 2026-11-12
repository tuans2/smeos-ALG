"use client"

import { useEffect, useState } from "react"
import { Clock } from "@/components/ui/icons"

function remaining(until: string): number {
  return Math.max(0, Date.parse(until) - Date.now())
}

/**
 * Đồng hồ giữ đơn chờ chuyển khoản. Chỉ để nhắc khách — cửa hàng vẫn tự xử lý đơn
 * quá hạn; hết giờ thì hiện lời nhắc liên hệ thay vì khoá thanh toán.
 */
export function HoldCountdown({ until, onExpire, deadline = false }: {
  until: string
  /** Gọi một lần khi hết giờ (kể cả mở trang khi đã quá hạn). */
  onExpire?: (() => void) | undefined
  /** Hạn thanh toán: hết giờ là đơn bị huỷ (thay vì chỉ giữ đơn). */
  deadline?: boolean
}) {
  const [ms, setMs] = useState(() => remaining(until))

  useEffect(() => {
    if (remaining(until) <= 0) {
      onExpire?.()
      return
    }
    const timer = setInterval(() => {
      const left = remaining(until)
      setMs(left)
      if (left <= 0) {
        clearInterval(timer)
        onExpire?.()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [until, onExpire])

  if (ms <= 0) {
    if (deadline) return null
    return (
      <p role="status" className="mb-4 w-full rounded-xl bg-warning-bg px-3 py-2 text-body-sm text-warning-text">
        Đã quá thời gian giữ đơn. Nếu bạn vẫn muốn đặt, hãy chuyển khoản rồi liên hệ cửa hàng để xác nhận.
      </p>
    )
  }

  const totalSec = Math.floor(ms / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0")
  const ss = String(totalSec % 60).padStart(2, "0")
  return (
    <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-body-sm font-semibold text-primary">
      <Clock size={16} aria-hidden="true" />
      {deadline ? "Vui lòng thanh toán trong" : "Cửa hàng giữ đơn cho bạn trong"} <span className="tabular-nums" aria-live="off">{mm}:{ss}</span>
    </p>
  )
}
