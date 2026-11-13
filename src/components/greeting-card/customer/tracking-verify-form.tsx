"use client"

import { Input } from "@/components/ui/input"
import React, { useId, useState } from "react"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { Button } from "@/components/ui/button"

/**
 * Trang theo dõi mặc định là bản rút gọn (ai có mã đơn cũng mở được). Người đặt nhập 4 số cuối
 * SĐT để xem đầy đủ địa chỉ, lời nhắn thiệp và ảnh người nhận.
 */
export function TrackingVerifyForm({ orderCode, onVerified }: { orderCode: string; onVerified: (last4: string) => void }) {
  const uid = useId()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{4}$/.test(value)) return setError("Nhập đúng 4 số cuối")
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}`, "POST", { phoneLast4: value }, "Số không khớp")
      onVerified(value)
    } catch (err) {
      // 404 = số không khớp (máy chủ không nói rõ để tránh dò); 429 = thử quá nhiều lần
      setError(err instanceof Error && /quá nhanh|thử lại/.test(err.message) ? err.message : "Số không khớp với người đặt đơn")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-body-sm">
      <label htmlFor={`${uid}-last4`} className="text-text-muted">
        Bạn là người đặt? Nhập 4 số cuối số điện thoại để xem đầy đủ địa chỉ và lời nhắn thiệp.
      </label>
      <div className="flex gap-2">
        <Input
          id={`${uid}-last4`} inputMode="numeric" maxLength={4} value={value} autoComplete="off"
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className="h-11 w-28 rounded-lg border border-border bg-bg px-3 text-center tracking-widest text-text"
        />
        <Button type="submit" variant="primary" disabled={busy} className="h-11 flex-1">
          {busy ? "Đang kiểm tra..." : "Xem đầy đủ"}
        </Button>
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </form>
  )
}
