"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { formatDateTime, formatNumber } from "@/lib/i18n/formatters"
import { VietQrTopupModal } from "./vietqr-topup-modal"

type Kind = "TOPUP" | "GIFT" | "REFUND"
interface Monthly { period: string; credit: { used: number; limit: number | null } }
interface Entry { id: string; kind: Kind | "OPENING" | "USAGE" | "EXPIRE"; amount: number; balanceAfter: number; reason: string | null; createdAt: string }

const KIND_LABEL: Record<Entry["kind"], string> = { OPENING: "Số dư đầu", TOPUP: "Nạp", GIFT: "Tặng", REFUND: "Hoàn", USAGE: "Dùng", EXPIRE: "Hết hạn" }

/** Console → tổ chức → Credit: số dư, nạp/tặng/hoàn có lý do, sổ cái gần nhất (checklist ALG 10.6). */
export function CreditLedgerPanel({ organizationId, orgCode, onChanged }: { organizationId: string; orgCode: string; onChanged?: () => void }) {
  const [data, setData] = useState<{ balance: number; entries: Entry[]; monthly: Monthly } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind>("TOPUP")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [limitDraft, setLimitDraft] = useState("")

  const saveLimit = async () => {
    setBusy(true); setMessage(null)
    const res = await fetch(`/api/v1/platform/organizations/${organizationId}/usage-limit`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyLimit: limitDraft.trim() === "" ? null : Number(limitDraft) }),
    }).catch(() => null)
    setBusy(false)
    setMessage(res?.ok ? "Đã lưu hạn mức tháng" : "Không lưu được hạn mức")
    if (res?.ok) load()
  }

  const load = useCallback(() => {
    fetch(`/api/v1/platform/organizations/${organizationId}/credits`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { data: { balance: number; entries: Entry[]; monthly: Monthly } }) => { setData(j.data); setLimitDraft(j.data.monthly.credit.limit === null ? "" : String(j.data.monthly.credit.limit)); setError(null) })
      .catch(() => setError("Chưa tải được sổ credit."))
  }, [organizationId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    setBusy(true); setMessage(null)
    try {
      const res = await fetch(`/api/v1/platform/organizations/${organizationId}/credits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amount: Number(amount), reason: reason.trim() }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string; details?: Record<string, unknown> } } | null
        const detail = j?.error?.details ? Object.values(j.error.details).find((v) => typeof v === "string") : undefined
        throw new Error((detail as string | undefined) ?? j?.error?.message ?? "Không ghi được")
      }
      setAmount(""); setReason(""); setMessage("Đã ghi vào sổ credit"); load(); onChanged?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không ghi được")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <p className="text-body-sm font-bold text-text">Credit</p>
          <p className="text-caption text-text-muted">Mọi lần nạp, tặng, hoàn và dùng đều ghi vào sổ; số dư bằng tổng các dòng.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setQrOpen(true)} className="flex items-center gap-1.5">
          <QrCode size={14} /> Mã VietQR nạp
        </Button>
      </div>
      {error && <InlineError message={error} onRetry={load} />}
      {!data && !error && <SkeletonBlock lines={3} label="Đang tải sổ credit" />}
      {data && (
        <>
          <p className="text-title-sm font-extrabold text-text">{formatNumber(data.balance)} credit</p>
          <div className="flex flex-wrap items-center gap-2">
            {(["TOPUP", "GIFT", "REFUND"] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant={kind === k ? "primary" : "outline"} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Button>
            ))}
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Số credit" className="h-9 w-32" aria-label="Số credit" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do" className="h-9 min-w-[12rem] flex-1" aria-label="Lý do" />
            <Button type="button" size="sm" variant="secondary" disabled={busy || !amount || reason.trim().length < 3} onClick={() => void submit()}>Ghi</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-caption text-text">
            <span>Tháng {data.monthly.period.slice(5)}: đã dùng {formatNumber(data.monthly.credit.used)} credit · hạn mức</span>
            <Input inputMode="numeric" value={limitDraft} onChange={(e) => setLimitDraft(e.target.value.replace(/\D/g, ""))} placeholder="Không giới hạn" className="h-9 w-36" aria-label="Hạn mức credit mỗi tháng" />
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void saveLimit()}>Lưu hạn mức</Button>
          </div>
          {message && <p role="status" className="text-caption text-text-muted">{message}</p>}
          <ul className="divide-y divide-border text-caption">
            {data.entries.slice(0, 20).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-text">{KIND_LABEL[e.kind]} · {e.reason ?? "—"}</span>
                <span className="text-text-muted">{formatDateTime(e.createdAt)}</span>
                <span className={e.amount < 0 ? "font-semibold text-danger-text" : "font-semibold text-success-text"}>{e.amount > 0 ? "+" : ""}{formatNumber(e.amount)}</span>
                <span className="text-text-muted">Còn {formatNumber(e.balanceAfter)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <VietQrTopupModal open={qrOpen} onOpenChange={setQrOpen} orgCode={orgCode} organizationId={organizationId} onPaymentSuccess={() => { load(); onChanged?.() }} />
    </Card>
  )
}
