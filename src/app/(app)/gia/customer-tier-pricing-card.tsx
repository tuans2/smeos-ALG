"use client"

import { useEffect, useState } from "react"

import { Crown } from "@/components/ui/icon-set/crown"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CUSTOMER_TIERS, CUSTOMER_TIER_LABEL, type CustomerTier, type PeakHourWindow } from "@/modules/products/domain/customer-tier-pricing"

type Peak = { startHour: string; endHour: string; vnd: string }
const toPeak = (w: PeakHourWindow): Peak => ({ startHour: String(w.startHour), endHour: String(w.endHour), vnd: String(w.vnd) })

/**
 * Chiết khấu theo hạng khách (Đồng/Bạc/Vàng/VIP) và phụ phí giờ cao điểm (checklist ALG 3.1). Áp ở báo giá
 * Thẻ Chào khi nhận diện được khách qua SĐT và khung giờ giao; mỗi khoản hiện thành một dòng cho khách.
 */
export function CustomerTierPricingCard({ canEdit }: { canEdit: boolean }) {
  const [tiers, setTiers] = useState<Record<CustomerTier, string> | null>(null)
  const [peaks, setPeaks] = useState<Peak[]>([])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/v1/pricing-rules")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { customer_tier_discount?: Record<CustomerTier, number>; peak_hour_surcharge?: PeakHourWindow[] } | null) => {
        const d = j?.customer_tier_discount
        setTiers(Object.fromEntries(CUSTOMER_TIERS.map((t) => [t, String(Math.round((d?.[t] ?? 0) * 100))])) as Record<CustomerTier, string>)
        setPeaks((j?.peak_hour_surcharge ?? []).map(toPeak))
      })
      .catch(() => setTiers(null))
  }, [])

  const save = async () => {
    if (!tiers) return
    setSaving(true)
    setMessage(null)
    try {
      const puts = [
        { key: "customer_tier_discount", value: Object.fromEntries(CUSTOMER_TIERS.map((t) => [t, Math.min(50, Number(tiers[t]) || 0) / 100])), branch_id: null },
        { key: "peak_hour_surcharge", value: peaks.map((p) => ({ startHour: Number(p.startHour), endHour: Number(p.endHour), vnd: Number(p.vnd.replace(/\D/g, "")) })), branch_id: null },
      ]
      for (const body of puts) {
        const res = await fetch("/api/v1/pricing-rules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
          throw new Error(data?.error?.message ?? "Không lưu được")
        }
      }
      setMessage({ ok: true, text: "Đã lưu ưu đãi hạng khách và giờ cao điểm" })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Không lưu được" })
    } finally {
      setSaving(false)
    }
  }

  if (!tiers) return null
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="flex items-center gap-2 text-body font-extrabold text-text"><Crown size={18} className="text-primary" /> Ưu đãi hạng khách & giờ cao điểm</h2>
      <p className="text-caption text-text-muted">Giảm theo % tiền hàng cho khách đã có hạng (tối đa 50%); phụ phí cộng khi khung giờ giao rơi vào giờ cao điểm. Mỗi khoản hiện thành một dòng trên báo giá.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CUSTOMER_TIERS.map((t) => (
          <label key={t} className="flex flex-col gap-1 text-caption text-text">
            {CUSTOMER_TIER_LABEL[t]} (%)
            <Input inputMode="numeric" disabled={!canEdit} value={tiers[t]} onChange={(e) => setTiers({ ...tiers, [t]: e.target.value.replace(/\D/g, "").slice(0, 2) })} className="h-9" aria-label={`Giảm cho hạng ${CUSTOMER_TIER_LABEL[t]}`} />
          </label>
        ))}
      </div>
      {peaks.map((p, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-caption text-text">
          Từ <Input inputMode="numeric" disabled={!canEdit} value={p.startHour} onChange={(e) => setPeaks(peaks.map((x, j) => (j === i ? { ...x, startHour: e.target.value } : x)))} className="h-9 w-16" aria-label="Giờ bắt đầu" />
          giờ đến <Input inputMode="numeric" disabled={!canEdit} value={p.endHour} onChange={(e) => setPeaks(peaks.map((x, j) => (j === i ? { ...x, endHour: e.target.value } : x)))} className="h-9 w-16" aria-label="Giờ kết thúc" />
          giờ, phụ phí <Input inputMode="numeric" disabled={!canEdit} value={p.vnd} onChange={(e) => setPeaks(peaks.map((x, j) => (j === i ? { ...x, vnd: e.target.value } : x)))} className="h-9 w-28" aria-label="Phụ phí" />
          {canEdit && <Button type="button" size="sm" variant="ghost" onClick={() => setPeaks(peaks.filter((_, j) => j !== i))}>Bỏ</Button>}
        </div>
      ))}
      {message && <p role="status" className={message.ok ? "text-caption text-success" : "text-caption text-danger"}>{message.text}</p>}
      {canEdit && (
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setPeaks([...peaks, { startHour: "18", endHour: "20", vnd: "30000" }])}>Thêm giờ cao điểm</Button>
          <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void save()}>{saving ? "Đang lưu…" : "Lưu"}</Button>
        </div>
      )}
    </Card>
  )
}
