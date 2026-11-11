"use client"

// Luồng phân tích ảnh (M01) — đặc tả 03 mục 6:
// Tải ảnh → Xác nhận ảnh → Đang chạy → Kết quả (sửa tại chỗ + duyệt).
//
// Nối API thật (trước đây chạy giả lập hoàn toàn ở client, không tạo job
// thật — tag "Chưa sẵn sàng" ở mock-data.ts trước đợt này):
//   Tải ảnh  → POST /assets/upload-url → PUT lên URL ký sẵn → POST /assets
//   Chạy     → POST /vision/analyses (một job cho cả lô, header
//              "idempotency-key" bắt buộc — YC-U7)
//   Theo dõi → GET /jobs/:id, vòng lặp tới khi COMPLETED/FAILED/CANCELLED
//   Kết quả  → GET /vision/analyses (hàng chờ duyệt), khớp theo job_id/asset_id
//   Sửa      → PATCH /vision/analyses/:id { edited } — thay NGUYÊN bản gốc,
//              không gộp một phần (đúng luật `resolveEffectiveAnalysis`)
//   Duyệt    → POST /vision/analyses/:id/approve — ghi Product Master,
//              không cần thân yêu cầu (tên sản phẩm nháp tự suy từ
//              identity.category)
//
// Job chạy dưới worker Python riêng (`workers/vision/jobs/worker.py`, cần
// biến môi trường DATABASE_URL và OPENAI_API_KEY) — màn này chỉ tạo và theo
// dõi đúng job thật, không tự giả lập kết quả.

import { Input } from "@/components/ui/input"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, X, Check, Pencil, Info, AlertTriangle, RotateCcw } from "@/components/ui/icons"
import { FlowTopBar } from "@/components/layout/flow-top-bar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSession } from "@/lib/session"
import { type AnalysisRow, asRecord, asArray, asText, asNumber, effectiveAnalysis, bomOf, SECTION_LABELS, rowLabel, rowColor, rowQuantity, rowConfidence, rowRawLabel, colorSwatch } from "./upload-wizard-helpers"
import { cn } from "@/lib/utils"
import { jobStorageKeyFor, legacyJobStorageKeyFor } from "./job-storage-key"

type Step = "upload" | "confirm" | "running" | "result"

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_PHOTOS = 10
const MAX_FILE_SIZE_MB = 20

const NHIP_HOI_MS = 2000
// Job nằm `PENDING` quá lâu gần như luôn có đúng một nguyên nhân: tiến trình
// worker Python không chạy. Chờ im lặng mãi làm người dùng tưởng hệ thống
// hỏng; nói thẳng sau hai phút thì người vận hành biết phải bật cái gì.
const CANH_BAO_CHO_XEP_HANG_LUOT = (2 * 60 * 1000) / NHIP_HOI_MS
// Quét job treo phía máy chủ cắt ở 15 phút (`YC-J10`). Màn hình dừng theo
// dõi ngay sau mốc đó — job vẫn còn nguyên trên máy chủ và mở lại được ở
// trang theo dõi job.
//
// Đếm theo SỐ LƯỢT hỏi, không theo đồng hồ: `Date.now()` gọi trong phạm vi
// component là hàm không thuần (`react-hooks/purity`), và số lượt cho ra một
// mốc ổn định như nhau vì nhịp hỏi cố định.
const NGUNG_THEO_DOI_LUOT = (16 * 60 * 1000) / NHIP_HOI_MS


type Photo = { id: number; file: File; previewUrl: string; name: string }
type UploadedPhoto = Photo & { assetId: string }

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
type JobState = { id: string; status: JobStatus; stage: string | null; result: string | null; error: string | null }

type RunPhase = "uploading" | "queuing" | "waiting" | "processing"
const RUN_PHASES: { key: RunPhase; label: string }[] = [
  { key: "uploading", label: "Tải ảnh lên" },
  { key: "queuing", label: "Tạo lượt phân tích" },
  { key: "waiting", label: "Xếp hàng chờ xử lý" },
  { key: "processing", label: "Phân tích ảnh (AI)" },
]

async function extractError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return data?.error?.message ?? `${fallback} (${res.status})`
}

export function UploadWizard() {
  const router = useRouter()
  const { can, organization } = useSession()
  const orgId = organization?.id
  const jobStorageKey = jobStorageKeyFor(orgId)
  const legacyJobStorageKey = legacyJobStorageKeyFor(orgId)

  const [step, setStep] = useState<Step>("upload")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploadNote, setUploadNote] = useState<string | null>(null)
  const nextId = useRef(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[] | null>(null)
  const [runPhase, setRunPhase] = useState<RunPhase>("uploading")
  const [runError, setRunError] = useState<string | null>(null)
  const [job, setJob] = useState<JobState | null>(null)
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([])
  const [resultIndex, setResultIndex] = useState(0)

  const [choLau, setChoLau] = useState(false)
  const [dangHuy, setDangHuy] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soLuotHoiRef = useRef(0)
  const cancelledRef = useRef(false)

  // React Strict Mode (chỉ bật ở môi trường dev) cố tình chạy each effect
  // hai lần để bắt lỗi: gắn -> gỡ giả -> gắn lại. Lần gỡ giả đó chạy hàm dọn
  // dẹp bên dưới, bật cancelledRef lên true — nếu không đặt lại về false ở
  // đầu lần gắn thật, MỌI vòng lặp hỏi lại job sau này thấy cờ này là true
  // thì tự thoát im lặng ngay từ dòng đầu, không báo lỗi, không polling —
  // đúng triệu chứng "treo mãi ở Xếp hàng chờ xử lý" dù job đã xong ở
  // server. Bản build production không có Strict Mode nên không dính lỗi
  // này, nhưng dev thì luôn dính — đây là lỗi có từ trước, không phải mới.
  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

  const stepIndex = { upload: 1, confirm: 2, running: 3, result: 4 }[step]

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadNote(null)
    setPhotos((cur) => {
      const room = MAX_PHOTOS - cur.length
      const accepted: Photo[] = []
      let rejected = 0
      let overflow = 0
      let quaNang = 0
      Array.from(files).forEach((file) => {
        if (accepted.length >= room) {
          overflow++
          return
        }
        if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
          rejected++
          return
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          quaNang++
          return
        }
        accepted.push({
          id: nextId.current++,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name.replace(/\.[^.]+$/, ""),
        })
      })
      if (rejected > 0 || overflow > 0 || quaNang > 0) {
        const parts: string[] = []
        if (rejected > 0) parts.push(`${rejected} tệp không phải ảnh jpg/png/webp/gif`)
        if (quaNang > 0) parts.push(`${quaNang} ảnh nặng hơn ${MAX_FILE_SIZE_MB} MB`)
        if (overflow > 0) parts.push(`${overflow} ảnh vượt quá tối đa ${MAX_PHOTOS}`)
        setUploadNote(`Đã bỏ qua: ${parts.join(", ")}.`)
      }
      return [...cur, ...accepted]
    })
  }

  function removePhoto(id: number) {
    setPhotos((cur) => {
      const target = cur.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return cur.filter((p) => p.id !== id)
    })
    // Danh sách ảnh đổi thì gói đã tải lên (nếu có từ một lượt chạy trước
    // đó bị lỗi) không còn khớp nữa — bắt tải lại từ đầu.
    setUploadedPhotos(null)
  }
  function renamePhoto(id: number, name: string) {
    setPhotos((cur) => cur.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  function goBack() {
    if (step === "confirm") setStep("upload")
    else if (step === "running") setStep("confirm")
    else if (step === "result") setStep("confirm")
    else router.push("/")
  }

  function resetWizard() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPhotos([])
    setUploadedPhotos(null)
    setJob(null)
    setAnalyses([])
    setResultIndex(0)
    setRunError(null)
    setStep("upload")
    try {
      if (jobStorageKey) window.localStorage.removeItem(jobStorageKey)
    } catch {
      // bỏ qua — không chặn việc bắt đầu lượt mới
    }
  }

  async function uploadAllPhotos(): Promise<UploadedPhoto[]> {
    const uploaded: UploadedPhoto[] = []
    for (const photo of photos) {
      const urlRes = await fetch("/api/v1/assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: null, mime_type: photo.file.type }),
      })
      if (!urlRes.ok) {
        throw new Error(await extractError(urlRes, `Không xin được URL tải lên cho "${photo.name}"`))
      }
      const { asset_id, storage_key, upload_url } = (await urlRes.json()) as {
        asset_id: string
        storage_key: string
        upload_url: string
      }

      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": photo.file.type },
        body: photo.file,
      })
      if (!putRes.ok) throw new Error(`Tải ảnh "${photo.name}" lên kho thất bại (mã ${putRes.status})`)

      const registerRes = await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id,
          product_id: null,
          kind: "ORIGINAL",
          storage_key,
          mime_type: photo.file.type,
          file_size: photo.file.size,
        }),
      })
      if (!registerRes.ok) {
        throw new Error(await extractError(registerRes, `Không đăng ký được asset cho "${photo.name}"`))
      }

      uploaded.push({ ...photo, assetId: asset_id })
    }
    return uploaded
  }

  async function startAnalysis() {
    setRunError(null)
    setJob(null)
    setAnalyses([])
    setResultIndex(0)
    setStep("running")
    try {
      let assets = uploadedPhotos
      if (!assets || assets.length !== photos.length) {
        setRunPhase("uploading")
        assets = await uploadAllPhotos()
        setUploadedPhotos(assets)
      }

      setRunPhase("queuing")
      const idempotencyKey = crypto.randomUUID()
      const jobRes = await fetch("/api/v1/vision/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": idempotencyKey },
        body: JSON.stringify({ asset_ids: assets.map((a) => a.assetId), product_id: null }),
      })
      if (!jobRes.ok) throw new Error(await extractError(jobRes, "Không tạo được lượt phân tích"))
      const created = (await jobRes.json()) as {
        job_id: string
        status: JobStatus
        usage: { cost_credit: number; balance_after: number | null }
      }
      setBalanceAfter(created.usage.balance_after)
      setJob({ id: created.job_id, status: created.status, stage: null, result: null, error: null })
      try {
        if (jobStorageKey) window.localStorage.setItem(jobStorageKey, created.job_id)
      } catch {
        // localStorage có thể bị chặn (chế độ riêng tư) — không chặn lượt
        // chạy, chỉ mất khả năng khôi phục nếu người dùng rời trang.
      }

      setRunPhase("waiting")
      soLuotHoiRef.current = 0
      setChoLau(false)
      await pollJob(created.job_id, assets)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Có lỗi khi chạy phân tích")
    }
  }

  async function pollJob(jobId: string, assets: UploadedPhoto[]) {
    if (cancelledRef.current) return
    const res = await fetch(`/api/v1/jobs/${jobId}`)
    if (!res.ok) {
      setRunError(await extractError(res, "Không đọc được trạng thái lượt phân tích"))
      return
    }
    const { job: row } = (await res.json()) as { job: JobState }
    setJob(row)
    if (row.status === "PROCESSING") setRunPhase("processing")

    if (row.status === "COMPLETED") {
      await loadAnalyses(jobId, assets)
      return
    }
    if (row.status === "FAILED") {
      setRunError(row.error ?? "Lượt phân tích thất bại — chưa rõ lý do")
      return
    }
    if (row.status === "CANCELLED") {
      setRunError("Lượt phân tích đã bị huỷ.")
      return
    }

    soLuotHoiRef.current += 1
    const daHoi = soLuotHoiRef.current
    setChoLau(row.status === "PENDING" && daHoi > CANH_BAO_CHO_XEP_HANG_LUOT)
    if (daHoi > NGUNG_THEO_DOI_LUOT) {
      setRunError(
        `Lượt phân tích vẫn ở trạng thái ${row.status} sau 15 phút. Màn hình ngừng theo dõi, ` +
          `job không mất — mở lại ở mục Lượt chạy để xem kết quả khi xong.`
      )
      return
    }

    pollTimer.current = setTimeout(() => {
      pollJob(jobId, assets)
    }, NHIP_HOI_MS)
  }

  /** `POST /jobs/:id/cancel` (`G6`) — chỉ job còn `PENDING` huỷ được. */
  async function huyJob() {
    if (!job) return
    setDangHuy(true)
    try {
      const res = await fetch(`/api/v1/jobs/${job.id}/cancel`, { method: "POST" })
      if (!res.ok) {
        setRunError(await extractError(res, "Không huỷ được lượt phân tích"))
        return
      }
      if (pollTimer.current) clearTimeout(pollTimer.current)
      setJob({ ...job, status: "CANCELLED" })
      setRunError("Lượt phân tích đã bị huỷ.")
      try {
        if (jobStorageKey) window.localStorage.removeItem(jobStorageKey)
      } catch {
        // bỏ qua
      }
    } finally {
      setDangHuy(false)
    }
  }

  async function loadAnalyses(jobId: string, assets: UploadedPhoto[]) {
    // `assets` rỗng nghĩa là đang khôi phục lượt chạy sau khi rời trang —
    // không còn danh sách ảnh gốc để khớp theo `asset_id`, nên lấy MỌI dòng
    // thuộc đúng `job_id` thay vì lọc theo một tập ảnh đã biết.
    const wanted = assets.length > 0 ? new Set(assets.map((a) => a.assetId)) : null
    const found: AnalysisRow[] = []
    let cursor: string | null = null
    for (let page = 0; page < 10 && (wanted === null || found.length < wanted.size); page++) {
      const params = new URLSearchParams({ limit: "50" })
      if (cursor) params.set("cursor", cursor)
      const res = await fetch(`/api/v1/vision/analyses?${params.toString()}`)
      if (!res.ok) {
        setRunError(await extractError(res, "Không tải được kết quả phân tích"))
        return
      }
      const data = (await res.json()) as { data: AnalysisRow[]; next_cursor: string | null }
      data.data.forEach((row) => {
        if (row.job_id === jobId && (wanted === null || wanted.has(row.asset_id))) found.push(row)
      })
      cursor = data.next_cursor
      if (!cursor) break
    }
    // Xếp theo đúng thứ tự ảnh đã chọn, không theo thứ tự trả về của hàng
    // chờ duyệt (mới nhất trước). Khi không còn danh sách ảnh gốc thì giữ
    // nguyên thứ tự vừa gom được.
    let ordered: AnalysisRow[]
    if (wanted !== null) {
      const byAsset = new Map(found.map((row) => [row.asset_id, row]))
      ordered = assets.map((a) => byAsset.get(a.assetId)).filter((r): r is AnalysisRow => Boolean(r))
    } else {
      ordered = found
    }
    setAnalyses(ordered)
    setResultIndex(0)
    setStep("result")
    if (ordered.length === 0) {
      try {
        if (jobStorageKey) window.localStorage.removeItem(jobStorageKey)
      } catch {
        // bỏ qua
      }
    }
  }

  // Khôi phục lượt chạy khi mở lại `/tai-anh`: trước tiên tìm job vừa tạo ở
  // chính tab này (`jobStorageKey`); nếu không có (tab mới, hoặc job đó
  // được tạo trước khi có cơ chế lưu này), lấy lượt phân tích mới nhất còn
  // đang chờ duyệt — vì một lượt vừa chạy xong luôn nằm ở đó cho tới khi ai
  // duyệt/từ chối. Không có gì để khôi phục thì cứ để màn hình ở bước Tải
  // ảnh, không phải lỗi cần báo.
  useEffect(() => {
    if (!jobStorageKey) return // chờ biết tổ chức — không đọc khoá của tổ chức khác
    ;(async () => {
      try {
        let jobId: string | null = null
        try {
          jobId = jobStorageKey
            ? (window.localStorage.getItem(jobStorageKey) ?? (legacyJobStorageKey ? window.localStorage.getItem(legacyJobStorageKey) : null))
            : null
        } catch {
          jobId = null
        }

        if (!jobId) {
          const resPending = await fetch("/api/v1/vision/analyses?limit=1")
          if (resPending.ok) {
            const data = (await resPending.json()) as { data: AnalysisRow[] }
            jobId = data.data[0]?.job_id ?? null
          }
        }
        if (!jobId || cancelledRef.current) return

        const resJob = await fetch(`/api/v1/jobs/${jobId}`)
        if (!resJob.ok) {
          if (jobStorageKey) window.localStorage.removeItem(jobStorageKey)
          return
        }
        const { job: row } = (await resJob.json()) as { job: JobState }
        if (cancelledRef.current) return
        setJob(row)
        if (row.status === "COMPLETED") {
          await loadAnalyses(jobId, [])
        } else if (row.status === "PENDING" || row.status === "PROCESSING") {
          setStep("running")
          setRunPhase(row.status === "PROCESSING" ? "processing" : "waiting")
          soLuotHoiRef.current = 0
          await pollJob(jobId, [])
        }
      } catch {
        // Không khôi phục được thì cứ để màn hình ở bước Tải ảnh.
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStorageKey])

  async function saveEdit(
    analysisId: string,
    section: string,
    index: number,
    sua: { quantity?: number; name?: string }
  ) {
    const target = analyses.find((a) => a.id === analysisId)
    if (!target) return
    const clone = JSON.parse(JSON.stringify(effectiveAnalysis(target))) as Record<string, unknown>
    const bom = asRecord(clone.bom)
    const rows = asArray(bom[section])
    if (!rows[index]) return

    const row = { ...rows[index] }
    if (sua.quantity !== undefined) row.quantity = sua.quantity
    if (sua.name !== undefined) {
      // Máy nhận sai loài là lỗi hệ thống, không phải dao động — cùng một
      // ảnh gọi lại ba lượt vẫn ra cùng cái tên sai (`config.json`, ghi chú
      // số lượt). Nên tên phải sửa được bằng tay, không chỉ số lượng.
      // `ma` là mã danh mục máy gán theo tên cũ; tên đổi thì mã đó không còn
      // căn cứ, bỏ trống để người soát gắn lại đúng mã.
      if (section === "wrapping") row.layer = sua.name
      else row.name = sua.name
      row.ma = null
    }
    rows[index] = row
    bom[section] = rows
    clone.bom = bom

    const res = await fetch(`/api/v1/vision/analyses/${analysisId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edited: clone }),
    })
    if (!res.ok) throw new Error(await extractError(res, "Không lưu được chỉnh sửa"))
    const updated = (await res.json()) as { edited: Record<string, unknown> | null }
    setAnalyses((cur) => cur.map((a) => (a.id === analysisId ? { ...a, edited: updated.edited } : a)))
  }

  async function approveAnalysis(analysisId: string) {
    const res = await fetch(`/api/v1/vision/analyses/${analysisId}/approve`, { method: "POST" })
    if (!res.ok) throw new Error(await extractError(res, "Không duyệt được"))
    setAnalyses((cur) => cur.map((a) => (a.id === analysisId ? { ...a, approval_state: "APPROVED" } : a)))
  }

  async function rejectAnalysis(analysisId: string, lyDo: string) {
    const res = await fetch(`/api/v1/vision/analyses/${analysisId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ly_do: lyDo.trim() === "" ? null : lyDo.trim() }),
    })
    if (!res.ok) throw new Error(await extractError(res, "Không từ chối được"))
    setAnalyses((cur) => cur.map((a) => (a.id === analysisId ? { ...a, approval_state: "REJECTED" } : a)))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <FlowTopBar
        title={
          step === "upload"
            ? "Phân tích ảnh sản phẩm"
            : step === "confirm"
              ? "Xác nhận trước khi chạy"
              : step === "running"
                ? "Đang phân tích"
                : "Kết quả phân tích"
        }
        step={stepIndex}
        totalSteps={4}
        onBack={goBack}
      />

      {step === "upload" && (
        <UploadStep
          photos={photos}
          note={uploadNote}
          fileInputRef={fileInputRef}
          onPick={() => fileInputRef.current?.click()}
          onFiles={addPhotos}
          onRemove={removePhoto}
          onNext={() => setStep("confirm")}
        />
      )}
      {step === "confirm" && (
        <ConfirmStep
          photos={photos}
          canRun={can("H1")}
          onRemove={removePhoto}
          onRename={renamePhoto}
          onStart={startAnalysis}
        />
      )}
      {step === "running" && (
        <RunningStep
          photoCount={photos.length}
          phase={runPhase}
          job={job}
          error={runError}
          choLau={choLau}
          dangHuy={dangHuy}
          onHuy={huyJob}
          onRetry={startAnalysis}
          onBackToConfirm={() => setStep("confirm")}
        />
      )}
      {step === "result" && (
        <ResultStep
          analyses={analyses}
          index={resultIndex}
          setIndex={setResultIndex}
          photos={uploadedPhotos ?? []}
          job={job}
          balanceAfter={balanceAfter}
          canEdit={can("H2")}
          canApprove={can("H3")}
          onSaveEdit={saveEdit}
          onApprove={approveAnalysis}
          onReject={rejectAnalysis}
          onFinish={() => {
            try {
              if (jobStorageKey) window.localStorage.removeItem(jobStorageKey)
            } catch {
              // bỏ qua
            }
            router.push("/")
          }}
          onRunAnother={resetWizard}
        />
      )}
    </div>
  )
}

function UploadStep({
  photos,
  note,
  fileInputRef,
  onPick,
  onFiles,
  onRemove,
  onNext,
}: {
  photos: Photo[]
  note: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onPick: () => void
  onFiles: (files: FileList | null) => void
  onRemove: (id: number) => void
  onNext: () => void
}) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <Button variant="ghost"
          type="button"
          onClick={onPick}
          className="h-auto text-[length:inherit] font-[inherit] flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface px-5 py-8 hover:bg-surface"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt">
            <Camera size={26} strokeWidth={1.8} className="text-primary" />
          </div>
          <div className="text-title-sm font-bold">Chụp ảnh hoặc chọn từ thư viện</div>
          <div className="text-center text-caption text-text-muted">
            Nhiều ảnh cùng lúc được — mỗi ảnh một lượt nhận diện. Tối đa {MAX_PHOTOS} ảnh, jpg/png/webp/gif.
          </div>
        </Button>

        {note && (
          <div className="flex items-start gap-1.5 rounded-lg bg-warning-bg px-2.5 py-2 text-caption text-warning-text">
            <Info size={13} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
            <div>{note}</div>
          </div>
        )}

        {photos.length > 0 ? (
          <div>
            <div className="mb-2.5 text-body-sm font-bold text-text-muted">Ảnh đã chọn · {photos.length}</div>
            <div className="grid grid-cols-3 gap-2.5">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-alt">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt={p.name} className="h-full w-full object-cover" />
                  <Button variant="ghost"
                    type="button"
                    onClick={() => onRemove(p.id)}
                    className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 absolute right-0.5 top-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/60"
                    aria-label="Bỏ ảnh"
                  >
                    <X size={13} strokeWidth={2.6} color="white" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-2.5 text-center text-body-sm text-text-muted">
            Chưa có ảnh nào — bấm ô phía trên để bắt đầu.
          </div>
        )}
      </div>
      <div className="flex-shrink-0 border-t border-border bg-surface p-5">
        <Button className="w-full" disabled={photos.length === 0} onClick={onNext}>
          Tiếp tục ({photos.length} ảnh)
        </Button>
      </div>
    </>
  )
}

function ConfirmStep({
  photos,
  canRun,
  onRemove,
  onRename,
  onStart,
}: {
  photos: Photo[]
  canRun: boolean
  onRemove: (id: number) => void
  onRename: (id: number, name: string) => void
  onStart: () => void
}) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="text-meta text-text-muted">
          Kiểm tra lại danh sách ảnh trước khi chạy. Bỏ được từng ảnh khỏi lượt chạy.
        </div>

        <div className="flex flex-col gap-2.5">
          {photos.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-2.5">
              <div className="h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  value={p.name}
                  onChange={(e) => onRename(p.id, e.target.value)}
                  className="w-full border-none bg-transparent text-body font-semibold text-text outline-none"
                />
                <div className="mt-0.5 truncate text-caption text-text-muted">{p.file.name}</div>
              </div>
              <Button variant="ghost"
                type="button"
                onClick={() => onRemove(p.id)}
                className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
                aria-label="Bỏ ảnh"
              >
                <X size={17} strokeWidth={2} />
              </Button>
            </Card>
          ))}
          {photos.length === 0 && (
            <div className="py-5 text-center text-body-sm text-text-muted">Không còn ảnh nào trong lượt chạy này.</div>
          )}
        </div>

        <Card className="flex flex-col gap-1.5 border-none bg-surface-alt p-4 text-body-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Cả lượt chạy này ({photos.length} ảnh)</span>
            <span className="font-bold text-primary">1 credit</span>
          </div>
          <div className="text-caption text-text-muted">
            Tính theo mỗi lượt phân tích, không theo số ảnh trong lượt.
          </div>
        </Card>
      </div>
      <div className="flex-shrink-0 border-t border-border bg-surface p-5">
        {canRun ? (
          <Button className="w-full" disabled={photos.length === 0} onClick={onStart}>
            Bắt đầu phân tích
          </Button>
        ) : (
          <div className="rounded-xl bg-surface-alt px-3.5 py-3 text-center text-meta text-text-muted">
            Tài khoản này chưa có quyền chạy phân tích ảnh.
          </div>
        )}
      </div>
    </>
  )
}

function RunningStep({
  photoCount,
  phase,
  job,
  error,
  choLau,
  dangHuy,
  onHuy,
  onRetry,
  onBackToConfirm,
}: {
  photoCount: number
  phase: RunPhase
  job: JobState | null
  error: string | null
  choLau: boolean
  dangHuy: boolean
  onHuy: () => void
  onRetry: () => void
  onBackToConfirm: () => void
}) {
  const phaseIndex = RUN_PHASES.findIndex((p) => p.key === phase)

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg">
          <AlertTriangle size={26} strokeWidth={1.8} className="text-danger" />
        </div>
        <div className="text-title-sm font-bold">Lượt phân tích chưa xong</div>
        <div className="max-w-xs text-meta leading-relaxed text-text-muted">{error}</div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button className="w-full" onClick={onRetry}>
            <RotateCcw size={15} strokeWidth={2} />
            Thử lại
          </Button>
          <Button variant="secondary" className="w-full" onClick={onBackToConfirm}>
            Quay lại xác nhận
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-[22px] overflow-y-auto p-[22px]">
      <div className="text-body-sm text-text-muted">Đang phân tích {photoCount} ảnh trong lượt này.</div>

      <Card className="flex flex-col p-[18px]">
        {RUN_PHASES.map((p, i) => {
          const isDone = i < phaseIndex
          const isActive = i === phaseIndex
          return (
            <div key={p.key} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                {isDone ? (
                  <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Check size={12} strokeWidth={3} color="white" />
                  </div>
                ) : isActive ? (
                  <div className="h-[22px] w-[22px] flex-shrink-0 animate-pulse motion-reduce:animate-none rounded-full bg-primary" />
                ) : (
                  <div className="h-[22px] w-[22px] flex-shrink-0 rounded-full border-2 border-border" />
                )}
                <div className={cn("min-h-[22px] w-0.5 flex-1", isDone ? "bg-secondary" : "bg-border")} />
              </div>
              <div className="pb-[22px]">
                <div className={cn("text-body-sm", i > phaseIndex ? "text-text-muted" : "font-bold")}>{p.label}</div>
                {isActive && p.key === "waiting" && job?.status === "PENDING" && (
                  <div className="mt-0.5 text-caption text-text-muted">Chờ tới lượt trong hàng đợi worker...</div>
                )}
                {isActive && p.key === "processing" && (
                  <div className="mt-0.5 text-caption text-text-muted">
                    {job?.stage === "DETECTING" ? "Đang nhận diện cấu phần trong ảnh..." : "Đang xử lý..."}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </Card>

      {choLau && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning-bg p-3.5">
          <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-warning-text" />
          <div className="text-caption leading-relaxed text-warning-text">
            Lượt chạy đã xếp hàng hơn hai phút mà chưa có tiến trình nào nhận. Thường là tiến trình
            phân tích ảnh chưa được bật. Báo người vận hành, hoặc huỷ lượt này rồi chạy lại sau.
          </div>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl bg-surface-alt p-3.5">
        <Info size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-primary" />
        <div className="text-caption leading-relaxed text-text-muted">
          Job chạy ở máy chủ và không mất khi rời màn hình — mở lại ở mục Lượt chạy để xem kết quả.
        </div>
      </div>

      {job?.status === "PENDING" && (
        <Button variant="secondary" className="w-full" disabled={dangHuy} onClick={onHuy}>
          {dangHuy ? "Đang huỷ..." : "Huỷ lượt phân tích"}
        </Button>
      )}
    </div>
  )
}

function ResultStep({
  analyses,
  index,
  setIndex,
  photos,
  job,
  balanceAfter,
  canEdit,
  canApprove,
  onSaveEdit,
  onApprove,
  onReject,
  onFinish,
  onRunAnother,
}: {
  analyses: AnalysisRow[]
  index: number
  setIndex: (i: number) => void
  photos: UploadedPhoto[]
  job: JobState | null
  balanceAfter: number | null
  canEdit: boolean
  canApprove: boolean
  onSaveEdit: (
    analysisId: string,
    section: string,
    rowIndex: number,
    sua: { quantity?: number; name?: string }
  ) => Promise<void>
  onApprove: (analysisId: string) => Promise<void>
  onReject: (analysisId: string, lyDo: string) => Promise<void>
  onFinish: () => void
  onRunAnother: () => void
}) {
  const [editing, setEditing] = useState<{ section: string; rowIndex: number } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editName, setEditName] = useState("")
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [moXacNhan, setMoXacNhan] = useState(false)
  const [lyDoTuChoi, setLyDoTuChoi] = useState("")

  if (analyses.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-body-sm text-text-muted">
        Không tìm thấy kết quả phân tích cho lượt chạy này.
      </div>
    )
  }

  const current = analyses[index]
  if (!current) return null
  const currentId = current.id
  const photo = photos.find((p) => p.assetId === current.asset_id)
  const bom = bomOf(current)
  const overallConfidence = asNumber(effectiveAnalysis(current).confidence)
  const allApproved = analyses.every((a) => a.approval_state === "APPROVED")

  async function handleApprove() {
    setBusy(true)
    setRowError(null)
    try {
      await onApprove(currentId)
      setMoXacNhan(false)
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Không duyệt được")
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    setBusy(true)
    setRowError(null)
    try {
      await onReject(currentId, lyDoTuChoi)
      setMoXacNhan(false)
      setLyDoTuChoi("")
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Không từ chối được")
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(section: string) {
    if (!editing) return
    const ten = editName.trim()
    if (ten.length === 0) {
      setRowError("Tên cấu phần không được để trống")
      return
    }
    const sua: { quantity?: number; name?: string } = { name: ten }
    if (editValue !== "") {
      const qty = Number(editValue)
      if (!Number.isInteger(qty) || qty < 0) {
        setRowError("Số lượng phải là số nguyên không âm")
        return
      }
      sua.quantity = qty
    }
    setBusy(true)
    setRowError(null)
    try {
      await onSaveEdit(currentId, section, editing.rowIndex, sua)
      setEditing(null)
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Không lưu được")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-[18px]">
        <div className="flex items-center justify-between text-meta text-text-muted">
          <span>
            Ảnh {index + 1}/{analyses.length}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost"
              type="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              className="h-auto text-[length:inherit] gap-0 rounded-full px-2.5 py-1 font-bold text-primary disabled:opacity-30"
            >
              ← Trước
            </Button>
            <Button variant="ghost"
              type="button"
              disabled={index === analyses.length - 1}
              onClick={() => setIndex(index + 1)}
              className="h-auto text-[length:inherit] gap-0 rounded-full px-2.5 py-1 font-bold text-primary disabled:opacity-30"
            >
              Sau →
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {photo ? (
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt={photo.name} className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <div className="text-title-sm font-extrabold">{photo?.name ?? "Ảnh sản phẩm"}</div>
            <div className="flex items-center gap-1.5">
              {current.approval_state === "APPROVED" && (
                <span className="rounded-full bg-success-bg px-2.5 py-1 text-caption font-bold text-primary">
                  Đã duyệt
                </span>
              )}
              {overallConfidence != null && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-caption font-bold",
                    overallConfidence < 70 ? "bg-warning-bg text-warning-text" : "bg-surface-alt text-text-muted"
                  )}
                >
                  Tin cậy {overallConfidence}%
                </span>
              )}
            </div>
          </div>
          {job?.result === "LOW_CONFIDENCE" && (
            <div className="flex items-start gap-1.5 rounded-lg bg-warning-bg px-2.5 py-2 text-caption text-warning-text">
              <AlertTriangle size={13} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
              <div>Lượt phân tích này có ảnh nhận diện với độ tin cậy thấp — nên kiểm lại trước khi duyệt.</div>
            </div>
          )}
        </div>

        {Object.keys(SECTION_LABELS).map((section) => {
          const rows = asArray(bom[section])
          if (rows.length === 0) return null
          return (
            <Card key={section} className="flex flex-col gap-3 p-4">
              <div className="text-body-sm font-bold uppercase tracking-wide text-text-muted">
                {SECTION_LABELS[section]}
              </div>
              {rows.map((row, rowIndex) => {
                const isEditingRow = editing?.section === section && editing.rowIndex === rowIndex
                const qty = rowQuantity(row)
                const confidence = rowConfidence(row)
                const color = rowColor(row)
                const rawLabel = rowRawLabel(row)
                const label = rowLabel(section, row)
                // Mọi cấu phần đều sửa được tên, kể cả lớp gói. Số lượng chỉ
                // sửa được ở dòng máy có trả số — hợp đồng chưa có `quantity`
                // cho lớp gói (nợ #2), và ô số trống trên một trường không
                // tồn tại chỉ gây hiểu nhầm.
                return (
                  <div key={rowIndex} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      {color && (
                        <div
                          className="h-4 w-4 flex-shrink-0 rounded-md border border-border"
                          style={{ background: colorSwatch(color) }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-body font-semibold">{label}</div>
                        {rawLabel && rawLabel !== label && (
                          <div
                            className="mt-0.5 truncate text-caption italic text-text-muted"
                            title={rawLabel}
                          >
                            Mô hình mô tả: {rawLabel}
                          </div>
                        )}
                        {confidence != null && confidence < 70 && (
                          <span className="mt-0.5 inline-flex items-center rounded-full border-[1.3px] border-warning px-1.5 py-0.5 text-caption font-bold text-warning-text">
                            Chưa chắc — nên kiểm lại
                          </span>
                        )}
                      </div>
                      {qty != null && !isEditingRow && (
                        <div className="text-body font-bold">× {qty}</div>
                      )}
                      {canEdit && !isEditingRow && (
                        <Button variant="ghost"
                          type="button"
                          onClick={() => {
                            setEditing({ section, rowIndex })
                            setEditName(rowLabel(section, row))
                            setEditValue(qty != null ? String(qty) : "")
                            setRowError(null)
                          }}
                          className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
                          aria-label="Sửa cấu phần"
                        >
                          <Pencil size={16} strokeWidth={1.8} />
                        </Button>
                      )}
                    </div>

                    {isEditingRow && (
                      <div className="flex items-center gap-2 rounded-xl bg-surface-alt p-2.5">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Tên cấu phần"
                          aria-label="Tên cấu phần"
                          className="h-[34px] min-w-0 flex-1 rounded-lg border-[1.5px] border-primary bg-surface px-2 text-body outline-none"
                        />
                        {qty != null && (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            inputMode="numeric"
                            aria-label="Số lượng"
                            className="h-[34px] w-14 flex-shrink-0 rounded-lg border-[1.5px] border-primary bg-surface text-center text-body font-bold outline-none"
                          />
                        )}
                        <Button variant="ghost"
                          type="button"
                          disabled={busy}
                          onClick={() => handleSaveEdit(section)}
                          className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-secondary-text hover:bg-surface disabled:opacity-40"
                          aria-label="Lưu"
                        >
                          <Check size={17} strokeWidth={2.4} />
                        </Button>
                        <Button variant="ghost"
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditing(null)
                            setRowError(null)
                          }}
                          className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface disabled:opacity-40"
                          aria-label="Bỏ sửa"
                        >
                          <X size={17} strokeWidth={2.2} />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>
          )
        })}

        <div className="px-3 text-center text-caption text-text-muted">
          Bản sửa lưu tách khỏi dự đoán gốc — xem lại được máy đoán gì ban đầu.
        </div>

        {rowError && (
          <div className="rounded-lg bg-danger-bg px-2.5 py-2 text-center text-caption font-medium text-danger">
            {rowError}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-border bg-surface p-5">
        {current.approval_state === "APPROVED" ? (
          allApproved ? (
            <div className="flex flex-col gap-2">
              <div className="text-center text-meta text-text-muted">
                Đã duyệt cả {analyses.length} ảnh
                {balanceAfter != null ? ` — còn ${balanceAfter} credit.` : "."}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={onRunAnother}>
                  Phân tích lô khác
                </Button>
                <Button className="flex-1" onClick={onFinish}>
                  Về trang chủ
                </Button>
              </div>
            </div>
          ) : (
            <Button className="h-[50px] w-full" onClick={() => setIndex(Math.min(index + 1, analyses.length - 1))}>
              Sang ảnh tiếp theo
            </Button>
          )
        ) : current.approval_state === "REJECTED" ? (
          <div className="flex flex-col gap-2">
            <div className="text-center text-meta text-text-muted">
              Kết quả này đã bị từ chối và không vào Product Master.
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setIndex(Math.min(index + 1, analyses.length - 1))}
              disabled={index === analyses.length - 1}
            >
              Sang ảnh tiếp theo
            </Button>
          </div>
        ) : canApprove ? (
          <Button className="h-[50px] w-full" disabled={busy} onClick={() => setMoXacNhan(true)}>
            Kiểm tra và xác nhận
          </Button>
        ) : (
          <div className="rounded-xl bg-surface-alt px-3.5 py-3 text-center text-meta text-text-muted">
            Chỉ Điều hành mới duyệt được kết quả phân tích.
          </div>
        )}
      </div>

      {moXacNhan && (
        <XacNhanDialog
          analysis={current}
          busy={busy}
          loi={rowError}
          lyDo={lyDoTuChoi}
          setLyDo={setLyDoTuChoi}
          onDuyet={handleApprove}
          onTuChoi={handleReject}
          onDong={() => {
            setMoXacNhan(false)
            setRowError(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Hộp thoại xác nhận — chỗ duy nhất trong luồng người soát nhìn thấy TOÀN BỘ
 * những gì sắp ghi vào Product Master cùng một lúc. Màn kết quả phía sau bày
 * từng khối rời và cuộn dài; duyệt từ đó là duyệt một thứ chưa nhìn hết.
 *
 * Hai phán quyết đặt cạnh nhau, không phải một nút duyệt với đường từ chối
 * giấu ở đâu đó: bỏ một kết quả sai phải dễ ngang nhận một kết quả đúng, nếu
 * không thì người soát sẽ duyệt cho xong.
 */
function XacNhanDialog({
  analysis,
  busy,
  loi,
  lyDo,
  setLyDo,
  onDuyet,
  onTuChoi,
  onDong,
}: {
  analysis: AnalysisRow
  busy: boolean
  loi: string | null
  lyDo: string
  setLyDo: (v: string) => void
  onDuyet: () => void
  onTuChoi: () => void
  onDong: () => void
}) {
  const [chonTuChoi, setChonTuChoi] = useState(false)
  const hieuLuc = effectiveAnalysis(analysis)
  const identity = asRecord(hieuLuc.identity)
  const bom = asRecord(hieuLuc.bom)
  const daSua = analysis.edited !== null

  const tong: { nhan: string; gia_tri: number | null }[] = [
    { nhan: "Số hoa", gia_tri: asNumber(hieuLuc.flower_count) },
    { nhan: "Số nụ", gia_tri: asNumber(hieuLuc.bud_count) },
    { nhan: "Số hỏng", gia_tri: asNumber(hieuLuc.damaged_count) },
  ]

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận kết quả phân tích"
    >
      <Button variant="ghost" type="button" className="h-auto px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex-1" aria-label="Đóng" onClick={onDong} />

      <div className="flex max-h-[86%] flex-col rounded-t-2xl bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="text-title-sm font-extrabold">Xác nhận trước khi ghi</div>
          <Button variant="ghost"
            type="button"
            onClick={onDong}
            className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={2} />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5">
          <div className="text-meta leading-relaxed text-text-muted">
            Duyệt sẽ ghi những dữ liệu dưới đây vào Product Master và dùng lại ở tính giá, tra cứu và
            các kênh bán. {daSua ? "Bản này đã có chỉnh sửa của người soát." : "Bản này giữ nguyên dự đoán của máy."}
          </div>

          <Card className="flex flex-col gap-2 p-4">
            <div className="text-meta font-bold uppercase tracking-wide text-text-muted">Nhận dạng</div>
            {[
              ["Dạng sản phẩm", asText(identity.category)],
              ["Hình khối", asText(identity.shape)],
              ["Mặt trình bày", asText(identity.facing)],
              ["Vật chứa", asText(identity.container)],
            ].map(([nhan, gia_tri]) => (
              <div key={nhan} className="flex justify-between text-body-sm">
                <span className="text-text-muted">{nhan}</span>
                <span className={cn("font-semibold", !gia_tri && "text-text-muted")}>
                  {gia_tri ?? "chưa xác định"}
                </span>
              </div>
            ))}
          </Card>

          <Card className="flex justify-between gap-2 p-4">
            {tong.map((t) => (
              <div key={t.nhan} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-caption text-text-muted">{t.nhan}</div>
                <div className={cn("text-display font-extrabold", t.gia_tri === null && "text-text-muted")}>
                  {t.gia_tri ?? "—"}
                </div>
              </div>
            ))}
          </Card>

          {Object.keys(SECTION_LABELS).map((section) => {
            const rows = asArray(bom[section])
            if (rows.length === 0) return null
            return (
              <Card key={section} className="flex flex-col gap-2 p-4">
                <div className="text-meta font-bold uppercase tracking-wide text-text-muted">
                  {SECTION_LABELS[section]}
                </div>
                {rows.map((row, i) => {
                  const qty = rowQuantity(row)
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 text-body-sm">
                      <span className="min-w-0 flex-1 truncate">{rowLabel(section, row)}</span>
                      <span className="flex-shrink-0 font-bold">{qty === null ? "—" : `× ${qty}`}</span>
                    </div>
                  )
                })}
              </Card>
            )
          })}

          {chonTuChoi && (
            <Card className="flex flex-col gap-2 border-none bg-surface-alt p-4">
              <label htmlFor="ly-do-tu-choi" className="text-meta font-bold">
                Vì sao bỏ kết quả này
              </label>
              <Input
                id="ly-do-tu-choi"
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                placeholder="Nhận sai loài, ảnh chụp thiếu sản phẩm..."
                className="h-[38px] rounded-lg border-[1.5px] border-border bg-surface px-2.5 text-body-sm outline-none focus:border-primary"
              />
              <div className="text-caption text-text-muted">
                Câu này vào nhật ký kiểm toán — chỗ duy nhất còn giữ được lý do sau này.
              </div>
            </Card>
          )}

          {loi && (
            <div className="rounded-lg bg-danger-bg px-2.5 py-2 text-center text-caption font-medium text-danger">
              {loi}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 gap-2 border-t border-border p-5">
          {chonTuChoi ? (
            <>
              <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => setChonTuChoi(false)}>
                Quay lại
              </Button>
              <Button className="flex-1" disabled={busy} onClick={onTuChoi}>
                {busy ? "Đang bỏ..." : "Xác nhận bỏ"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => setChonTuChoi(true)}>
                Bỏ kết quả
              </Button>
              <Button className="flex-1" disabled={busy} onClick={onDuyet}>
                {busy ? "Đang duyệt..." : "Duyệt"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Bảng màu tối thiểu cho khối màu bên cạnh mỗi cấu phần — chỉ để phân biệt
// nhanh bằng mắt, không phải màu thật của ảnh (không đọc được từ hợp đồng
// AI). Không khớp nhãn nào thì dùng lại nền trung tính.
