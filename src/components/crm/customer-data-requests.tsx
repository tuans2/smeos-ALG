"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FileText } from "@/components/ui/icon-set/file-text"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { DataSubjectRequestView } from "@/modules/crm/domain/data-subject-request"

const TYPE_LABEL: Record<DataSubjectRequestView["type"], string> = { EXPORT: "Xuất dữ liệu", ERASE: "Xoá dữ liệu", RECTIFY: "Sửa dữ liệu" }
const STATUS: Record<DataSubjectRequestView["status"], { label: string; tone: "warning" | "success" | "neutral" }> = {
  RECEIVED: { label: "Đang chờ", tone: "warning" },
  COMPLETED: { label: "Đã xử lý", tone: "success" },
  REJECTED: { label: "Từ chối", tone: "neutral" },
}
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })

/**
 * Danh sách yêu cầu về dữ liệu cá nhân của một khách (ADR-014 D-P5, bước P-7b): loại, trạng thái, hạn; yêu cầu sửa đang
 * chờ đóng được ngay tại đây (`Q3`). `reloadKey` đổi thì tải lại (sau khi xuất / xoá / ghi nhận).
 */
export function CustomerDataRequestList({ customerId, reloadKey, canResolve }: { customerId: string; reloadKey: number; canResolve: boolean }) {
  const [items, setItems] = useState<DataSubjectRequestView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/v1/crm/data-requests?customer_id=${encodeURIComponent(customerId)}`)
      if (!res.ok) throw new Error()
      setItems(((await res.json()) as { data: DataSubjectRequestView[] }).data)
    } catch {
      setError("Không tải được danh sách yêu cầu.")
    }
  }, [customerId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh sách khi mở tab hoặc sau một thao tác (nợ #149)
    void load()
  }, [load, reloadKey])

  async function resolve(id: string, status: "COMPLETED" | "REJECTED") {
    setBusyId(id)
    try {
      const res = await fetch(`/api/v1/crm/data-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      setError("Chưa đóng được yêu cầu. Thử lại sau.")
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <InlineError message={error} onRetry={() => void load()} />
  if (!items) return <SkeletonBlock lines={2} label="Đang tải yêu cầu" />
  if (items.length === 0) return <EmptyState icon={FileText} title="Chưa có yêu cầu nào" reason="Khi khách yêu cầu xuất, xoá hoặc sửa dữ liệu, yêu cầu sẽ hiện ở đây." />

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3.5 text-caption">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text">{TYPE_LABEL[r.type]}</span>
              <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              {r.overdue && <Badge tone="danger">Quá hạn</Badge>}
            </div>
            <div className="text-text-muted">
              Nhận {when(r.receivedAt)}
              {r.status === "RECEIVED" ? ` · hạn ${when(r.dueAt)}` : r.completedAt ? ` · xong ${when(r.completedAt)}` : ""}
            </div>
            {r.note && <div className="text-text-muted">Ghi chú: {r.note}</div>}
            {r.type === "ERASE" && r.status === "RECEIVED" && (r.result?.["orders_waiting"] ?? 0) > 0 && (
              <div className="text-warning-text">
                Đã xoá hồ sơ và tin nhắn. Chờ {r.result?.["orders_waiting"]} đơn đang giao kết thúc — hệ thống tự xoá nốt địa chỉ, người nhận rồi hoàn tất.
              </div>
            )}
          </div>
          {r.status === "RECEIVED" && canResolve && (
            <div className="flex gap-2">
              {r.type === "RECTIFY" && (
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => void resolve(r.id, "COMPLETED")}>Đã sửa xong</Button>
              )}
              <Button variant="ghost" size="sm" disabled={busyId === r.id} onClick={() => void resolve(r.id, "REJECTED")}>Từ chối</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
