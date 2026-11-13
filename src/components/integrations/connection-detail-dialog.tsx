"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Disclosure } from "@/components/ui/disclosure"
import { InlineError } from "@/components/ui/inline-error"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { ConnectionView, EventView } from "@/modules/integration-hub/domain/integration-views"
import { integrationApi } from "./integration-api"
import { SalesChannelPanel } from "./sales-channel-panel"
import { EVENT_STATUS_LABEL, STATUS_LABEL, formatDateTime } from "./integration-labels"

interface ConnectionDetailDialogProps {
  connection: ConnectionView | null
  connectorLabel: string
  /** Kết nối kênh bán: hiện phần ánh xạ sản phẩm và đơn (GĐ4A). */
  isSalesChannel?: boolean
  onClose: () => void
  onChanged: () => void
  askConfirm: (options: { title: string; consequence: string; confirmLabel: string; tone?: "danger" | "default" }) => Promise<boolean>
}

/** Chi tiết kết nối (L3): sức khoẻ, kiểm tra, nhật ký sự kiện + thử lại; đổi khoá và ngắt nằm sau. */
export function ConnectionDetailDialog({ connection, connectorLabel, isSalesChannel = false, onClose, onChanged, askConfirm }: ConnectionDetailDialogProps) {
  const [events, setEvents] = useState<EventView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newSecret, setNewSecret] = useState("")
  const id = connection?.id

  useEffect(() => {
    if (!id) return
    let alive = true
    integrationApi
      .events(id)
      .then((res) => alive && setEvents(res.events))
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : "Không tải được nhật ký"))
    return () => {
      alive = false
    }
  }, [id])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thực hiện được")
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!connection) return
    const ok = await askConfirm({
      title: `Ngắt kết nối ${connectorLabel}?`,
      consequence: "Khoá đã lưu sẽ bị xoá. Dữ liệu từ dịch vụ này sẽ không còn được nhận cho tới khi kết nối lại.",
      confirmLabel: "Ngắt kết nối",
      tone: "danger",
    })
    if (ok) await run(async () => { await integrationApi.disconnect(connection.id); onClose() })
  }

  if (!connection) return null
  const status = STATUS_LABEL[connection.status]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={connection.displayName} description={connectorLabel} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={status.tone}>{status.text}</Badge>
          <span className="text-body-sm text-text-muted">Kiểm tra gần nhất: {formatDateTime(connection.lastHealthAt)}</span>
          {connection.credentialHint && <span className="text-body-sm text-text-muted">Khoá: ••••{connection.credentialHint}</span>}
          {!connection.managed && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => integrationApi.test(connection.id))}>
              Kiểm tra ngay
            </Button>
          )}
        </div>
        {error && <InlineError message={error} />}

        {isSalesChannel && !connection.managed && (
          <SalesChannelPanel connectionId={connection.id} channelLabel={connectorLabel} askConfirm={askConfirm} />
        )}

        <section aria-label="Nhật ký sự kiện" className="space-y-2">
          <h3 className="text-title-sm font-bold text-text">Dữ liệu nhận về gần đây</h3>
          {events === null ? (
            <SkeletonBlock lines={3} label="Đang tải nhật ký" />
          ) : events.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu nào gửi về" reason="Dữ liệu sẽ hiện ở đây khi dịch vụ bắt đầu gửi." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-body-sm">
                  <span className="text-text">{formatDateTime(event.createdAt)}</span>
                  <span className={event.status === "DEAD" ? "font-semibold text-danger-text" : "text-text-muted"}>
                    {EVENT_STATUS_LABEL[event.status] ?? event.status}
                  </span>
                  {!connection.managed && (event.status === "DEAD" || event.status === "FAILED") && (
                    <Button variant="outline" size="xs" disabled={busy} onClick={() => run(() => integrationApi.replay(event.id))}>
                      Thử lại
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {connection.managed ? (
          <p className="text-body-sm text-text-muted">
            Tin lỗi không gửi lại được từ đây — nhân viên trả lời khách trong mục Hội thoại. Đổi cấu hình bằng nút Quản lý của dịch vụ.
          </p>
        ) : (
        <Disclosure label="Đổi khoá hoặc ngắt kết nối">
          <div className="space-y-4 pt-2">
            <label className="block space-y-1 text-body-sm font-semibold text-text">
              <span>Khoá mới</span>
              <Input type="password" autoComplete="off" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} aria-label="Khoá mới" />
            </label>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || !newSecret.trim()}
              onClick={() => run(async () => { await integrationApi.rotate(connection.id, newSecret.trim()); setNewSecret("") })}
            >
              Đổi khoá
            </Button>
            <div className="border-t border-border pt-4">
              <Button variant="danger" size="sm" disabled={busy} onClick={disconnect}>
                Ngắt kết nối
              </Button>
            </div>
          </div>
        </Disclosure>
        )}
      </div>
    </Dialog>
  )
}
