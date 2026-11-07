"use client"

import { useState } from "react"
import { useApi } from "@/components/greeting-card/greeting-api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

interface LinkItem {
  id: string
  chain_name: string
  partner_code: string
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED"
}

interface LinksData {
  invitations: LinkItem[]
  memberships: LinkItem[]
}

async function send(url: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch(() => null)
  if (!res) return "Không kết nối được máy chủ — vui lòng thử lại."
  if (res.ok) return null
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return json?.error?.message || "Chưa thực hiện được, vui lòng thử lại."
}

/**
 * Liên kết chuỗi phía cửa hàng (audit hành trình C1, gói UJ-10): Chuỗi gửi lời mời → cửa hàng đồng ý / từ chối
 * ở đây, hoặc rời chuỗi đang tham gia (cần lý do). Ẩn hẳn khi không có gì hoặc người xem không có quyền `F2`.
 */
export function ChainLinkInvitationsCard() {
  // Không có quyền `F2` → API trả 403 → thẻ ẩn
  const linksApi = useApi<{ data: LinksData }>("/api/v1/chain/links", { shouldRetryOnError: false })
  const data = linksApi.data?.data ?? null
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<{ id: string; reason: string } | null>(null)
  const load = async () => {
    await linksApi.mutate()
  }

  const act = async (key: string, url: string, body?: unknown) => {
    setBusy(key)
    setError(null)
    const failure = await send(url, body)
    setBusy(null)
    if (failure) {
      setError(failure)
      return
    }
    setLeaving(null)
    await load()
  }

  if (!data || (data.invitations.length === 0 && data.memberships.length === 0)) return null

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-body font-bold text-text">Liên kết chuỗi</h2>
      {error && <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-caption text-warning-text">{error}</div>}

      {data.invitations.map((inv) => (
        <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="min-w-0">
            <div className="text-body-sm font-semibold text-text">{inv.chain_name} mời cửa hàng liên kết làm đối tác</div>
            <div className="text-caption text-text-muted">
              Đồng ý thì chuỗi được phân đơn và áp quy định chung cho cửa hàng. Lời mời có hạn 7 ngày.
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => void act(`decline:${inv.id}`, `/api/v1/chain/links/${inv.id}/decline`)}>
              Từ chối
            </Button>
            <Button type="button" size="sm" variant="primary" disabled={busy !== null} onClick={() => void act(`accept:${inv.id}`, `/api/v1/chain/links/${inv.id}/accept`)}>
              {busy === `accept:${inv.id}` ? "Đang xử lý…" : "Đồng ý liên kết"}
            </Button>
          </div>
        </div>
      ))}

      {data.memberships.map((m) => (
        <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-body-sm font-semibold text-text">{m.chain_name}</div>
              <div className="text-caption text-text-muted">Mã đối tác: {m.partner_code}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={m.status === "ACTIVE" ? "success" : "warning"}>{m.status === "ACTIVE" ? "Đang hợp tác" : "Tạm ngưng"}</Badge>
              {leaving?.id !== m.id && (
                <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => setLeaving({ id: m.id, reason: "" })}>
                  Rời chuỗi
                </Button>
              )}
            </div>
          </div>
          {leaving?.id === m.id && (
            <div className="flex flex-col gap-2">
              <Textarea
                rows={2}
                placeholder="Lý do rời chuỗi (chuỗi sẽ nhận được)"
                value={leaving.reason}
                onChange={(e) => setLeaving({ id: m.id, reason: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setLeaving(null)}>
                  Huỷ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={busy !== null || leaving.reason.trim().length < 3}
                  onClick={() => void act(`leave:${m.id}`, `/api/v1/chain/links/${m.id}/leave`, { reason: leaving.reason.trim() })}
                >
                  Xác nhận rời chuỗi
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
