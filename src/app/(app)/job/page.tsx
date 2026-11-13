"use client"

import { useI18n } from "@/lib/i18n"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { NHAN_TINH_NANG } from "@/lib/feature-labels"
import { PageHeader } from "@/components/ui/page-header"

type Job = {
  id: string
  feature: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
  stage: string | null
  result: string | null
  error: string | null
  created_at?: string
}

const TRANG_THAI_ICON: Record<Job["status"], typeof Clock> = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: AlertTriangle,
  CANCELLED: XCircle,
}

const TRANG_THAI_NHAN: Record<Job["status"], string> = {
  PENDING: "Đang chờ",
  PROCESSING: "Đang chạy",
  COMPLETED: "Hoàn tất",
  FAILED: "Lỗi",
  CANCELLED: "Đã huỷ",
}

const TRANG_THAI_MAU: Record<Job["status"], string> = {
  PENDING: "text-text-muted",
  PROCESSING: "text-primary",
  COMPLETED: "text-secondary",
  FAILED: "text-danger",
  CANCELLED: "text-text-muted",
}

function JobCard({ job }: { job: Job }) {
  const Icon = TRANG_THAI_ICON[job.status]
  const isFailed = job.status === "FAILED"

  return (
    <Link
      href={`/job/${job.id}` as never}
      className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary ${
        isFailed ? "border-danger/30 bg-danger-bg/20" : "border-border bg-surface"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          size={18}
          strokeWidth={1.9}
          className={`flex-shrink-0 ${TRANG_THAI_MAU[job.status]} ${
            job.status === "PROCESSING" ? "animate-spin motion-reduce:animate-none" : ""
          }`}
        />
        <div className="min-w-0">
          <div className="truncate text-body-sm font-semibold">
            {NHAN_TINH_NANG[job.feature] ?? job.feature}
          </div>
          <div className="truncate text-caption text-text-muted">
            {TRANG_THAI_NHAN[job.status]}
            {job.stage ? ` · Giai đoạn: ${job.stage}` : ""}
            {job.error ? ` · ${job.error}` : ""}
          </div>
        </div>
      </div>
      <ChevronRight size={16} className="flex-shrink-0 text-text-muted" aria-hidden="true" />
    </Link>
  )
}

export default function JobListPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    let huy = false
    async function napLai() {
      try {
        const res = await fetch("/api/v1/jobs?limit=50")
        if (res.status === 401) {
          router.push("/dang-nhap" as never)
          return
        }
        if (!res.ok) throw new Error(`Không tải được danh sách job (${res.status})`)
        const data = (await res.json()) as { data: Job[] }
        if (!huy) setJobs(data.data)
      } catch (e) {
        if (!huy) setLoi(e instanceof Error ? e.message : "Không tải được danh sách job")
      }
    }
    napLai()
    return () => {
      huy = true
    }
  }, [router])

  const failedJobs = jobs?.filter((j) => j.status === "FAILED") ?? []
  const runningJobs = jobs?.filter((j) => j.status === "PROCESSING" || j.status === "PENDING") ?? []
  const completedJobs = jobs?.filter((j) => j.status === "COMPLETED" || j.status === "CANCELLED") ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center border-b border-border bg-surface px-4 py-4">
        <PageHeader
          title="Giao hàng & bàn giao"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {loi && (
          <div className="rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
            {loi}
          </div>
        )}

        {jobs === null ? (
          <div className="py-4">
            <SkeletonBlock lines={4} />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="Chưa có tác vụ nào"
            reason="Các tác vụ xử lý ảnh, tạo danh mục hoặc sinh nội dung AI sẽ xuất hiện tại đây khi bạn chạy."
            action={{
              label: "Tải ảnh để phân tích",
              onClick: () => router.push("/tai-anh" as never),
            }}
          />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Nhóm 1: Job Lỗi (Ưu tiên can thiệp hàng đầu) */}
            {failedJobs.length > 0 && (
              <section aria-labelledby="heading-failed-jobs" className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <AlertTriangle size={15} className="text-danger" aria-hidden="true" />
                  <h2 id="heading-failed-jobs" className="text-caption font-bold uppercase tracking-wider text-danger">
                    Lỗi cần can thiệp ({failedJobs.length})
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {failedJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </section>
            )}

            {/* Nhóm 2: Job Đang chạy / Đang chờ */}
            {runningJobs.length > 0 && (
              <section aria-labelledby="heading-running-jobs" className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Loader2 size={15} className="animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
                  <h2 id="heading-running-jobs" className="text-caption font-bold uppercase tracking-wider text-primary">
                    Đang xử lý ({runningJobs.length})
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {runningJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </section>
            )}

            {/* Nhóm 3: Job Đã hoàn tất / Đã huỷ */}
            {completedJobs.length > 0 && (
              <section aria-labelledby="heading-completed-jobs" className="flex flex-col gap-2">
                <h2 id="heading-completed-jobs" className="px-1 text-caption font-bold uppercase tracking-wider text-text-muted">
                  Đã hoàn tất ({completedJobs.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {completedJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
