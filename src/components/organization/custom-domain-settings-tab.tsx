"use client"

import { useCallback, useEffect, useState } from "react"

import { Globe } from "@/components/ui/icon-set/globe"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/i18n/formatters"

interface DnsRecord { type: "TXT" | "CNAME"; name: string; value: string; purpose: string }
interface DomainRow {
  id: string
  hostname: string
  status: "PENDING" | "VERIFIED" | "LOCKED"
  statusText: string
  lastCheckedAt: string | null
  lockedReason: string | null
  records: DnsRecord[]
}

const API = "/api/v1/custom-domains"
const TONE = { PENDING: "warning", VERIFIED: "success", LOCKED: "danger" } as const

async function call<T>(url: string, method: "POST" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string; details?: Record<string, unknown> } } | null
  if (!res.ok) {
    const detail = json?.error?.details ? Object.values(json.error.details).find((v) => typeof v === "string") : undefined
    throw new Error((detail as string | undefined) ?? json?.error?.message ?? "Chưa thực hiện được, vui lòng thử lại")
  }
  return json?.data as T
}

function RecordTable({ records }: { records: DnsRecord[] }) {
  return (
    <div className="flex flex-col gap-2">
      {records.map((r) => (
        <div key={r.type} className="rounded-lg bg-surface-alt p-3 text-caption">
          <p className="font-semibold text-text">{r.type === "TXT" ? "Bước 1" : "Bước 2"} · {r.purpose}</p>
          <dl className="mt-1 grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1 text-text-muted">
            <dt>Loại bản ghi</dt><dd className="font-mono text-text">{r.type}</dd>
            <dt>Tên</dt><dd className="break-all font-mono text-text">{r.name}</dd>
            <dt>Giá trị</dt><dd className="break-all font-mono text-text">{r.value}</dd>
          </dl>
        </div>
      ))}
    </div>
  )
}

/**
 * Cài đặt → Tên miền riêng (checklist ALG 10.8, chỉ Điều hành). Cửa hàng gắn tên miền của mình cho trang
 * danh mục và Thẻ Chào: thêm tên miền → thêm bản ghi DNS theo hướng dẫn → bấm kiểm tra.
 */
export function CustomDomainSettingsTab() {
  const [rows, setRows] = useState<DomainRow[] | null>(null)
  const [hostname, setHostname] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirmDialog()

  const load = useCallback(() => {
    fetch(API)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { data: DomainRow[] }) => { setRows(j.data); setError(null) })
      .catch(() => setError("Chưa tải được danh sách tên miền. Hãy thử lại."))
  }, [])
  useEffect(() => { load() }, [load])

  async function run(key: string, action: () => Promise<string | null>) {
    setBusy(key)
    setError(null)
    setMessage(null)
    try {
      setMessage(await action())
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa thực hiện được, vui lòng thử lại")
    } finally {
      setBusy(null)
    }
  }

  const add = () => run("add", async () => {
    const created = await call<DomainRow>(API, "POST", { hostname })
    setHostname("")
    setOpen(created.id)
    return "Đã thêm tên miền. Làm theo hướng dẫn bên dưới rồi bấm Kiểm tra."
  })
  const verify = (id: string) => run(id, async () => (await call<{ message: string }>(`${API}/${id}/verify`, "POST")).message)
  const remove = async (row: DomainRow) => {
    const ok = await confirm({
      title: `Gỡ tên miền ${row.hostname}?`,
      consequence: "Khách sẽ không mở được trang của cửa hàng trên tên miền này nữa. Muốn dùng lại phải thêm và xác minh lại.",
      confirmLabel: "Gỡ tên miền",
      tone: "danger",
    })
    if (ok) await run(row.id, async () => { await call(`${API}/${row.id}`, "DELETE"); return `Đã gỡ ${row.hostname}.` })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-xs">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-title-sm font-extrabold text-text"><Globe size={18} className="text-primary" /> Tên miền riêng</h2>
        <p className="text-caption text-text-muted">Khách mở trang bộ sưu tập chung và bộ sưu tập riêng của cửa hàng bằng tên miền của bạn, ví dụ hoa.tiemcuaban.vn.</p>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void add() }}>
        <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="hoa.tiemcuaban.vn" aria-label="Tên miền" className="min-w-[14rem] flex-1" />
        <Button type="submit" size="sm" disabled={!hostname.trim() || busy !== null}>{busy === "add" ? "Đang thêm…" : "Thêm tên miền"}</Button>
      </form>
      {message && <p role="status" className="text-caption text-success">{message}</p>}
      {error && <InlineError message={error} />}
      {rows === null && !error && <SkeletonBlock lines={2} />}
      {rows?.length === 0 && <p className="text-caption text-text-muted">Cửa hàng chưa gắn tên miền riêng.</p>}
      {rows && rows.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-3 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 break-all font-semibold text-text">{row.hostname}</span>
                <Badge tone={TONE[row.status]}>{row.statusText}</Badge>
                {row.status === "PENDING" && (
                  <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void verify(row.id)}>
                    {busy === row.id ? "Đang kiểm tra…" : "Kiểm tra"}
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(open === row.id ? null : row.id)}>
                  {open === row.id ? "Ẩn hướng dẫn" : "Hướng dẫn DNS"}
                </Button>
                {row.status !== "LOCKED" && (
                  <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void remove(row)}>Gỡ</Button>
                )}
              </div>
              {row.status === "LOCKED" && row.lockedReason && <p className="text-caption text-danger">Lý do khoá: {row.lockedReason}</p>}
              {open === row.id && (
                <>
                  <p className="text-caption text-text-muted">Thêm hai bản ghi sau ở nơi bạn quản lý tên miền (nhà cung cấp tên miền). Bản ghi mới có thể mất tới vài giờ để có hiệu lực.</p>
                  <RecordTable records={row.records} />
                </>
              )}
              {row.status === "PENDING" && row.lastCheckedAt && (
                <p className="text-caption text-text-muted">Lần kiểm tra gần nhất: {formatDateTime(row.lastCheckedAt)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </div>
  )
}
