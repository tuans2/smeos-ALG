"use client"

// Hàng đợi lỗi (ROADMAP E5.2): job dừng hẳn ở FAILED sau khi hết lượt tự thử lại hoặc gặp lỗi cần
// người xử lý. Xem cần N5; chạy lại / gác lại cần N15, qua ConfirmDialog, ghi nhật ký nền tảng.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { tenTinhNang } from "@/lib/feature-labels"
import { formatDateTime } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"

type FailedJob = {
  id: string
  organizationName: string
  feature: string
  failureKind: string | null
  error: string | null
  attempts: number
  createdAt: string
  completedAt: string | null
}

const LOAI_LOI: Record<string, string> = {
  RETRYABLE: "Lỗi tạm thời, đã thử hết lượt",
  NEEDS_ACTION: "Cần người xử lý",
}

export default function HangDoiLoiPage() {
  const [jobs, setJobs] = useState<FailedJob[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirmDialog()

  // Chỉ đặt state sau `await` — effect gọi hàm này lúc mở trang.
  const tai = useCallback(async () => {
    const res = await fetch("/api/v1/platform/jobs/failed", { cache: "no-store" })
    if (!res.ok) {
      setLoi("Không tải được hàng đợi lỗi.")
      return
    }
    setLoi(null)
    setJobs(((await res.json()) as { data: FailedJob[] }).data)
  }, [])

  useEffect(() => {
    void (async () => {
      await tai()
    })()
  }, [tai])

  async function hanhDong(job: FailedJob, action: "RETRY" | "DISMISS") {
    const chayLai = action === "RETRY"
    const ok = await confirm({
      title: chayLai ? "Chạy lại việc này?" : "Gác lại việc này?",
      consequence: chayLai
        ? `${tenTinhNang(job.feature)} của ${job.organizationName} được xếp lại vào hàng đợi như một lượt mới. Nền tảng chịu chi phí, không trừ credit của tiệm.`
        : `${tenTinhNang(job.feature)} của ${job.organizationName} rời hàng đợi lỗi và được đánh dấu đã huỷ. Tiệm vẫn được hoàn credit theo quy tắc.`,
      confirmLabel: chayLai ? "Chạy lại" : "Gác lại",
      tone: chayLai ? "default" : "danger",
    })
    if (!ok) return
    setDangXuLy(job.id)
    const res = await fetch(`/api/v1/platform/jobs/${job.id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setDangXuLy(null)
    if (!res.ok) {
      setLoi(res.status === 403 ? "Tài khoản chưa có quyền xử lý hàng đợi lỗi." : "Không thực hiện được — việc có thể đã được xử lý.")
    }
    await tai()
  }

  if (!jobs && !loi) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Hàng đợi lỗi"
        actions={<span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">Phạm vi: Toàn hạ tầng</span>}
      />
      <p className="text-body-sm text-text-muted">
        Việc đã thử hết lượt tự động hoặc gặp lỗi cần người xem. Hàng đợi đang chạy xem ở{" "}
        <Link href="/van-hanh/suc-khoe" className="text-primary underline underline-offset-2">Sức khoẻ hệ thống</Link>.
      </p>

      {loi && <InlineError message={loi} onRetry={() => void tai()} retryLabel="Tải lại" />}

      {jobs && jobs.length === 0 && (
        <EmptyState icon={CheckCircle2} title="Không có việc nào bị lỗi" reason="Việc chỉ hiện ở đây khi đã thử hết lượt tự động hoặc gặp lỗi cần người xem." />
      )}

      {jobs && jobs.length > 0 && (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-text">
                    {tenTinhNang(job.feature)} · {job.organizationName}
                  </p>
                  <p className="text-meta text-text-muted">
                    {LOAI_LOI[job.failureKind ?? ""] ?? "Chưa phân loại"} · thử {job.attempts} lần ·{" "}
                    {formatDateTime(job.completedAt ?? job.createdAt)}
                  </p>
                  {job.error && <p className="mt-1 break-words text-body-sm text-danger-text">{job.error}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" disabled={dangXuLy === job.id} onClick={() => void hanhDong(job, "RETRY")}>
                    Chạy lại
                  </Button>
                  <Button size="sm" variant="ghost" disabled={dangXuLy === job.id} onClick={() => void hanhDong(job, "DISMISS")}>
                    Gác lại
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {confirmDialog}
    </div>
  )
}
