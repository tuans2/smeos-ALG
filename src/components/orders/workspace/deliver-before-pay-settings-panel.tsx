"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Disclosure } from "@/components/ui/disclosure"
import { InlineError } from "@/components/ui/inline-error"
import { useSession } from "@/lib/session"
import { formatCurrency } from "@/lib/i18n/formatters"

interface Settings {
  allowSelfDecide: boolean
  selfDecideMaxVnd: number
  minCompletedOrders: number
  collectDueDays: number
  /** Trần công nợ mỗi khách; `null` = không giới hạn (PO 07/11/2026). */
  customerDebtCapVnd: number | null
}

const ENDPOINT = "/api/v1/orders/deliver-before-pay-settings"
const field = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-body-sm text-text"

/**
 * Hạn mức Sale tự quyết "giao trước, thu sau" (§5.0). Chính sách COD / thu trước giao vẫn chỉnh ở cài đặt
 * thanh toán của tiệm — ở đây chỉ phần ngoài chính sách. Chỉ người có `F2` (Điều hành) thấy.
 */
export function DeliverBeforePaySettingsPanel() {
  const { can } = useSession()
  const canEdit = can("F2")
  const [draft, setDraft] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!canEdit) return
    fetch(ENDPOINT)
      .then(async (r) => (r.ok ? ((await r.json()) as Settings) : Promise.reject(new Error("Không tải được cài đặt"))))
      .then(setDraft)
      .catch((e: Error) => setError(e.message))
  }, [canEdit])

  if (!canEdit) return null

  async function save() {
    if (!draft) return
    setSaving(true)
    setSaved(null)
    try {
      const res = await fetch(ENDPOINT, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
      const body = (await res.json().catch(() => null)) as (Settings & { error?: { message?: string; details?: Record<string, string> } }) | null
      if (!res.ok) throw new Error(Object.values(body?.error?.details ?? {})[0] ?? body?.error?.message ?? "Không lưu được")
      if (body) setDraft(body)
      setError(null)
      setSaved("Đã lưu hạn mức")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được")
    } finally {
      setSaving(false)
    }
  }

  const num = (v: string) => Number(v.replace(/\D/g, "") || 0)

  return (
    <Disclosure label="Hạn mức Sale tự quyết" className="rounded-2xl bg-surface p-4 shadow-sm">
      <p className="mt-2 text-body-sm text-text-muted">
        Đơn ngoài chính sách thu tiền của tiệm: Sale được tự cho giao trước khi thoả cả ba điều kiện dưới đây. Đơn hoả tốc được tự quyết; còn lại chờ Điều hành duyệt. Khách đang nợ quá hạn hoặc vượt trần công nợ luôn chờ Điều hành duyệt.
      </p>
      {error && <div className="mt-3"><InlineError message={error} /></div>}
      {draft && (
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <label className="flex items-center gap-2 text-body-sm text-text sm:col-span-2 cursor-pointer">
            <Checkbox checked={draft.allowSelfDecide} onCheckedChange={(checked) => setDraft({ ...draft, allowSelfDecide: Boolean(checked) })} />
            Cho Sale tự quyết trong hạn mức
          </label>
          <label className="space-y-1 text-body-sm text-text">
            <span>Tổng đơn tối đa ({formatCurrency(draft.selfDecideMaxVnd)})</span>
            <Input inputMode="numeric" className={field} value={draft.selfDecideMaxVnd} onChange={(e) => setDraft({ ...draft, selfDecideMaxVnd: num(e.target.value) })} />
          </label>
          <label className="space-y-1 text-body-sm text-text">
            <span>Khách đã có ít nhất (đơn hoàn tất)</span>
            <Input inputMode="numeric" className={field} value={draft.minCompletedOrders} onChange={(e) => setDraft({ ...draft, minCompletedOrders: num(e.target.value) })} />
          </label>
          <label className="space-y-1 text-body-sm text-text">
            <span>Hạn thu sau khi duyệt (ngày)</span>
            <Input inputMode="numeric" className={field} value={draft.collectDueDays} onChange={(e) => setDraft({ ...draft, collectDueDays: num(e.target.value) })} />
          </label>
          <label className="space-y-1 text-body-sm text-text">
            <span>Trần công nợ mỗi khách ({draft.customerDebtCapVnd === null ? "không giới hạn" : formatCurrency(draft.customerDebtCapVnd)})</span>
            <Input
              inputMode="numeric"
              className={field}
              placeholder="Để trống = không giới hạn"
              value={draft.customerDebtCapVnd ?? ""}
              onChange={(e) => setDraft({ ...draft, customerDebtCapVnd: e.target.value.replace(/\D/g, "") === "" ? null : num(e.target.value) })}
            />
          </label>
          <div className="flex items-end gap-3">
            <Button type="submit" size="sm" variant="secondary" disabled={saving}>Lưu</Button>
            {saved && <span role="status" className="text-body-sm text-text">{saved}</span>}
          </div>
        </form>
      )}
    </Disclosure>
  )
}
