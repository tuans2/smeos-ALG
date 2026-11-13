"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { AlertOctagon, CheckCircle2, RefreshCw, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useApi, apiSend } from "@/components/greeting-card/greeting-api"
import { CANCELLATION_TYPE_LABEL, type CancellationPayload, type CancellationType, IN_TRANSIT_CANCEL_WARNING, isInTransit } from "@/modules/greeting-card/domain/cancellation-request"

interface PendingRow {
  id: string
  order_id: string | null
  sender_id: string
  body: string
  payload: unknown
  created_at: string
  delivery_status?: string | null
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

function timeAgoShort(iso: string): string {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 60_000)
  if (diff < 1) return "Vừa xong"
  if (diff < 60) return `${diff} phút trước`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h} giờ trước`
  return `${Math.floor(h / 24)} ngày trước`
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** Card phê duyệt một đề xuất hủy/hoàn tiền */
function CancellationRequestCard({ row, onDone }: { row: PendingRow; onDone: () => void }) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const payload = obj(row.payload) as unknown as CancellationPayload
  const typeLabel = CANCELLATION_TYPE_LABEL[payload.type as CancellationType] ?? payload.type

  async function decide(approve: boolean) {
    setBusy(true)
    setError(null)
    try {
      await apiSend(
        `/api/v1/greeting-card/cancellation-requests/${row.id}/decision`,
        "POST",
        { approve, note: note.trim() || undefined },
        "Không thể xử lý phê duyệt"
      )
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi xử lý")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-danger/25 bg-danger-bg/10 p-3.5 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <AlertOctagon size={14} className="text-danger shrink-0" />
            <span className="text-body-sm font-extrabold text-text">{typeLabel}</span>
            <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-caption font-bold text-danger">Chờ duyệt</span>
          </div>
          <p className="text-caption text-text-muted">
            Đơn <strong className="text-text">#{payload.orderCode}</strong> · {timeAgoShort(row.created_at)}
          </p>
        </div>
        {(payload.refundAmountVnd ?? 0) > 0 && (
          <span className="shrink-0 text-body-sm font-extrabold text-danger">Hoàn {vnd(payload.refundAmountVnd)}</span>
        )}
      </div>

      {isInTransit(row.delivery_status) && (
        <p role="alert" className="rounded-lg bg-warning-bg px-2.5 py-2 text-caption font-semibold text-warning-text">⚠ {IN_TRANSIT_CANCEL_WARNING}</p>
      )}
      <div className="rounded-lg border border-border bg-surface px-2.5 py-2 text-body-sm text-text">
        <span className="font-bold text-text-muted">Lý do:</span> {payload.reason}
      </div>
      {(payload.refundAmountVnd ?? 0) > 0 || payload.type === "FULL_REFUND" ? (
        <p className="text-caption text-text-muted">Phê duyệt chỉ đổi trạng thái đơn. Hoàn tiền là bước riêng: khi đã chuyển trả khách, xác nhận ở mục &ldquo;Cần hoàn tiền&rdquo; trong Hộp việc.</p>
      ) : null}

      <div className="flex gap-3 text-caption text-text-muted">
        <span>Tổng đơn: <strong className="text-text">{vnd(payload.totalVnd)}</strong></span>
        <span>Đã thu: <strong className="text-success">{vnd(payload.paidVnd)}</strong></span>
      </div>

      {error && <p role="alert" className="text-caption font-semibold text-danger">{error}</p>}

      <Input
        type="text"
        placeholder="Ghi chú phản hồi (tùy chọn)..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={busy}
        className="h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-caption text-text focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void decide(false)}
          className="h-8 gap-1 text-caption text-danger hover:bg-danger-bg"
        >
          <XCircle size={13} /> Từ chối
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void decide(true)}
          className="h-8 gap-1 bg-danger text-white text-caption font-bold hover:bg-danger/90"
        >
          <CheckCircle2 size={13} /> Phê duyệt
        </Button>
      </div>
    </div>
  )
}

/** Panel danh sách đề xuất Hủy / Hoàn đang chờ duyệt — gắn vào Tab Điều hành */
export function PendingCancellationPanel() {
  const { data, isLoading, mutate } = useApi<{ data: PendingRow[] }>(
    "/api/v1/greeting-card/cancellation-requests",
    { refreshInterval: 30_000 }
  )

  const rows = data?.data ?? []

  if (!isLoading && rows.length === 0) return null

  return (
    <section
      aria-labelledby="pending-cancellation-heading"
      className="rounded-2xl border border-danger/30 bg-danger-bg/5 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon size={18} className="text-danger" />
          <h3 id="pending-cancellation-heading" className="text-body-sm font-extrabold text-danger">
            Đề xuất Hủy / Hoàn tiền chờ duyệt
            {rows.length > 0 && (
              <span className="ml-1.5 rounded-full bg-danger px-2 py-0.5 text-caption font-bold text-white">
                {rows.length}
              </span>
            )}
          </h3>
        </div>
        <Button variant="ghost"
          type="button"
          aria-label="Làm mới danh sách đề xuất hủy/hoàn"
          onClick={() => void mutate()}
          className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin motion-reduce:animate-none" : ""} />
        </Button>
      </div>

      {isLoading && rows.length === 0 ? (
        <SkeletonBlock lines={2} label="Đang tải đề xuất hủy/hoàn" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <CancellationRequestCard key={row.id} row={row} onDone={() => void mutate()} />
          ))}
        </div>
      )}
    </section>
  )
}
