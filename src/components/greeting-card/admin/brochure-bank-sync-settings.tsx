"use client"

import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import React, { useState } from "react"
import { Check, Copy, Link2, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"

interface IntegrationStatus {
  data: { payment: { enabled: boolean; provider: string | null; keyHint: string | null; webhookPath: string } }
}

/**
 * Đối soát tự động qua SePay: tiệm dán URL webhook + khoá vào SePay; tiền về
 * tài khoản là đơn tự chuyển "đã thu". Khoá chỉ hiện MỘT lần lúc tạo.
 */
export function BrochureBankSyncSettings() {
  const [confirm, confirmDialog] = useConfirmDialog()
  const status = useApi<IntegrationStatus>("/api/v1/greeting-card/integrations")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const payment = status.data?.data.payment
  const webhookUrl = typeof window === "undefined" || !payment ? "" : `${window.location.origin}${payment.webhookPath}`

  async function run(method: "POST" | "DELETE") {
    if (method === "POST" && payment?.enabled && !(await confirm({ title: "Tạo khoá mới?", consequence: "Khoá cũ trên SePay sẽ hết hiệu lực ngay.", confirmLabel: "Tạo khoá mới", tone: "danger" }))) return
    setBusy(true)
    setError(null)
    try {
      const res = await apiSend<{ data: { apiKey?: string } }>(
        "/api/v1/greeting-card/integrations/payment-webhook",
        method,
        undefined,
        "Không cập nhật được đối soát tự động"
      )
      setNewKey(res.data.apiKey ?? null)
      await status.mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được đối soát tự động")
    } finally {
      setBusy(false)
    }
  }

  function copy(text: string, field: string) {
    void navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3">
      {confirmDialog}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-primary" />
          <h3 className="text-title-sm font-extrabold text-text">Đối soát chuyển khoản tự động (SePay)</h3>
        </div>
        <span className={`text-caption px-2.5 py-0.5 rounded-full font-bold ${payment?.enabled ? "bg-success-bg text-success" : "bg-surface-alt text-text-muted"}`}>
          {payment?.enabled ? `Đang bật · khoá …${payment.keyHint ?? ""}` : "Chưa bật"}
        </span>
      </div>
      <p className="text-body-sm text-text-muted">
        Khi khách chuyển khoản đúng nội dung (mã đơn), đơn tự ghi nhận đã thu — không cần đối soát tay.
      </p>
      {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
      {newKey && (
        <div className="p-3 rounded-xl border border-warning/40 bg-warning-bg/40 flex flex-col gap-2 text-body-sm">
          <p className="font-bold">Dán vào SePay → Webhooks (chọn kiểu chứng thực API Key). Khoá chỉ hiện một lần:</p>
          {[
            { label: "URL webhook", value: webhookUrl, field: "url" },
            { label: "API Key", value: newKey, field: "key" },
          ].map((row) => (
            <div key={row.field} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-text-muted">{row.label}</span>
              <code className="flex-1 break-all bg-surface px-2 py-1 rounded">{row.value}</code>
              <Button variant="ghost" type="button" aria-label={`Sao chép ${row.label}`} onClick={() => copy(row.value, row.field)} className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1 text-primary">
                {copied === row.field ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        {payment?.enabled && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run("DELETE")}>Tắt</Button>
        )}
        <Button type="button" size="sm" disabled={busy || !payment} onClick={() => void run("POST")} className="gap-1.5">
          {busy && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}
          {payment?.enabled ? "Tạo khoá mới" : "Bật đối soát tự động"}
        </Button>
      </div>
    </section>
  )
}
