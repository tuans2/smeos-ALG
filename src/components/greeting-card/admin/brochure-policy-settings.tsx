"use client"

import { NativeSelect } from "@/components/ui/select"
import React, { useState } from "react"
import { Loader2, Save, ShieldCheck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  BROCHURE_POLICY_SETTINGS_KEY,
  parsePaymentPolicy,
  serializePaymentPolicy,
  type BrochurePaymentPolicy,
} from "@/modules/greeting-card/domain/brochure-payment-policy"
import { PolicyMatrixTable } from "@/components/profiles/policy-matrix-table"

/** Chính sách thu tiền đơn Thẻ chào: % đặt cọc, bắt thu trước khi cắm / trước khi giao. */
export function BrochurePolicySettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<BrochurePaymentPolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const policy = draft ?? (org.data ? parsePaymentPolicy(org.data.settings) : null)
  const edit = (patch: Partial<BrochurePaymentPolicy>) => {
    if (!policy) return
    setDraft({ ...policy, ...patch })
    setMessage(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!policy) return
    setSaving(true)
    try {
      await apiSend(
        "/api/v1/organizations/current",
        "PATCH",
        {
          settings: {
            // Ghi đủ mọi trường — giữ cả hạn thanh toán / giao hoa đặt ở Hồ sơ cửa hàng
            [BROCHURE_POLICY_SETTINGS_KEY]: serializePaymentPolicy(policy),
          },
        },
        "Không lưu được chính sách thu tiền"
      )
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu chính sách thu tiền." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được chính sách thu tiền" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-primary" />
        <h3 className="text-title-sm font-extrabold text-text">Chính sách thu tiền</h3>
      </div>
      {!policy ? (
        <div className="h-40 rounded-2xl bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface-alt/40">
            <div>
              <span className="font-bold text-text text-body-sm">Mức đặt cọc tối thiểu mặc định</span>
              <p className="text-caption text-text-muted">Tỉ lệ giá trị đơn hàng khách cần chuyển khoản trước khi xưởng tiến hành thực hiện đơn hàng.</p>
            </div>
            <NativeSelect
              value={policy.depositPercent}
              onChange={(e) => edit({ depositPercent: Number(e.target.value) })}
              className="h-9 px-3 rounded-lg border border-border bg-bg text-body-sm font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={0}>Không — Thu đủ 100%</option>
              {[20, 30, 50, 70].map((p) => <option key={p} value={p}>Cọc {p}% giá trị đơn</option>)}
            </NativeSelect>
          </div>

          <PolicyMatrixTable
            policy={policy}
            onChange={edit}
            disabled={saving}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? "Mã QR của khách tự hiện đúng số tiền cọc hoặc phần còn lại."}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu chính sách</span>
        </Button>
      </div>
    </form>
  )
}
