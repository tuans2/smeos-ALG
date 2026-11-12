"use client"

import { useCallback, useEffect, useState } from "react"

import { ListChecks } from "@/components/ui/icon-set/list-checks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { snakeKeys } from "@/lib/case-keys"

type Entity = "ORDER" | "PARTNER"
interface FieldRow {
  key: string
  label: string
  platformLabel: string | null
  owner: "PLATFORM" | "SHOP"
  requirement: "OPTIONAL" | "RECOMMENDED" | "REQUIRED"
  isEnabled: boolean
  canHide: boolean
}

const ENTITIES: Array<{ id: Entity; label: string }> = [{ id: "ORDER", label: "Đơn hàng" }, { id: "PARTNER", label: "Đối tác" }]
const TYPES = [
  { id: "TEXT", label: "Chữ ngắn" }, { id: "LONG_TEXT", label: "Đoạn văn" }, { id: "NUMBER", label: "Số" },
  { id: "MONEY_VND", label: "Số tiền" }, { id: "DATE", label: "Ngày" }, { id: "PHONE", label: "Số điện thoại" },
] as const
const REQUIREMENT_LABEL = { OPTIONAL: "Không bắt buộc", RECOMMENDED: "Nên nhập", REQUIRED: "Bắt buộc" } as const

async function send(method: "POST" | "PUT", body: object) {
  const res = await fetch("/api/v1/field-config", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(snakeKeys(body)) })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string; details?: Record<string, unknown> } } | null
    const detail = data?.error?.details ? Object.values(data.error.details).find((v) => typeof v === "string") : undefined
    throw new Error((detail as string | undefined) ?? data?.error?.message ?? "Không lưu được")
  }
}

/**
 * Cài đặt → Trường dữ liệu (checklist ALG 1.9, chỉ Điều hành). Cửa hàng thêm trường riêng cho đơn/đối tác,
 * ẩn hoặc đổi nhãn trường không bắt buộc của hệ thống. Trường bắt buộc của hệ thống luôn hiện.
 */
export function ShopFieldsSettingsTab() {
  const [entity, setEntity] = useState<Entity>("ORDER")
  const [rows, setRows] = useState<FieldRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState<Record<string, string>>({})
  const [newLabel, setNewLabel] = useState("")
  const [newType, setNewType] = useState<(typeof TYPES)[number]["id"]>("TEXT")
  const [newRequired, setNewRequired] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/v1/field-config/settings?entity=${entity}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { data: FieldRow[] }) => { setRows(j.data); setError(null) })
      .catch(() => setError("Chưa tải được danh sách trường. Hãy thử lại."))
  }, [entity])

  useEffect(() => { load() }, [load])

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setMessage(null)
    try { await fn(); setMessage(ok); load() } catch (e) { setMessage(e instanceof Error ? e.message : "Không lưu được") } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-xs">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-title-sm font-extrabold text-text"><ListChecks size={18} className="text-primary" /> Trường dữ liệu</h2>
        <p className="text-caption text-text-muted">Thêm thông tin riêng cửa hàng cần ghi khi nhận đơn, ẩn hoặc đổi tên các trường không bắt buộc. Trường bắt buộc của hệ thống luôn hiện.</p>
      </div>
      <div className="flex gap-2">
        {ENTITIES.map((e) => (
          <Button key={e.id} type="button" size="sm" variant={entity === e.id ? "primary" : "outline"} onClick={() => { setEntity(e.id); setRows(null) }}>{e.label}</Button>
        ))}
      </div>

      {error && <InlineError message={error} onRetry={load} />}
      {!rows && !error && <SkeletonBlock lines={4} label="Đang tải danh sách trường" />}
      {rows && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((f) => (
            <li key={f.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[12rem] flex-1">
                <Input value={draftLabel[f.key] ?? f.label} onChange={(e) => setDraftLabel({ ...draftLabel, [f.key]: e.target.value })} className="h-9" aria-label={`Tên trường ${f.label}`} />
                <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-muted">
                  <Badge tone={f.owner === "SHOP" ? "accent" : "neutral"}>{f.owner === "SHOP" ? "Của cửa hàng" : "Của hệ thống"}</Badge>
                  <span>{REQUIREMENT_LABEL[f.requirement]}</span>
                  {f.platformLabel && f.platformLabel !== f.label && <span>Tên gốc: {f.platformLabel}</span>}
                </div>
              </div>
              {draftLabel[f.key] !== undefined && draftLabel[f.key] !== f.label && draftLabel[f.key]!.trim() && (
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => send("PUT", { key: f.key, label: draftLabel[f.key]!.trim() }), "Đã đổi tên trường")}>Lưu tên</Button>
              )}
              <label className="flex items-center gap-2 text-caption text-text">
                <Switch checked={f.isEnabled} disabled={busy || !f.canHide} aria-label={`${f.isEnabled ? "Ẩn" : "Hiện"} trường ${f.label}`}
                  onCheckedChange={(v) => void run(() => send("PUT", { key: f.key, isEnabled: v }), v ? "Đã hiện trường" : "Đã ẩn trường")} />
                {f.canHide ? (f.isEnabled ? "Đang hiện" : "Đang ẩn") : "Luôn hiện"}
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-4">
        <span className="text-body-sm font-bold text-text">Thêm trường riêng</span>
        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ví dụ: Mã thẻ thành viên" className="h-9" aria-label="Tên trường mới" />
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <Button key={t.id} type="button" size="sm" variant={newType === t.id ? "primary" : "outline"} onClick={() => setNewType(t.id)}>{t.label}</Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-caption text-text">
          <Switch checked={newRequired} onCheckedChange={setNewRequired} aria-label="Bắt buộc nhập" /> Bắt buộc nhập
        </label>
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={busy || !newLabel.trim()}
            onClick={() => void run(async () => {
              await send("POST", { entity, label: newLabel.trim(), dataType: newType, requirement: newRequired ? "REQUIRED" : "OPTIONAL" })
              setNewLabel(""); setNewRequired(false)
            }, "Đã thêm trường")}>Thêm trường</Button>
        </div>
      </div>
      {message && <p role="status" className="text-caption text-text-muted">{message}</p>}
    </div>
  )
}
