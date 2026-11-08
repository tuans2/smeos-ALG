"use client"

import { useI18n } from "@/lib/i18n"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { FlowSteps, type FlowStep, type FlowStepStatus } from "@/components/flow/flow-steps"
import { NHAN_TINH_NANG } from "@/lib/feature-labels"

import { useSession } from "@/lib/session"
import { getIndustryTerminology, type IndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { PageHeader } from "@/components/ui/page-header"
import { jobStageLabel } from "@/modules/jobs/domain/job-stage-labels"

type JobDetail = {
  id: string
  feature: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
  stage: string | null
  result: string | null
  error: string | null
  product_id: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

const TRANG_THAI_NHAN: Record<JobDetail["status"], string> = {
  PENDING: "Đang chờ xử lý",
  PROCESSING: "Đang thực hiện",
  COMPLETED: "Đã hoàn tất",
  FAILED: "Gặp sự cố",
  CANCELLED: "Đã huỷ bỏ",
}

function dinhDangGio(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("vi-VN")
}

function layCacBuocTheoTinhNang(feature: string, ti: IndustryTerminology): FlowStep[] {
  if (feature === "vision.analyze") {
    return [
      { key: "detect", label: `Nhận diện cấu phần ${ti.sampleProduct}` },
      { key: "count", label: `Đếm cấu phần & định lượng` },
      { key: "palette", label: "Phân tích bảng màu & cụm phối" },
      { key: "style", label: `Xác định phong cách ${ti.makerAction}` },
    ]
  }
  if (feature === "media.optimize" || feature === "media.variant.cloud") {
    return [
      { key: "download", label: "Tải ảnh gốc" },
      { key: "segment", label: "Khử viền & tách nền sản phẩm" },
      { key: "enhance", label: "Cân bằng ánh sáng & phối cảnh" },
      { key: "package", label: "Đóng gói & xuất bản ảnh" },
    ]
  }
  if (feature === "copy.generate") {
    return [
      { key: "parse", label: `Đọc cấu trúc ${ti.sampleProduct}` },
      { key: "position", label: "Định vị thương mại & dịp" },
      { key: "draft", label: "Soạn thảo kịch bản & caption" },
      { key: "brand_check", label: "Kiểm chuẩn thương hiệu" },
    ]
  }
  return [
    { key: "init", label: "Khởi tạo tác vụ" },
    { key: "process", label: "Xử lý AI" },
    { key: "complete", label: "Đóng gói kết quả" },
  ]
}

function layTrangThaiCacBuoc(steps: FlowStep[], job: JobDetail): FlowStepStatus[] {
  const currentKey = job.stage ?? steps[0]?.key ?? "init"
  const currentIndex = steps.findIndex((s) => s.key === currentKey)
  const activeIdx = currentIndex >= 0 ? currentIndex : 0

  return steps.map((s, idx) => {
    if (job.status === "COMPLETED") return { key: s.key, status: "succeeded" }
    if (job.status === "CANCELLED") return { key: s.key, status: idx <= activeIdx ? "canceled" : "pending" }
    if (job.status === "FAILED") {
      if (idx < activeIdx) return { key: s.key, status: "succeeded" }
      if (idx === activeIdx) return { key: s.key, status: "error" }
      return { key: s.key, status: "pending" }
    }
    if (idx < activeIdx) return { key: s.key, status: "succeeded" }
    if (idx === activeIdx) return { key: s.key, status: "active" }
    return { key: s.key, status: "pending" }
  })
}

export default function JobDetailPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const params = useParams<{ id: string }>()
  const jobId = params.id

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState(false)

  const napLai = useCallback(async (isCancelled?: () => boolean) => {
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}`)
      if (res.status === 401) {
        router.push("/dang-nhap" as never)
        return
      }
      if (!res.ok) throw new Error(`Không tải được job (${res.status})`)
      const data = (await res.json()) as { job: JobDetail }
      if (!isCancelled?.()) {
        setJob(data.job)
      }
    } catch (e) {
      if (!isCancelled?.()) {
        setLoi(e instanceof Error ? e.message : "Không tải được job")
      }
    }
  }, [jobId, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      await napLai(() => cancelled)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [napLai])

  async function huy() {
    setDangXuLy(true)
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/cancel`, { method: "POST" })
      if (!res.ok) throw new Error(`Huỷ thất bại (${res.status})`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Huỷ thất bại")
    } finally {
      setDangXuLy(false)
    }
  }

  async function chayLai() {
    setDangXuLy(true)
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/retry`, { method: "POST" })
      if (!res.ok) throw new Error(`Chạy lại thất bại (${res.status})`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Chạy lại thất bại")
    } finally {
      setDangXuLy(false)
    }
  }

  const steps = job ? layCacBuocTheoTinhNang(job.feature, ti) : []
  const statuses = job ? layTrangThaiCacBuoc(steps, job) : []
  const currentStepKey = job?.stage ?? steps[0]?.key ?? "init"

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => router.push("/job" as never)}
          className="rounded-full"
          aria-label="Quay lại danh sách tác vụ"
        >
          <ArrowLeft size={18} />
        </Button>
        <PageHeader
          title={job ? NHAN_TINH_NANG[job.feature] ?? job.feature : "Chi tiết tác vụ"}
          description={<>Mã tác vụ: #{jobId.slice(0, 8)}</>}
        />
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        {loi && (
          <div className="rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
            {loi}
          </div>
        )}

        {job === null ? (
          <div className="py-4">
            <SkeletonBlock lines={5} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Thẻ thông báo nếu job bị lỗi */}
            {job.status === "FAILED" && (
              <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-bg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-danger" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="text-body-sm font-bold text-danger">Tác vụ gặp lỗi khi đang xử lý</div>
                    <div className="mt-1 text-caption text-text leading-relaxed">
                      {job.stage ? `Dừng lại ở giai đoạn "${jobStageLabel(job.stage)}". ` : ""}
                      {job.error ? `Chi tiết lỗi: ${job.error}` : "Vui lòng bấm 'Chạy lại' để thử lại tác vụ."}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    disabled={dangXuLy}
                    onClick={chayLai}
                    className="flex items-center gap-1.5"
                  >
                    <RotateCcw size={15} />
                    {dangXuLy ? "Đang chạy lại…" : "Chạy lại tác vụ"}
                  </Button>
                </div>
              </div>
            )}

            {/* Checklist từng bước (FlowSteps) */}
            <div className="flex flex-col gap-2">
              <h2 className="text-caption font-bold uppercase tracking-wider text-text-muted px-1">
                Tiến trình xử lý theo bước
              </h2>
              <FlowSteps
                steps={steps}
                currentStep={currentStepKey}
                statuses={statuses}
                cancellable={job.status === "PENDING"}
                onCancel={huy}
                showLog={false}
                logs={[
                  { seq: 1, text: `Khởi tạo: ${dinhDangGio(job.created_at)}`, at: job.created_at },
                  ...(job.started_at ? [{ seq: 2, text: `Bắt đầu chạy: ${dinhDangGio(job.started_at)}`, at: job.started_at }] : []),
                  ...(job.completed_at ? [{ seq: 3, text: `Hoàn tất: ${dinhDangGio(job.completed_at)}`, at: job.completed_at }] : []),
                  ...(job.error ? [{ seq: 4, text: `Lỗi: ${job.error}`, at: new Date().toISOString() }] : []),
                ]}
              />
            </div>

            {/* Thông số kỹ thuật của Job */}
            <Card className="flex flex-col gap-2.5 p-4">
              <h2 className="text-caption font-bold uppercase tracking-wider text-text-muted">
                Thông số vận hành
              </h2>
              <div className="divide-y divide-border text-body-sm">
                <div className="flex justify-between py-2">
                  <span className="text-text-muted">Trạng thái</span>
                  <span className="font-semibold text-text">{TRANG_THAI_NHAN[job.status]}</span>
                </div>
                {job.stage && (
                  <div className="flex justify-between py-2">
                    <span className="text-text-muted">Giai đoạn</span>
                    <span className="font-semibold text-text">{jobStageLabel(job.stage)}</span>
                  </div>
                )}
                {job.result && (
                  <div className="flex justify-between py-2">
                    <span className="text-text-muted">Kết quả</span>
                    <span className="font-semibold text-text">{job.result}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-text-muted">Khởi tạo</span>
                  <span className="font-medium text-text">{dinhDangGio(job.created_at)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-muted">Bắt đầu</span>
                  <span className="font-medium text-text">{dinhDangGio(job.started_at)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-muted">Kết thúc</span>
                  <span className="font-medium text-text">{dinhDangGio(job.completed_at)}</span>
                </div>
              </div>
            </Card>

            {job.status === "PENDING" && (
              <Button variant="secondary" disabled={dangXuLy} onClick={huy} className="min-h-11">
                <XCircle size={16} />
                {dangXuLy ? "Đang huỷ…" : "Huỷ tác vụ"}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
