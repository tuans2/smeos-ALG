"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/i18n/formatters"

interface Domain { id: string; hostname: string; status: "PENDING" | "VERIFIED" | "LOCKED"; statusText: string; verifiedAt: string | null; lockedReason: string | null }

const TONE = { PENDING: "warning", VERIFIED: "success", LOCKED: "danger" } as const

/**
 * Console → tổ chức → Tên miền riêng (checklist ALG 10.8). Xem danh sách; khoá (kèm lý do) để ngừng phục vụ
 * ngay, mở lại thì cửa hàng phải xác minh lại. Thiếu quyền khoá → máy chủ từ chối, khung báo lỗi.
 */
export function CustomDomainsPanel({ organizationId }: { organizationId: string }) {
  const [rows, setRows] = useState<Domain[] | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() =>
    fetch(`/api/v1/platform/organizations/${organizationId}/custom-domains`)
      .then((r) => (r.ok ? (r.json() as Promise<{ data: Domain[] }>) : { data: [] }))
      .then((j) => setRows(j.data))
      .catch(() => setRows([])), [organizationId])
  useEffect(() => { void load() }, [load])

  async function setLock(row: Domain, locked: boolean) {
    setBusy(true)
    setMessage(null)
    const res = await fetch(`/api/v1/platform/custom-domains/${row.id}/lock`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked, reason: reasons[row.id] ?? "" }),
    }).catch(() => null)
    if (res?.ok) {
      setMessage(locked ? `Đã khoá ${row.hostname}.` : `Đã mở lại ${row.hostname} — cửa hàng cần xác minh lại.`)
      await load()
    } else {
      const j = (await res?.json().catch(() => null)) as { error?: { message?: string; details?: Record<string, unknown> } } | null
      const detail = j?.error?.details ? Object.values(j.error.details).find((v) => typeof v === "string") : undefined
      setMessage((detail as string | undefined) ?? j?.error?.message ?? "Không thực hiện được")
    }
    setBusy(false)
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="border-b border-border pb-2">
        <p className="text-body-sm font-bold text-text">Tên miền riêng</p>
        <p className="text-caption text-text-muted">Tên miền cửa hàng gắn cho trang bộ sưu tập chung và bộ sưu tập riêng. Khoá thì tên miền ngừng mở trang ngay.</p>
      </div>
      {rows?.length === 0 && <p className="text-caption text-text-muted">Tổ chức chưa gắn tên miền riêng.</p>}
      {rows?.map((row) => (
        <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 break-all text-body-sm font-semibold text-text">{row.hostname}</span>
            <Badge tone={TONE[row.status]}>{row.statusText}</Badge>
          </div>
          {row.verifiedAt && <p className="text-caption text-text-muted">Xác minh lúc {formatDateTime(row.verifiedAt)}</p>}
          {row.status === "LOCKED" ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 text-caption text-danger">Lý do khoá: {row.lockedReason ?? "—"}</p>
              <Button type="button" size="xs" variant="outline" disabled={busy} onClick={() => void setLock(row, false)}>Mở lại</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input value={reasons[row.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [row.id]: e.target.value })} placeholder="Lý do khoá" aria-label={`Lý do khoá ${row.hostname}`} className="min-w-[12rem] flex-1" />
              <Button type="button" size="xs" variant="outline" disabled={busy || (reasons[row.id] ?? "").trim().length < 5} onClick={() => void setLock(row, true)}>Khoá</Button>
            </div>
          )}
        </div>
      ))}
      {message && <p role="status" className="text-caption text-text">{message}</p>}
    </Card>
  )
}
