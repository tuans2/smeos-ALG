"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InlineError } from "@/components/ui/inline-error"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatDateTime } from "./integration-labels"

type TokenRow = { id: string; client: string; created_at: string; expires_at: string; revoked_at: string | null; expired?: boolean }
type Issued = { client: string; token: string }

const CLIENT_LABEL: Record<string, string> = { SOCIALFLOW: "Ứng dụng đăng bài", LOCALBUDD: "Ứng dụng quảng bá địa phương" }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } })
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T
  if (!res.ok) throw new Error(body.error?.message ?? "Không thực hiện được")
  return body
}

/**
 * Khoá cho ứng dụng SocialFlow/LocalBudd (quyền `F9`, route `/integration-tokens` sẵn có).
 * Khoá thật chỉ hiện MỘT lần ngay sau khi cấp hoặc đổi — máy chủ chỉ giữ bản băm.
 */
export function ApiTokensPanel() {
  const [rows, setRows] = useState<TokenRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<Issued | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, confirmDialog] = useConfirmDialog()

  const load = useCallback(async () => {
    try {
      const res = await call<{ data: TokenRow[] }>("/api/v1/integration-tokens")
      const now = Date.now()
      setRows(res.data.filter((r) => !r.revoked_at).map((r) => ({ ...r, expired: new Date(r.expires_at).getTime() < now })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách khoá")
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount; setState nằm trong hàm tải (nợ #149)
    void load()
  }, [load])

  async function run(action: () => Promise<Issued | null>) {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (result) setIssued(result)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thực hiện được")
    } finally {
      setBusy(false)
    }
  }

  async function revoke(row: TokenRow) {
    const ok = await confirm({
      title: "Thu hồi khoá này?",
      consequence: `${CLIENT_LABEL[row.client] ?? "Ứng dụng"} sẽ mất quyền đọc dữ liệu cửa hàng ngay lập tức.`,
      confirmLabel: "Thu hồi",
      tone: "danger",
    })
    if (ok) await run(async () => { await call(`/api/v1/integration-tokens/${row.id}`, { method: "DELETE" }); return null })
  }

  return (
    <div className="space-y-4">
      {issued && (
        <div role="status" className="space-y-2 rounded-xl border border-border bg-warning-bg p-4">
          <p className="text-body-sm font-semibold text-warning-text">
            Chép khoá này ngay — sau khi đóng sẽ không xem lại được.
          </p>
          <code className="block break-all rounded-lg bg-surface p-3 text-body-sm text-text">{issued.token}</code>
          <Button variant="outline" size="xs" onClick={() => setIssued(null)}>
            Tôi đã chép khoá
          </Button>
        </div>
      )}
      {error && <InlineError message={error} />}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CLIENT_LABEL).map(([client, label]) => (
          <Button
            key={client}
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => run(() => call<Issued>("/api/v1/integration-tokens", { method: "POST", body: JSON.stringify({ client }) }))}
          >
            Cấp khoá cho {label.split(" — ")[0]}
          </Button>
        ))}
      </div>
      {rows === null ? (
        <SkeletonBlock lines={2} label="Đang tải danh sách khoá" />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa cấp khoá nào" reason="Cấp khoá khi bạn muốn nối ứng dụng đăng bài hoặc quảng bá địa phương với cửa hàng." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => {
            const expired = row.expired === true
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-body-sm">
                <div>
                  <p className="font-semibold text-text">{CLIENT_LABEL[row.client] ?? "Ứng dụng"}</p>
                  <p className="text-text-muted">Hết hạn: {formatDateTime(row.expires_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={expired ? "danger" : "success"}>{expired ? "Đã hết hạn" : "Đang dùng"}</Badge>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    onClick={() => run(() => call<Issued>(`/api/v1/integration-tokens/${row.id}/rotate`, { method: "POST" }))}
                  >
                    Đổi khoá
                  </Button>
                  <Button variant="outline" size="xs" disabled={busy} onClick={() => revoke(row)}>
                    Thu hồi
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {confirmDialog}
    </div>
  )
}
