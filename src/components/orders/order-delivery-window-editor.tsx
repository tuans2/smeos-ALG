"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/inline-error"
import { Input } from "@/components/ui/input"
import { useSession } from "@/lib/session"

/**
 * Đổi giờ giao của đơn kèm lý do (`PATCH /orders/:id/delivery-window`, R21 — PO 11/11/2026). Lịch sử đơn giữ giá trị
 * cũ/mới; máy chủ chỉ cho người không có quyền Sửa đơn đổi đơn mình tạo. Đơn Thẻ Chào đổi ở trang Bộ sưu tập riêng.
 */
export function OrderDeliveryWindowEditor({
  orderId,
  current,
  onChanged,
}: {
  orderId: string
  current: { date: string; timeSlot?: string | undefined } | null | undefined
  onChanged: () => void
}) {
  const { can } = useSession()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(current?.date ?? "")
  const [timeSlot, setTimeSlot] = useState(current?.timeSlot ?? "")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (!can("R21")) return null
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Đổi giờ giao
      </Button>
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/delivery-window`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time_slot: timeSlot.trim() || undefined, reason }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        setError(body?.error?.message ?? "Không đổi được giờ giao")
        return
      }
      setOpen(false)
      setReason("")
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Input type="date" aria-label="Ngày giao mới" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input aria-label="Khung giờ giao mới" placeholder="VD: 16:00 - 18:00" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
      <Input aria-label="Lý do đổi giờ giao" placeholder="Lý do (bắt buộc), VD: khách bận họp" value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <InlineError message={error} />}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !date || reason.trim().length < 3}>
          {saving ? "Đang lưu..." : "Lưu giờ giao"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Huỷ
        </Button>
      </div>
    </div>
  )
}
