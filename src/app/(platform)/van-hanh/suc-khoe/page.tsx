"use client"

// Sức khoẻ hệ thống (`N5`, P25a) — CHỈ ĐỌC + cảnh báo (D-N5, chốt 18/09).
// Không có nút hành động: không huỷ job, không khởi động lại worker.
// Job treo thật sự bị đánh dấu FAILED bởi `scripts/scan-stuck-jobs.ts`,
// chạy ngoài request HTTP. Xem đặc tả 06 mục 21.

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Server } from "@/components/ui/icon-set/server"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/i18n/formatters"
import { tenTinhNang } from "@/lib/feature-labels"
import { PageHeader } from "@/components/ui/page-header"

type PlatformSystemHealth = {
  jobCountsByStatus: Record<string, number>
  stuckJobs: Array<{ id: string; organizationId: string; feature: string; startedAt: string | null }>
  queue: Array<{ feature: string; pending: number; oldestPendingAt: string | null; failedLast24h: number }>
  workers: Array<{ name: string; connections: number }>
}

const TEN_WORKER: Record<string, string> = {
  vision: "Phân tích ảnh",
  media: "Xử lý ảnh và âm thanh",
  video: "Dựng video",
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return (await res.json()) as T
}

export default function SucKhoeHeThongPage() {
  const [health, setHealth] = useState<PlatformSystemHealth | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await layJson<{ data: PlatformSystemHealth }>("/api/v1/platform/health")
      if (!res) {
        setLoi("Không tải được sức khoẻ hệ thống.")
        return
      }
      setHealth(res.data)
    })()
  }, [])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!health) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sức khoẻ hệ thống"
        tip="Tình trạng các bộ xử lý nền, hàng đợi tác vụ AI và cảnh báo tác vụ tồn đọng."
        actions={
          <span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">Phạm vi: Toàn hạ tầng</span>
        }
      />

      <Card className="p-4 rounded-2xl shadow-xs">
        <p className="mb-3 flex items-center gap-2 text-body-sm font-semibold">
          <Server className="h-4 w-4 text-text-muted" aria-hidden /> Bộ xử lý nền
        </p>
        <ul className="flex flex-wrap gap-3">
          {health.workers.map((w) => (
            <li
              key={w.name}
              className={`rounded-xl border px-3 py-2 text-caption ${w.connections > 0 ? "border-success-border bg-success-bg text-success-text" : "border-danger-border bg-danger-bg text-danger-text"}`}
            >
              <span className="font-semibold">{TEN_WORKER[w.name] ?? w.name}</span>
              {" · "}
              {w.connections > 0 ? "đang chạy" : "không chạy"}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 rounded-2xl shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-body-sm font-semibold">Hàng đợi theo loại việc</p>
          <Link href="/van-hanh/hang-doi-loi" className="text-body-sm text-primary underline underline-offset-2">
            Xem việc bị lỗi
          </Link>
        </div>
        {health.queue.length === 0 ? (
          <p className="text-caption text-text-muted">Không có việc đang chờ hay lỗi trong 24 giờ qua.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="text-text-muted">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">Loại việc</th>
                  <th scope="col" className="py-1 pr-3 text-right font-medium">Đang chờ</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Chờ từ lúc</th>
                  <th scope="col" className="py-1 text-right font-medium">Lỗi trong 24 giờ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {health.queue.map((q) => (
                  <tr key={q.feature}>
                    <td className="py-2 pr-3">{tenTinhNang(q.feature)}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{q.pending}</td>
                    <td className="py-2 pr-3 text-text-muted">{q.oldestPendingAt ? formatDateTime(q.oldestPendingAt) : "—"}</td>
                    <td className={`py-2 text-right ${q.failedLast24h > 0 ? "font-semibold text-danger-text" : ""}`}>{q.failedLast24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 rounded-2xl shadow-xs">
        <p className="mb-3 text-body-sm font-semibold">Tác vụ theo trạng thái</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(health.jobCountsByStatus).map(([status, count]) => (
            <div key={status} className="rounded-xl border border-border px-3 py-2 text-caption">
              <span className="font-semibold">{count}</span> <span className="text-text-muted">{status}</span>
            </div>
          ))}
          {Object.keys(health.jobCountsByStatus).length === 0 && (
            <p className="text-caption text-text-muted">Chưa có tác vụ nào.</p>
          )}
        </div>
      </Card>

      <Card className="p-4 rounded-2xl shadow-xs">
        <p className="mb-3 flex items-center gap-2 text-body-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-warning-text" /> Tác vụ tồn đọng (chỉ đọc)
        </p>
        <div className="flex flex-col divide-y divide-border">
          {health.stuckJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between py-2 text-body-sm">
              <span>{job.feature} · tổ chức {job.organizationId}</span>
              <span className="text-text-muted">
                {job.startedAt ? formatDateTime(job.startedAt) : "—"}
              </span>
            </div>
          ))}
          {health.stuckJobs.length === 0 && (
            <p className="py-2 text-body-sm text-text-muted">Không có tác vụ tồn đọng.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
