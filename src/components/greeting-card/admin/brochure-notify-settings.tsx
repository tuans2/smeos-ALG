"use client"

import { Disclosure } from "@/components/ui/disclosure"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { BellRing, Loader2, Save, Send } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { NOTIFY_EVENTS, NOTIFY_EVENT_LABELS, type NotifyChannel } from "@/modules/greeting-card/domain/customer-notifications"
import { ZnsTemplateGuide } from "./zns-template-guide"

interface StatusResponse {
  data: { notify: { enabled: boolean; channel: NotifyChannel | null; configured: boolean; templates: Record<string, string> } }
}

const FIELD = "h-9 px-3 rounded-lg border border-border bg-bg text-body-sm text-text w-full"
const CRED_FIELDS: Record<NotifyChannel, Array<{ key: string; label: string }>> = {
  ZNS: [
    { key: "appId", label: "App ID" },
    { key: "secretKey", label: "Secret key của ứng dụng" },
    { key: "accessToken", label: "Access token OA" },
    { key: "refreshToken", label: "Refresh token OA" },
  ],
  ESMS: [
    { key: "apiKey", label: "API key" },
    { key: "secretKey", label: "Secret key" },
    { key: "brandname", label: "Brandname đã đăng ký" },
  ],
}

/**
 * Thông báo khách qua Zalo ZNS hoặc SMS (eSMS) ở các mốc: nhận cọc, thu đủ,
 * cắm xong, đang giao, giao xong, huỷ. Thông tin kết nối chỉ ghi — đã lưu thì
 * không hiện lại (để trống = giữ nguyên).
 */
export function BrochureNotifySettings() {
  const status = useApi<StatusResponse>("/api/v1/greeting-card/integrations")
  const saved = status.data?.data.notify
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [channel, setChannel] = useState<NotifyChannel | null>(null)
  const [templates, setTemplates] = useState<Record<string, string> | null>(null)
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [testPhone, setTestPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const ch = channel ?? saved?.channel ?? "ZNS"
  const on = enabled ?? saved?.enabled ?? false
  const tpl = templates ?? saved?.templates ?? {}
  const hasNewCreds = CRED_FIELDS[ch].every((f) => creds[f.key]?.trim())

  async function act(fn: () => Promise<string>) {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ ok: true, text: await fn() })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Thao tác không thành công" })
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    act(async () => {
      await apiSend(
        "/api/v1/greeting-card/integrations/notifications",
        "PUT",
        { enabled: on, channel: ch, templates: tpl, ...(hasNewCreds ? { credentials: creds } : {}) },
        "Không lưu được cấu hình thông báo"
      )
      setCreds({})
      await status.mutate()
      return on ? "Đã bật thông báo cho khách." : "Đã lưu (thông báo đang tắt)."
    })

  const test = () =>
    act(async () => {
      await apiSend("/api/v1/greeting-card/integrations/notifications/test", "POST", { phone: testPhone }, "Gửi thử thất bại")
      return `Đã gửi tin thử tới ${testPhone}.`
    })

  return (
    <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BellRing size={18} className="text-primary" />
          <h3 className="text-title-sm font-extrabold text-text">Thông báo khách (Zalo / SMS)</h3>
        </div>
        <label className="flex items-center gap-2 text-body-sm font-bold">
          <Checkbox checked={on} onCheckedChange={(checked) => setEnabled((checked === true))} /> Bật
        </label>
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="Kênh gửi">
        {(["ZNS", "ESMS"] as const).map((c) => (
          <Button variant="outline"
            key={c}
            type="button"
            role="radio"
            aria-checked={ch === c}
            onClick={() => setChannel(c)}
            className={`py-0 gap-0 px-3 h-8 rounded-lg text-caption font-bold border ${ch === c ? "bg-primary text-white border-primary hover:bg-primary" : "border-border text-text-muted"}`}
          >
            {c === "ZNS" ? "Zalo ZNS" : "SMS (eSMS.vn)"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CRED_FIELDS[ch].map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-caption">
            <span className="font-bold">{f.label}</span>
            <Input
              type={f.key === "appId" || f.key === "brandname" ? "text" : "password"}
              autoComplete="off"
              value={creds[f.key] ?? ""}
              placeholder={saved?.configured && saved.channel === ch ? "Đã lưu — để trống nếu không đổi" : ""}
              onChange={(e) => setCreds((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className={FIELD}
            />
          </label>
        ))}
      </div>

      {ch === "ZNS" && <ZnsTemplateGuide />}

      {ch === "ZNS" && (
        <Disclosure label="Mã mẫu tin ZNS theo mốc" className="text-body-sm">
          <p className="text-caption text-text-muted my-2">
            Mẫu cần các tham số: order_code, customer_name, shop_name, status, amount, tracking_url. Bỏ trống = không gửi mốc đó.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NOTIFY_EVENTS.map((ev) => (
              <label key={ev} className="flex flex-col gap-1 text-caption">
                <span>{NOTIFY_EVENT_LABELS[ev]}</span>
                <Input value={tpl[ev] ?? ""} maxLength={32} onChange={(e) => setTemplates({ ...tpl, [ev]: e.target.value })} className={FIELD} />
              </label>
            ))}
          </div>
        </Disclosure>
      )}

      {message && (
        <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {saved?.configured && (
          <>
            <Input
              type="tel"
              aria-label="SĐT nhận tin thử"
              placeholder="SĐT nhận tin thử"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className={`${FIELD} w-40`}
            />
            <Button type="button" variant="outline" size="sm" disabled={busy || !testPhone} onClick={() => void test()} className="gap-1.5">
              <Send size={14} /> Gửi thử
            </Button>
          </>
        )}
        <Button type="button" size="sm" disabled={busy || !saved} onClick={() => void save()} className="gap-1.5">
          {busy ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />} Lưu
        </Button>
      </div>
    </section>
  )
}
