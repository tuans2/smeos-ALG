"use client"

import React, { useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Save } from "@/components/ui/icon-set/save"
import { Truck } from "@/components/ui/icon-set/truck"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  BROCHURE_POLICY_SETTINGS_KEY,
  parsePaymentPolicy,
  serializePaymentPolicy,
  type BrochurePaymentPolicy,
} from "@/modules/greeting-card/domain/brochure-payment-policy"
import { PolicyMatrixTable } from "./policy-matrix-table"

/**
 * Chính sách thanh toán của tiệm (Điều hành quyết): có bắt thu đủ tiền trước khi giao hàng không,
 * và hạn thanh toán — quá hạn mà khách chưa chuyển khoản, chưa bấm "Tôi đã chuyển khoản" thì đơn
 * tự huỷ (thanh toán thất bại).
 */
export function PaymentPolicySection() {
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
        { settings: { [BROCHURE_POLICY_SETTINGS_KEY]: serializePaymentPolicy(policy) } },
        "Không lưu được chính sách thanh toán",
      )
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu chính sách thanh toán." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được chính sách thanh toán" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Truck size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Chính sách thanh toán & giao hàng</h3>
      </div>
      {!policy ? (
        <div className="h-40 rounded-2xl bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <PolicyMatrixTable
          policy={policy}
          onChange={edit}
          disabled={saving}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? "Các quy tắc trên áp dụng trực tiếp cho toàn bộ đơn hàng và luồng điều phối của tiệm."}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu chính sách</span>
        </Button>
      </div>
    </form>
  )
}
