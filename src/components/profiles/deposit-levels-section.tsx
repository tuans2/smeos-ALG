"use client"

import React, { useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Plus } from "@/components/ui/icon-set/plus"
import { Save } from "@/components/ui/icon-set/save"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Wallet } from "@/components/ui/icon-set/wallet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Disclosure } from "@/components/ui/disclosure"
import { Input } from "@/components/ui/input"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  depositPercentOf,
  normalizePaymentCode,
  parsePaymentPlans,
  PAYMENT_PLANS_SETTINGS_KEY,
  paymentPlansErrors,
  serializePaymentPlans,
  type PaymentCodeRule,
  type PaymentPlansConfig,
} from "@/modules/greeting-card/domain/payment-plan"
import { FIELD, PaymentCampaignsEditor, PolicySelect } from "./payment-campaigns-editor"

const PRESET_LEVELS = [20, 30, 40, 50, 70]
const numOrNull = (v: string): number | null => {
  const n = Number(v.replace(/\D/g, ""))
  return v.trim() && Number.isInteger(n) && n > 0 ? n : null
}
const newLevel = (pct: number): PaymentCodeRule => ({
  code: `DC${pct}`, policy: `DEPOSIT_${pct}`, active: true, startsOn: null, endsOn: null, maxUses: null,
  minOrderVnd: null, maxOrderVnd: null, catalogIds: [], issuedBy: null, note: null,
})

/**
 * Mức đặt cọc cho khách (Điều hành quyết): mỗi mức là một MÃ THANH TOÁN (VD: DC30 = cọc 30%).
 * Sale gửi mã cho khách; khách nhập ở ô "Mã thanh toán" khi đặt hàng. Mã không giảm giá — tổng đơn
 * không đổi. Khách không tự chọn phần trăm.
 */
export function DepositLevelsSection() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const catalogs = useApi<{ data: Array<{ id: string; name: string }> }>("/api/v1/greeting-card/catalogs")
  const [draft, setDraft] = useState<PaymentPlansConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const config = draft ?? (org.data ? parsePaymentPlans(org.data.settings) : null)
  const errors = config ? paymentPlansErrors(config) : []
  const edit = (next: PaymentPlansConfig) => {
    setDraft(next)
    setMessage(null)
  }
  const setCode = (i: number, patch: Partial<PaymentCodeRule>) =>
    config && edit({ ...config, codes: config.codes.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const usedLevels = new Set(config?.codes.map((c) => depositPercentOf(c.policy)) ?? [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!config || errors.length > 0) return
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [PAYMENT_PLANS_SETTINGS_KEY]: serializePaymentPlans(config) } }, "Không lưu được mức đặt cọc")
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu mức đặt cọc." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được mức đặt cọc" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Mức đặt cọc cho khách (mã thanh toán)</h3>
      </div>
      <p className="text-body-sm text-text-muted">
        Bật mức nào thì Sale gửi mã của mức đó cho khách. Khách nhập mã ở ô “Mã thanh toán” khi đặt hoa để chỉ trả trước phần cọc;
        phần còn lại trả sau khi hoa hoàn thành và cửa hàng gửi ảnh. Mã thanh toán không giảm giá — tổng đơn không đổi.
      </p>
      {!config ? (
        <div className="h-20 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <div className="flex flex-col gap-5 text-body-sm">
          <section className="flex flex-col gap-2">
            {config.codes.length === 0 && <p className="text-text-muted">Chưa có mức đặt cọc nào — khách thanh toán theo mặc định của tiệm.</p>}
            {config.codes.map((c, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 font-semibold">
                    <Checkbox checked={c.active} onCheckedChange={(checked) => setCode(i, { active: checked === true })} /> Cho phép
                  </label>
                  <PolicySelect label="Mức đặt cọc" value={c.policy} onChange={(policy) => setCode(i, { policy })} />
                  <label className="flex items-center gap-1">Mã
                    <Input inputSize="sm" aria-label="Mã thanh toán" value={c.code} onChange={(e) => setCode(i, { code: normalizePaymentCode(e.target.value) })} className="w-28 font-mono" />
                  </label>
                  <Button type="button" size="sm" variant="ghost" aria-label={`Xoá mã ${c.code}`} onClick={() => edit({ ...config, codes: config.codes.filter((_, j) => j !== i) })}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <Disclosure label="Điều kiện áp dụng" className="p-3 text-caption">
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1">Từ ngày <Input inputSize="sm" type="date" value={c.startsOn ?? ""} onChange={(e) => setCode(i, { startsOn: e.target.value || null })} className="w-36" /></label>
                    <label className="flex items-center gap-1">đến <Input inputSize="sm" type="date" value={c.endsOn ?? ""} onChange={(e) => setCode(i, { endsOn: e.target.value || null })} className="w-36" /></label>
                    <label className="flex items-center gap-1">Số lượt <Input inputSize="sm" inputMode="numeric" value={c.maxUses ?? ""} onChange={(e) => setCode(i, { maxUses: numOrNull(e.target.value) })} placeholder="Không giới hạn" className="w-28" /></label>
                    <label className="flex items-center gap-1">Đơn từ <Input inputSize="sm" inputMode="numeric" value={c.minOrderVnd ?? ""} onChange={(e) => setCode(i, { minOrderVnd: numOrNull(e.target.value) })} placeholder="0" className="w-28" />đ</label>
                    <label className="flex items-center gap-1">đến <Input inputSize="sm" inputMode="numeric" value={c.maxOrderVnd ?? ""} onChange={(e) => setCode(i, { maxOrderVnd: numOrNull(e.target.value) })} placeholder="Không giới hạn" className="w-28" />đ</label>
                    <label className="flex items-center gap-1">Người cấp <Input inputSize="sm" value={c.issuedBy ?? ""} onChange={(e) => setCode(i, { issuedBy: e.target.value || null })} className="w-32" /></label>
                    <label className="flex items-center gap-1 flex-1 min-w-40">Ghi chú <Input inputSize="sm" value={c.note ?? ""} onChange={(e) => setCode(i, { note: e.target.value || null })} className="flex-1" /></label>
                  </div>
                  <fieldset className="mt-2 flex flex-wrap gap-2">
                    <legend className="mb-1">Bộ sưu tập áp dụng (không chọn = mọi bộ sưu tập)</legend>
                    {(catalogs.data?.data ?? []).map((cat) => (
                      <label key={cat.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
                        <Checkbox
                          checked={c.catalogIds.includes(cat.id)}
                          onCheckedChange={(checked) => setCode(i, { catalogIds: checked ? [...c.catalogIds, cat.id] : c.catalogIds.filter((x) => x !== cat.id) })}
                        />
                        {cat.name}
                      </label>
                    ))}
                    {catalogs.error && <span role="alert" className="text-danger">Không tải được danh sách bộ sưu tập</span>}
                  </fieldset>
                </Disclosure>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-caption text-text-muted">Thêm mức:</span>
              {PRESET_LEVELS.filter((p) => !usedLevels.has(p)).map((p) => (
                <Button key={p} type="button" size="sm" variant="outline" className="gap-1" onClick={() => edit({ ...config, codes: [...config.codes, newLevel(p)] })}>
                  <Plus size={14} /> Cọc {p}%
                </Button>
              ))}
            </div>
          </section>
          <PaymentCampaignsEditor campaigns={config.campaigns} onChange={(campaigns) => edit({ ...config, campaigns })} />
        </div>
      )}
      {errors.length > 0 && (
        <ul role="alert" className="text-caption text-danger list-disc pl-5">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? "Khách chỉ nhập mã do cửa hàng cấp, không tự chọn phần trăm."}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft || errors.length > 0} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu mức đặt cọc</span>
        </Button>
      </div>
    </form>
  )
}
