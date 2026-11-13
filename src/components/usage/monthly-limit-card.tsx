"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Gauge } from "@/components/ui/icon-set/gauge"
import { formatNumber } from "@/lib/i18n/formatters"

interface Snapshot { period: string; credit: { used: number; limit: number | null }; ai: { used: number; limit: number | null } }

function Bar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const ratio = limit && limit > 0 ? Math.min(1, used / limit) : 0
  const tone = ratio >= 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-primary"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-caption text-text">
        <span>{label}</span>
        <span className="font-semibold">{formatNumber(used)} / {limit === null ? "không giới hạn" : formatNumber(limit)}</span>
      </div>
      {limit !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-label={label} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/**
 * Hạn mức credit tháng (checklist ALG 10.3, 9.7): tổng credit dùng trong tháng so với hạn mức nền tảng đặt,
 * phần AI so với trần cửa hàng tự đặt. Báo ở 80%, dừng ở 100%.
 */
export function MonthlyLimitCard({ canSetAi }: { canSetAi: boolean }) {
  const [data, setData] = useState<Snapshot | null>(null)
  const [aiDraft, setAiDraft] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/v1/usage/limits")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: Snapshot } | null) => {
        if (!j) return
        setData(j.data)
        setAiDraft(j.data.ai.limit === null ? "" : String(j.data.ai.limit))
      })
      .catch(() => setData(null))
  }, [])

  const saveAi = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/v1/usage/limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_monthly_limit: aiDraft.trim() === "" ? null : Number(aiDraft) }),
      })
      if (!res.ok) throw new Error("Không lưu được trần credit AI")
      setData(((await res.json()) as { data: Snapshot }).data)
      setMessage("Đã lưu trần credit AI")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không lưu được")
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 text-body-sm font-bold text-text">
        <Gauge size={16} className="text-primary" /> Hạn mức tháng {data.period.slice(5)}/{data.period.slice(0, 4)}
      </h2>
      <Bar label="Tổng credit trong tháng" used={data.credit.used} limit={data.credit.limit} />
      <Bar label="Credit AI trong tháng" used={data.ai.used} limit={data.ai.limit} />
      <p className="text-caption text-text-muted">Dùng tới 80% sẽ có thông báo; chạm hạn mức thì các tác vụ dùng credit tạm dừng tới tháng sau.</p>
      {canSetAi && (
        <div className="flex flex-wrap items-center gap-2">
          <Input inputMode="numeric" value={aiDraft} onChange={(e) => setAiDraft(e.target.value.replace(/\D/g, ""))} placeholder="Không giới hạn" className="h-9 w-40" aria-label="Trần credit AI mỗi tháng" />
          <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void saveAi()}>Lưu trần AI</Button>
          {message && <span role="status" className="text-caption text-text-muted">{message}</span>}
        </div>
      )}
    </div>
  )
}
