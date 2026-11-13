"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Pricing { smsCredit: number; znsCredit: number; usdToVnd: number; creditValueVnd: number; smsCostVnd: number; znsCostVnd: number; defaultMonthlyLimit: number | null; messageOverdraftCredit: number; brandExtraOptionCredit: number }
const FIELDS: Array<{ key: keyof Pricing; label: string; hint: string }> = [
  { key: "smsCredit", label: "Credit mỗi tin SMS", hint: "0 = không thu" },
  { key: "znsCredit", label: "Credit mỗi tin Zalo ZNS", hint: "0 = không thu" },
  { key: "usdToVnd", label: "Tỷ giá USD → VND", hint: "Quy đổi chi phí nhà cung cấp" },
  { key: "creditValueVnd", label: "Giá trị 1 credit (đ)", hint: "Tính biên lợi nhuận" },
  { key: "smsCostVnd", label: "Giá vốn mỗi tin SMS (đ)", hint: "Chi phí tham chiếu" },
  { key: "znsCostVnd", label: "Giá vốn mỗi tin ZNS (đ)", hint: "Chi phí tham chiếu" },
  { key: "defaultMonthlyLimit", label: "Hạn mức credit/tháng mặc định", hint: "Bỏ trống = không giới hạn" },
  { key: "messageOverdraftCredit", label: "Mức thấu chi tin nhắn (credit)", hint: "Hết credit vẫn gửi tin khách tới mức âm này; 0 = dừng gửi" },
  { key: "brandExtraOptionCredit", label: "Credit mỗi phương án tạo thêm (Thương hiệu)", hint: "Bộ nhận diện và Landing page; 3 phương án đầu miễn phí" },
]

/** Console → Mức dùng → Quy đổi credit (PO Q10, checklist ALG 10.3, 10.4). Sửa cần `N3`. */
export function CreditPricingCard() {
  const [draft, setDraft] = useState<Record<keyof Pricing, string> | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/v1/platform/credit-pricing")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: Pricing } | null) => {
        if (!j) return
        setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, j.data[f.key] === null ? "" : String(j.data[f.key])])) as Record<keyof Pricing, string>)
      })
      .catch(() => setDraft(null))
  }, [])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setMessage(null)
    const body = Object.fromEntries(FIELDS.map((f) => [f.key, f.key === "defaultMonthlyLimit" && draft[f.key].trim() === "" ? null : Number(draft[f.key])]))
    const res = await fetch("/api/v1/platform/credit-pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null)
    setSaving(false)
    if (res?.ok) { setMessage("Đã lưu quy đổi credit"); return }
    const j = (await res?.json().catch(() => null)) as { error?: { details?: { value?: string } } } | null
    setMessage(j?.error?.details?.value ?? "Không lưu được")
  }

  if (!draft) return null
  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-body-sm font-bold text-text">Quy đổi credit</p>
        <p className="text-caption text-text-muted">Mọi dịch vụ trừ chung một số dư credit. Hạn mức riêng từng tổ chức đặt ở trang chi tiết tổ chức.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-caption text-text">
            {f.label}
            <Input inputMode="numeric" value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value.replace(/[^\d.]/g, "") })} className="h-9" aria-label={f.label} />
            <span className="text-text-muted">{f.hint}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        {message && <span role="status" className="text-caption text-text-muted">{message}</span>}
        <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void save()}>Lưu</Button>
      </div>
    </Card>
  )
}
