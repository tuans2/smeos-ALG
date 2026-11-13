"use client"

// Nhật ký xuyên tổ chức (`N6`, P25a) — hợp `audit_logs` mọi tổ chức và
// `platform_audit_logs`. Xem đặc tả 06 mục 21.

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"

type PlatformAuditRow = {
  id: string
  source: "organization" | "platform"
  organizationId: string | null
  userId: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return (await res.json()) as T
}

export default function NhatKyPage() {
  const [rows, setRows] = useState<PlatformAuditRow[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await layJson<{ data: PlatformAuditRow[] }>("/api/v1/platform/audit-logs")
      if (!res) {
        setLoi("Không tải được nhật ký.")
        return
      }
      setRows(res.data)
    })()
  }, [])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!rows) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  return (
    <Card className="overflow-x-auto p-4 rounded-2xl shadow-xs">
      <PageHeader
        className="mb-3 border-b border-border pb-2"
        title="Nhật ký kiểm toán"
        tip="Ghi chép mọi thao tác quan trọng của người dùng và hệ thống trên toàn nền tảng."
        actions={
          <span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">Phạm vi: Toàn hệ thống</span>
        }
      />
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border text-text-muted">
            <th className="py-2 pr-3">Lúc</th>
            <th className="py-2 pr-3">Nguồn</th>
            <th className="py-2 pr-3">Hành động</th>
            <th className="py-2 pr-3">Đối tượng</th>
            <th className="py-2 pr-3">Tổ chức</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface-alt">
              <td className="py-2 pr-3">{formatDateTime(row.createdAt)}</td>
              <td className="py-2 pr-3">{row.source === "platform" ? "Vận hành" : "Tổ chức"}</td>
              <td className="py-2 pr-3 font-medium">{row.action}</td>
              <td className="py-2 pr-3">{row.entityType} · {row.entityId}</td>
              <td className="py-2 pr-3">{row.organizationId ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-text-muted">
                Chưa có nhật ký nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
