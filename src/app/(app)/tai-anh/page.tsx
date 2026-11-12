"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Camera, ChevronRight, Check, AlertTriangle, Sparkles, ArrowLeft, X, Upload, Image as ImageIcon, FileText, Folder, Info } from "@/components/ui/icons"
import { type ResultField, type ResultFieldItem, type ResultImage, type JudgmentState } from "@/components/result/result-card"
import { mapAnalysisFromSchema } from "@/modules/products/domain/analysis-schema-mapper"
import { SalesPitchCard } from "@/components/sales/sales-pitch-card"
import { buildSalesPitchData, type SalesPitchOverrides, type SalesPitchData } from "@/modules/products/domain/sales-pitch-template"
import { useTenantSalesDefaults } from "@/lib/hooks/use-tenant-sales-defaults"
import { mapProductCopyToFields } from "@/modules/products/domain/product-copy-fields"
import { applyFieldAdd, applyFieldChange, applyFieldRemove, applyItemChange } from "@/modules/products/domain/analysis-field-edits"
import { FlowSteps, type FlowStep } from "@/components/flow/flow-steps"
import { buildHandoffSearchParams } from "@/modules/creative-production/domain/build-handoff-url"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useSession } from "@/lib/session"
import { ApprovedAnalysesSelector } from "./ApprovedAnalysesSelector"
import { AccountStorageHub, type RawAssetItem, type ApprovedAnalysisItem } from "@/components/storage/account-storage-hub"
import { TabActionHeader, type TabItem, type TabAction } from "@/components/ui/tab-header"
import { useI18n } from "@/lib/i18n"
import {
  M01aGuidanceCard,
  M01bGuidanceCard,
  M01cGuidanceCard,
  AnalysisResultCard,
  CommercialContentCard,
} from "@/components/templates/product-analysis"
import type { Route } from "next"
import { PageHeader } from "@/components/ui/page-header"
import { isHrefInPhase } from "@/lib/delivery/delivery-phase"

// ============================================================
// API HELPERS
// ============================================================

const IDEMPOTENCY_KEY_HEADER = "idempotency-key"

function apiFetch(path: string, options?: RequestInit) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
}

async function apiFetchWithAuth(path: string, options?: RequestInit) {
  const res = await apiFetch(path, options)
  if (res.status === 401) {
    return { ok: false, status: 401 as const, data: null }
  }
  if (!res.ok) {
    let message = `Lỗi ${res.status}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch { /* ignore */ }
    return { ok: false, status: res.status, data: null, message }
  }
  const data = await res.json()
  return { ok: true, status: 200 as const, data }
}

// ============================================================
// FIELD MAPPER — raw analysis → ResultField[]
// ============================================================

function mapAnalysisToFields1(raw: Record<string, unknown>, industryKey?: string): ResultField[] {
  return mapAnalysisFromSchema(raw, industryKey)
}

function mapSalesFields(raw: Record<string, unknown>): ResultField[] {
  const identity = (raw.identity as Record<string, unknown> | undefined) ?? {}
  return [
    { key: "name", label: "Tên sản phẩm", type: "text", editable: true, value: (raw.product_name as string) ?? (identity.category as string) ?? "—" },
    { key: "desc", label: "Mô tả sản phẩm", type: "textarea", editable: true, value: (raw.description as string) ?? "" },
    { key: "tags", label: "Thẻ phân loại", type: "list", editable: true, value: [], confidence: null, placeholder: "Thêm thẻ..." },
    { key: "tones", label: "Tone màu dạng nhãn bán hàng", type: "list", editable: true, value: [], confidence: null, placeholder: "Thêm tone..." },
    { key: "style", label: "Phong cách thiết kế", type: "text", editable: true, value: (raw.style as string) ?? "—" },
    { key: "occasions", label: "Dịp phù hợp", type: "list", editable: true, value: [], confidence: null, placeholder: "Thêm dịp..." },
    { key: "price-segment", label: "Phân khúc giá gợi ý", type: "readonly", editable: false, value: (raw.price_segment as string) ?? "Xem từ M02" },
  ]
}

// ============================================================
// MOCK DATA — chỉ dùng khi chưa có phân tích thật
// ============================================================

const FLOW_M01: FlowStep[] = [
  { key: "detect", label: "Nhận diện cấu phần & chi tiết" },
  { key: "count", label: "Đếm số lượng" },
  { key: "color", label: "Phân tích màu sắc" },
  { key: "style", label: "Nhận diện phong cách" },
]

// ============================================================
// PAGE
// ============================================================

type Phase =
  | "upload"
  | "confirm"
  | "running"
  | "result1"
  | "suggest"
  | "result2"
  | "saved"
  | "error"

// Khoá idempotency cho một lượt tạo phân tích — gọi trong handler, không trong render.
function newAnalysisIdempotencyKey(): string {
  return `analysis-${Date.now()}-${crypto.randomUUID()}`
}

export default function TaiAnhPage() {
  const router = useRouter()
  const session = useSession()
  const { ti, industryKey } = useI18n()

  const [activeTab, setActiveTab] = useState<"m01a" | "m01b" | "m01c" | "storage">("m01a")
  const [pitchOverrides, setPitchOverrides] = useState<SalesPitchOverrides | undefined>(undefined)
  const [finalizedPitches, setFinalizedPitches] = useState<SalesPitchData[]>([])

  // Load finalized pitches from localStorage on mount & org change
  useEffect(() => {
    try {
      const orgKey = session.organization?.id ?? "default"
      const saved = localStorage.getItem(`smeos_finalized_pitches_${orgKey}`) ?? localStorage.getItem(`floraos_finalized_pitches_${orgKey}`)
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state từ nguồn chỉ có ở trình duyệt (localStorage/URL), chủ đích
        setFinalizedPitches(JSON.parse(saved))
      }
    } catch { /* ignore */ }
  }, [session.organization?.id])

  const handleFinalizePitch = (finalizedPitch: SalesPitchData) => {
    setFinalizedPitches((prev) => {
      const id = finalizedPitch.id ?? finalizedPitch.productName
      const filtered = prev.filter((p) => (p.id ?? p.productName) !== id)
      const updated = [{ ...finalizedPitch, id }, ...filtered]
      try {
        const orgKey = session.organization?.id ?? "default"
        localStorage.setItem(`smeos_finalized_pitches_${orgKey}`, JSON.stringify(updated))
      } catch { /* ignore */ }
      return updated
    })
  }

  // Hồ sơ mặc định của cửa hàng cho Thẻ chào (dùng chung với hành trình Tạo nội dung trên /cong-cu)
  const tenantSalesDefaults = useTenantSalesDefaults()

  const [phase, setPhase] = useState<Phase>("upload")
  const [assets, setAssets] = useState<Array<{ id: string; name: string; storage_key: string }>>([])
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [localPhotos, setLocalPhotos] = useState<Array<{ id: string; file: File; previewUrl: string; name: string }>>([])
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null)
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [jobPhase, setJobPhase] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | null>(null)
  const [analysisData, setAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [approvalState, setApprovalState] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const [editedFields, setEditedFields] = useState<Record<string, unknown> | null>(null)
  const [judgment1, setJudgment1] = useState<JudgmentState>("safe")
  const [judgment2, setJudgment2] = useState<JudgmentState>("safe")
  const [saved1, setSaved1] = useState(false)
  const [saved2, setSaved2] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false)
  const [approvingAnalysis, setApprovingAnalysis] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [approvedAnalysesList, setApprovedAnalysesList] = useState<ApprovedAnalysisItem[]>([])
  const [loadingApprovedList, setLoadingApprovedList] = useState(false)

  const loadApprovedAnalysesList = async () => {
    setLoadingApprovedList(true)
    try {
      const res = await apiFetchWithAuth("/api/v1/vision/analyses?approval_state=APPROVED&limit=50")
      if (res.ok && res.data) {
        const data = res.data as { data?: ApprovedAnalysisItem[] }
        setApprovedAnalysesList(data.data ?? [])
      }
    } catch { /* ignore */ }
    finally {
      setLoadingApprovedList(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    loadApprovedAnalysesList()
  }, [])

  const rawAssetsList: RawAssetItem[] = useMemo(() => {
    const locals: RawAssetItem[] = localPhotos.map((p) => ({
      id: p.id,
      name: p.name,
      image_url: p.previewUrl,
      isLocal: true,
      file: p.file,
    }))
    const serverItems: RawAssetItem[] = assets.map((a) => ({
      id: a.id,
      name: a.name,
      storage_key: a.storage_key,
      image_url: null,
    }))
    return [...locals, ...serverItems]
  }, [localPhotos, assets])

  const [productCopyData, setProductCopyData] = useState<Record<string, unknown> | null>(null)
  const [copyId, setCopyId] = useState<string | null>(null)
  const [copyApprovalState, setCopyApprovalState] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING")
  const [copyLoading, setCopyLoading] = useState(false)

  const canAnalyze = session.can("H1")
  const canEdit = session.can("H2")
  const canApprove = session.can("H3")
  const canH5 = session.can("H5")
  const canH6 = session.can("H6")

  // --- File picker handlers ---
  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const newPhotos: Array<{ id: string; file: File; previewUrl: string; name: string }> = []
    Array.from(files).forEach((file) => {
      if (!acceptedTypes.includes(file.type)) return
      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name.replace(/\.[^.]+$/, ""),
      })
    })
    setLocalPhotos((prev) => {
      const updated = [...prev, ...newPhotos].slice(0, 10)
      if (updated.length > 0 && updated[0]) {
        setAnalysisImageUrl(updated[0].previewUrl)
      }
      return updated
    })
    e.target.value = ""
  }

  const removeLocalPhoto = (id: string) => {
    setLocalPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  useEffect(() => {
    return () => {
      localPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, [localPhotos])

  // --- Load assets ---
  const loadAssets = async () => {
    setLoadingAssets(true)
    try {
      const res = await apiFetchWithAuth("/api/v1/assets?limit=50")
      if (!res.ok || !res.data) {
        setErrorMsg(res.message ?? "Không tải được danh sách ảnh")
        return
      }
      const data = res.data as { data?: Array<{ id: string; name?: string; storage_key?: string; filename?: string }> }
      const items = (data.data ?? []).map((a) => ({
        id: a.id,
        name: a.name ?? a.filename ?? a.storage_key ?? a.id,
        storage_key: a.storage_key ?? "",
      }))
      setAssets(items)
      setLibraryLoaded(true)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không tải được danh sách ảnh")
    } finally {
      setLoadingAssets(false)
    }
  }

  // --- Load analysis ---
  const loadAnalysis = async (id: string) => {
    try {
      const res = await apiFetchWithAuth(`/api/v1/vision/analyses/${encodeURIComponent(id)}`)
      if (!res.ok || !res.data) {
        setErrorMsg(res.message ?? "Không tải được kết quả phân tích")
        return
      }
      const analysis = res.data as {
        id: string
        raw: Record<string, unknown>
        edited: Record<string, unknown> | null
        approval_state: "PENDING" | "APPROVED" | "REJECTED"
        job_id: string
        provider: string
        model: string
        image_url?: string | null
      }
      setAnalysisData(analysis.edited ?? analysis.raw)
      setEditedFields(analysis.edited)
      setApprovalState(analysis.approval_state)
      setAnalysisId(analysis.id)
      if (analysis.image_url) {
        setAnalysisImageUrl(analysis.image_url)
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi tải phân tích")
    }
  }

  // --- Poll job status & load result ---
  const pollJob = async (jobId: string): Promise<boolean> => {
    try {
      const res = await apiFetchWithAuth(`/api/v1/jobs/${encodeURIComponent(jobId)}`)
      if (!res.ok || !res.data) return false
      const data = res.data as {
        job: {
          id: string
          status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
          stage: string | null
          result: string | null
          error: string | null
        }
      }
      const job = data.job
      if (!job) return false

      if (job.status === "PROCESSING") {
        setJobStatus("PROCESSING")
        setJobPhase(job.stage ? `Đang xử lý (${job.stage})...` : "Phân tích ảnh (AI)...")
        return false
      }

      if (job.status === "COMPLETED") {
        setJobStatus("COMPLETED")
        setJobPhase(null)
        await loadAnalysisByJobId(jobId)
        return true
      }

      if (job.status === "FAILED") {
        setJobStatus("FAILED")
        setErrorMsg(job.error ?? "Lượt phân tích thất bại")
        setPhase("error")
        return true
      }

      if (job.status === "CANCELLED") {
        setJobStatus("CANCELLED")
        setErrorMsg("Lượt phân tích đã bị huỷ.")
        setPhase("upload")
        return true
      }

      // PENDING
      setJobStatus("PENDING")
      setJobPhase("Xếp hàng chờ xử lý...")
      return false
    } catch {
      return false
    }
  }

  const loadAnalysisByJobId = async (jobId: string) => {
    try {
      const res = await apiFetchWithAuth("/api/v1/vision/analyses?limit=50")
      if (!res.ok || !res.data) {
        setErrorMsg("Không tải được kết quả phân tích")
        return
      }
      const listData = res.data as {
        data?: Array<{
          id: string
          raw: Record<string, unknown>
          edited: Record<string, unknown> | null
          approval_state: "PENDING" | "APPROVED" | "REJECTED"
          job_id: string
          image_url?: string | null
        }>
      }
      const rows = listData.data ?? []
      const found = rows.find((r) => r.job_id === jobId)
      if (found) {
        setAnalysisData(found.edited ?? found.raw)
        setEditedFields(found.edited)
        setApprovalState(found.approval_state)
        setAnalysisId(found.id)
        if (found.image_url) {
          setAnalysisImageUrl(found.image_url)
        } else if (localPhotos[0]?.previewUrl) {
          setAnalysisImageUrl(localPhotos[0].previewUrl)
        }
        setPhase("result1")
      } else {
        setErrorMsg("Chưa tìm thấy kết quả phân tích trong danh sách chờ duyệt")
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi tải kết quả")
    }
  }

  // --- M01b: Product Copy APIs ---
  async function generateProductCopyApi(analysisId: string, productId?: string | null) {
    setCopyLoading(true)
    try {
      const res = await apiFetch("/api/v1/product-copies/generate", {
        method: "POST",
        // Bắt buộc như mọi điểm tạo job: bấm hai lần, lỡ tay tải lại trang,
        // hay mạng chập đều không được tính tiền lần thứ hai. Khoá theo
        // lượt phân tích nên hai lần bấm cho cùng một sản phẩm là cùng khoá.
        headers: { "idempotency-key": `product-copy:${analysisId}` },
        body: JSON.stringify({ analysisId, productId }),
      })
      if (!res.ok) {
        let message = "Không tạo được dữ liệu bán hàng"
        try {
          const body = (await res.json()) as { error?: { message?: string } }
          message = body.error?.message ?? message
        } catch { /* ignore */ }
        setErrorMsg(message)
        return null
      }
      const data = (await res.json()) as { copyId: string; raw: unknown }
      setCopyId(data.copyId)
      setProductCopyData(data.raw as Record<string, unknown>)
      return data
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi tạo dữ liệu bán hàng")
      return null
    } finally {
      setCopyLoading(false)
    }
  }

  async function fetchProductCopyApi(id: string) {
    try {
      const res = await apiFetchWithAuth(`/api/v1/product-copies/${id}`)
      if (!res.ok || !res.data) return null
      return res.data as Record<string, unknown>
    } catch { return null }
  }

  async function updateProductCopyApi(id: string, edited: Record<string, unknown>) {
    try {
      const res = await apiFetchWithAuth(`/api/v1/product-copies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ edited }),
      })
      if (!res.ok || !res.data) return null
      return res.data as Record<string, unknown>
    } catch { return null }
  }

  async function approveProductCopyApi(id: string) {
    try {
      const res = await apiFetchWithAuth(`/api/v1/product-copies/${id}/approve`, {
        method: "POST",
      })
      if (!res.ok || !res.data) return null
      return res.data as Record<string, unknown>
    } catch { return null }
  }

  async function rejectProductCopyApi(id: string, reason?: string) {
    try {
      const res = await apiFetchWithAuth(`/api/v1/product-copies/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? null }),
      })
      if (!res.ok || !res.data) return null
      return res.data as Record<string, unknown>
    } catch { return null }
  }

  // --- Phase helpers ---
  const totalSelectedCount = localPhotos.length + selectedAssetIds.length

  function goConfirm() {
    if (totalSelectedCount === 0) return
    setPhase("confirm")
  }

  function goRunning() {
    if (!canAnalyze) {
      setErrorMsg("Không có năng lực H1 (phân tích ảnh)")
      setPhase("error")
      return
    }
    setPhase("running")
    setJobStatus("PENDING")
    setJobPhase("ANALYZING")
    createAnalysisJob()
  }

  async function uploadLocalPhotos(): Promise<string[]> {
    const uploadedAssetIds: string[] = []
    for (const photo of localPhotos) {
      const urlRes = await fetch("/api/v1/assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: null, mime_type: photo.file.type }),
      })
      if (!urlRes.ok) {
        let msg = `Không xin được URL tải lên cho "${photo.name}"`
        try {
          const body = (await urlRes.json()) as { error?: { message?: string } }
          msg = body.error?.message ?? msg
        } catch { /* ignore */ }
        throw new Error(msg)
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
      if (!putRes.ok) throw new Error(`Tải ảnh "${photo.name}" lên kho thất bại (${putRes.status})`)

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
        let msg = `Không đăng ký được asset cho "${photo.name}"`
        try {
          const body = (await registerRes.json()) as { error?: { message?: string } }
          msg = body.error?.message ?? msg
        } catch { /* ignore */ }
        throw new Error(msg)
      }

      uploadedAssetIds.push(asset_id)
    }
    return uploadedAssetIds
  }

  async function createAnalysisJob() {
    const idempotencyKey = newAnalysisIdempotencyKey()
    try {
      let finalAssetIds = [...selectedAssetIds]
      if (localPhotos.length > 0) {
        setJobPhase("Đang tải ảnh lên kho...")
        const uploadedIds = await uploadLocalPhotos()
        finalAssetIds = [...finalAssetIds, ...uploadedIds]
      }

      setJobPhase("Đang khởi tạo lượt phân tích...")
      const res = await apiFetch("/api/v1/vision/analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [IDEMPOTENCY_KEY_HEADER]: idempotencyKey,
        },
        body: JSON.stringify({
          asset_ids: finalAssetIds,
          product_id: null,
        }),
      })
      if (!res.ok) {
        let message = "Không tạo được job phân tích"
        try {
          const body = (await res.json()) as { error?: { message?: string } }
          message = body.error?.message ?? message
        } catch { /* ignore */ }
        setErrorMsg(message)
        setPhase("error")
        return
      }
      const data = (await res.json()) as { job_id: string; status: string }
      startPolling(data.job_id)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi tạo job")
      setPhase("error")
    }
  }

  function startPolling(jobId: string) {
    const poll = async () => {
      const isFinished = await pollJob(jobId)
      if (!isFinished) {
        setTimeout(poll, 2000)
      }
    }
    setTimeout(poll, 1500)
  }

  function goResult1() {
    setPhase("result1")
  }

  function goSuggest() {
    setPhase("suggest")
  }

  function goResult2() {
    if (!analysisId) return
    if (!canH5) {
      setErrorMsg("Không có năng lực H5 (tạo dữ liệu bán hàng)")
      return
    }
    setCopyLoading(true)
    generateProductCopyApi(analysisId, null).then((result) => {
      setCopyLoading(false)
      if (result) {
        setEditedFields(null)
        setActiveTab("m01b")
        setPhase("result2")
      }
    })
  }

  function goSaved() {
    setPhase("saved")
  }

  // --- Read URL query params when arriving from Kho Du Lieu or external links ---
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get("tab")
    const analysisIdParam = params.get("analysis_id")
    const assetIdParam = params.get("asset_id")
    const pitchIdParam = params.get("pitch_id")

    if (tabParam === "m01b" || tabParam === "m01c" || tabParam === "m01a" || tabParam === "storage") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state từ nguồn chỉ có ở trình duyệt (localStorage/URL), chủ đích
      setActiveTab(tabParam)
    }

    if (assetIdParam) {
      setSelectedAssetIds([assetIdParam])
      setPhase("confirm")
    }

    if (analysisIdParam) {
      loadAnalysis(analysisIdParam).then(() => {
        if (tabParam === "m01b" && canH5) {
          generateProductCopyApi(analysisIdParam, null).catch(() => {})
        }
      })
    }

    if (pitchIdParam) {
      try {
        const orgKey = session.organization?.id ?? "default"
        const saved = localStorage.getItem(`smeos_finalized_pitches_${orgKey}`) ?? localStorage.getItem(`floraos_finalized_pitches_${orgKey}`)
        if (saved) {
          const list: SalesPitchData[] = JSON.parse(saved)
          const found = list.find((p) => (p.id ?? p.productName) === pitchIdParam)
          if (found) {
            setPitchOverrides(found)
            if (found.imageUrl) setAnalysisImageUrl(found.imageUrl)
            setActiveTab("m01c")
          }
        }
      } catch { /* ignore */ }
    }
  }, [session.organization?.id, canH5])

  // --- Field change handlers ---
  function handleItemChange1(key: string, itemId: string, item: ResultFieldItem) {
    setAnalysisData((prev) => (prev ? applyItemChange(prev, key, itemId, item) : prev))
  }

  function handleFieldChange1(key: string, value: string | number | string[]) {
    setAnalysisData((prev) => (prev ? applyFieldChange(prev, key, value) : prev))
  }

  function handleFieldChange2(key: string, value: string | number | string[]) {
    setEditedFields((prev) => ({ ...(prev ?? {}), [key]: value }))
  }

  function handleFieldAdd1(key: string, item: ResultFieldItem) {
    setAnalysisData((prev) => (prev ? applyFieldAdd(prev, key, item) : prev))
  }

  function handleFieldAdd2(key: string, item: ResultFieldItem) {
    if (!item.value) return
    setEditedFields((prev) => {
      const current = (prev?.[key] as string[]) ?? (productCopyData?.[key] as string[]) ?? []
      return { ...(prev ?? {}), [key]: [...current, item.value!] }
    })
  }

  function handleFieldRemove1(key: string, itemId: string) {
    setAnalysisData((prev) => (prev ? applyFieldRemove(prev, key, itemId) : prev))
  }

  function handleFieldRemove2(key: string, itemId: string) {
    setEditedFields((prev) => {
      const current = (prev?.[key] as string[]) ?? (productCopyData?.[key] as string[]) ?? []
      return { ...(prev ?? {}), [key]: current.filter((v) => v !== itemId) }
    })
  }

  // --- Action handlers ---
  // --- Action handlers ---
  async function handleSaveDraft1() {
    if (!analysisId || !canEdit) {
      setErrorMsg("Không có quyền chỉnh sửa")
      return
    }
    try {
      const payloadEdited = structuredClone(analysisData ?? {})
      if (editedFields) {
        Object.assign(payloadEdited, editedFields)
      }
      const res = await apiFetch(`/api/v1/vision/analyses/${encodeURIComponent(analysisId)}`, {
        method: "PATCH",
        body: JSON.stringify({ edited: payloadEdited }),
      })
      if (!res.ok) {
        let message = "Không lưu được nháp"
        try {
          const body = (await res.json()) as { error?: { message?: string } }
          message = body.error?.message ?? message
        } catch { /* ignore */ }
        setErrorMsg(message)
        return
      }
      setSaved1(true)
      setTimeout(() => setSaved1(false), 2000)
      await loadAnalysis(analysisId)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi lưu nháp")
    }
  }

  async function handleReject1() {
    if (!analysisId || !canApprove) {
      setErrorMsg("Không có quyền từ chối")
      return
    }
    try {
      const res = await apiFetch(`/api/v1/vision/analyses/${encodeURIComponent(analysisId)}/reject`, {
        method: "POST",
        body: JSON.stringify({ ly_do: null }),
      })
      if (!res.ok) {
        let message = "Không từ chối được"
        try {
          const body = (await res.json()) as { error?: { message?: string } }
          message = body.error?.message ?? message
        } catch { /* ignore */ }
        setErrorMsg(message)
        return
      }
      setJudgment1("blocked")
      setApprovalState("REJECTED")
      await loadAnalysis(analysisId)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi từ chối")
    }
  }

  function handleApprove1() {
    if (!analysisId || !canApprove) {
      setErrorMsg("Tài khoản của bạn chưa được cấp quyền duyệt kết quả phân tích")
      return
    }
    setShowApproveConfirmModal(true)
  }

  async function doApproveAnalysis(createProduct: boolean) {
    if (!analysisId || !canApprove) {
      setErrorMsg("Tài khoản của bạn chưa được cấp quyền duyệt kết quả phân tích")
      return
    }
    setApprovingAnalysis(true)
    setErrorMsg(null)
    try {
      const res = await apiFetch(`/api/v1/vision/analyses/${encodeURIComponent(analysisId)}/approve`, {
        method: "POST",
        body: JSON.stringify({ create_product: createProduct }),
      })
      if (!res.ok) {
        let message = "Không duyệt được"
        try {
          const body = (await res.json()) as { error?: { message?: string } }
          message = body.error?.message ?? message
        } catch { /* ignore */ }
        setErrorMsg(message)
        setShowApproveConfirmModal(false)
        return
      }
      const data = (await res.json()) as { approval_state: string }
      setJudgment1("safe")
      setApprovalState(data.approval_state as "PENDING" | "APPROVED" | "REJECTED")
      setSaved1(true)
      setSaved1(false)
      setShowApproveConfirmModal(false)
      await loadAnalysis(analysisId)
      setTimeout(() => goSuggest(), 800)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi duyệt")
      setShowApproveConfirmModal(false)
    } finally {
      setApprovingAnalysis(false)
    }
  }

  function handleGoCreativeStudio() {
    const productName = (analysisData?.["product_name"] as string)
      || (analysisData?.["identity"] as Record<string, unknown> | undefined)?.["product_name"] as string
      || (analysisData?.["name"] as string)
      || "Sản phẩm"
    // Chặn cứng (nợ #118, 22/09/2026): ảnh chưa lưu vào kho (`assets`) thì
    // không có gì để bàn giao an toàn sang Creative Studio — cùng luật với
    // Chặng 05 CHOOSE ở `/thi-truong` (`CreativeHandoffModal`). KHÔNG còn truyền `imageUrl` qua query string — Creative Studio tự resolve ảnh
    // qua `GET /api/v1/assets/:id/view-url` bằng `assetId`.
    const assetId = (analysisData?.["asset_id"] as string) || selectedAssetIds[0]
    if (!assetId) {
      setErrorMsg("Ảnh chưa được lưu vào kho — vui lòng phân tích và duyệt lại ảnh trước khi sang Creative Studio.")
      return
    }
    try {
      const params = buildHandoffSearchParams({
        runOrTopicId: analysisId || `tai-anh-${Date.now()}`,
        mode: "CREATIVE",
        source: "image",
        assetId,
        productName,
        area: "b",
      })
      router.push(`/creative-studio?${params.toString()}` as Route)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể chuyển sang Creative Studio.")
    }
  }

  async function handleSaveDraft2() {
    if (!copyId) return
    if (!editedFields || Object.keys(editedFields).length === 0) return
    try {
      const res = await updateProductCopyApi(copyId, editedFields)
      if (res) {
        setSaved2(true)
        setTimeout(() => setSaved2(false), 2000)
        setProductCopyData(res as Record<string, unknown>)
      } else {
        setErrorMsg("Không lưu được nháp")
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi lưu nháp")
    }
  }
  async function handleReject2() {
    if (!copyId) return
    try {
      const res = await rejectProductCopyApi(copyId)
      if (res) {
        setJudgment2("blocked")
        setCopyApprovalState("REJECTED")
      } else {
        setErrorMsg("Không từ chối được")
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi từ chối")
    }
  }
  async function handleApprove2() {
    if (!copyId) return
    if (!canH6) {
      setErrorMsg("Không có năng lực H6 (duyệt dữ liệu bán hàng)")
      return
    }
    try {
      const res = await approveProductCopyApi(copyId)
      if (res) {
        setCopyApprovalState("APPROVED")
        setSaved2(true)
        setJudgment2("safe")
        setSaved2(false)
        setTimeout(() => goSaved(), 800)
      } else {
        setErrorMsg("Không duyệt được")
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi duyệt")
    }
  }

  // --- Render ---
  const fields1 = analysisData && typeof analysisData === "object"
    ? mapAnalysisToFields1(analysisData as Record<string, unknown>, industryKey)
    : MOCK_FIELDS_RESULT1_PLACEHOLDER

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header — tiêu đề ngắn; dòng phụ bỏ (OPERATING_PRINCIPLES §6.1) */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        title={ti("scanButtonLabel") || "Quét ảnh sản phẩm"}
        actions={
          <Button variant="ghost" onClick={() => router.push("/")} className="flex items-center gap-1.5">
            <ArrowLeft size={16} strokeWidth={2} />
            Quay về Trang chủ
          </Button>
        }
      />

      {/* Mode / Tab Switcher (Standardized TabActionHeader) */}
      <div className="px-4 pt-2 pb-1 border-b border-border bg-surface">
        <TabActionHeader
          tabs={[
            { id: "m01a", label: "Nhận diện ảnh", icon: Camera },
            { id: "m01b", label: "Bài giới thiệu", icon: Sparkles, ...(finalizedPitches.length > 0 ? { badge: String(finalizedPitches.length), badgeTone: "neutral" as const } : {}) },
            { id: "m01c", label: "Tư vấn khách", icon: FileText, badge: "Kịch bản", badgeTone: "accent" },
            { id: "storage", label: "Kho ảnh & nội dung", icon: Folder },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId as "m01a" | "m01b" | "m01c" | "storage")
            if (tabId === "m01a" && phase === "result2") {
              setPhase(analysisData ? "result1" : "upload")
            }
          }}
          primaryActions={
            activeTab === "m01c" && analysisData
              ? [
                  {
                    id: "change-product",
                    label: `Chọn ${ti("sampleProduct").toLowerCase() || "mẫu"} khác trong kho`,
                    icon: ImageIcon,
                    variant: "secondary" as const,
                    onClick: () => {
                      setProductCopyData(null)
                      setAnalysisData(null)
                      setAnalysisId(null)
                      setAnalysisImageUrl(null)
                      setPitchOverrides(undefined)
                    },
                  },
                ]
              : []
          }
        />
      </div>

      {errorMsg && (
        <div className="mx-[18px] mt-3 rounded-xl border-[1.5px] border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger-text">
          {errorMsg}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setErrorMsg(null)}>Đóng</Button>
        </div>
      )}

      {/* Main Workspace - 100% Full Width, No Split Screen */}
      <div className="flex flex-1 flex-col overflow-y-auto p-[18px]">
        {activeTab === "m01a" && (
          <>
            {/* Phase: Upload */}
        {phase === "upload" && (
          <div className="flex flex-1 flex-col items-center pt-4 pb-12 gap-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFilesPicked}
            />
            <M01aGuidanceCard />

            <Card
              className="w-full max-w-md flex flex-col items-center gap-3 border-dashed border-2 border-border bg-surface-alt p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-sm">
                <Camera size={28} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="text-title-sm font-semibold">Chụp ảnh hoặc chọn từ thiết bị</div>
              <div className="text-meta text-text-muted text-center">
                Nhiều ảnh cùng lúc được — tối đa 10 ảnh (JPG, PNG, WebP)
              </div>
              <div className="flex flex-wrap gap-2.5 mt-1 justify-center">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Upload size={15} strokeWidth={2} />
                  Chọn ảnh từ máy
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    loadAssets()
                  }}
                  disabled={loadingAssets}
                  className="flex items-center gap-1.5"
                >
                  <ImageIcon size={15} strokeWidth={2} />
                  Kho ảnh có sẵn
                </Button>
              </div>
            </Card>

            {/* Local photos preview */}
            {localPhotos.length > 0 && (
              <div className="w-full max-w-md">
                <div className="text-caption font-semibold text-text-muted mb-2">
                  Ảnh đã chọn từ thiết bị ({localPhotos.length})
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {localPhotos.map((p) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-alt border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt={p.name} className="h-full w-full object-cover" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeLocalPhoto(p.id)
                        }}
                        className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/65 text-white hover:bg-black/80 hover:text-white p-0"
                        aria-label="Bỏ ảnh"
                      >
                        <X size={13} strokeWidth={2.4} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Server assets */}
            {libraryLoaded && assets.length === 0 && (
              <div className="w-full max-w-md rounded-xl bg-surface-alt p-3.5 text-center text-caption text-text-muted">
                Kho ảnh trên máy chủ chưa có ảnh nào. Vui lòng bấm <strong>Chọn ảnh từ máy</strong> ở trên để tải ảnh lên.
              </div>
            )}

            {assets.length > 0 && (
              <div className="w-full max-w-md">
                <div className="text-caption font-semibold text-text-muted mb-2">
                  Ảnh trong kho máy chủ ({assets.length})
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {assets.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 cursor-pointer text-body-sm">
                      <Checkbox
                        checked={selectedAssetIds.includes(a.id)}
                        onCheckedChange={() => {
                          setSelectedAssetIds((prev) =>
                            prev.includes(a.id) ? prev.filter((i) => i !== a.id) : [...prev, a.id]
                          )
                        }}
                      />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {loadingAssets && (
              <div className="text-body-sm text-text-muted">Đang tải danh sách ảnh từ kho…</div>
            )}

            {totalSelectedCount > 0 && (
              <Button
                className="h-[50px] px-8"
                onClick={goConfirm}
              >
                Tiếp tục — {totalSelectedCount} ảnh đã chọn
              </Button>
            )}
          </div>
        )}

        {/* Phase: Confirm */}
        {phase === "confirm" && (
          <div className="flex flex-1 flex-col items-center pt-4 pb-12 gap-6">
            <div className="text-center">
              <div className="text-title font-extrabold">② Kích hoạt AI</div>
              <div className="mt-1 text-body-sm text-text-muted">{totalSelectedCount} ảnh — 1 credit</div>
            </div>
            <Card className="w-full max-w-md p-4 divide-y divide-border">
              {localPhotos.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-medium truncate">{p.name}</div>
                    <div className="text-caption text-text-muted">Tải từ máy</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá ảnh"
                    onClick={() => removeLocalPhoto(p.id)}
                    className="h-7 w-7 p-1 text-text-muted hover:text-danger"
                  >
                    <X size={15} strokeWidth={2} />
                  </Button>
                </div>
              ))}
              {assets
                .filter((a) => selectedAssetIds.includes(a.id))
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-surface-alt flex items-center justify-center">
                      <Camera size={20} strokeWidth={1.5} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body-sm font-medium truncate">{a.name}</div>
                      <div className="text-caption text-text-muted">Kho máy chủ</div>
                    </div>
                    <Badge tone="neutral">Sẵn có</Badge>
                  </div>
                ))}
            </Card>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPhase("upload")}>
                Quay lại
              </Button>
              <Button
                className="h-[50px] px-8"
                onClick={goRunning}
                disabled={!canAnalyze || totalSelectedCount === 0}
              >
                <Sparkles size={18} strokeWidth={2} className="mr-2" />
                Phân tích ({totalSelectedCount} ảnh)
              </Button>
            </div>
          </div>
        )}

        {/* Phase: Running */}
        {phase === "running" && (
          <div className="flex flex-1 flex-col items-center gap-5">
            <div className="text-center">
              <div className="text-title font-extrabold">Đang xử lý</div>
              <div className="mt-1 text-body-sm text-text-muted">{jobPhase ?? "Đang chuẩn bị..."}</div>
            </div>
            <div className="w-full max-w-md">
              <FlowSteps
                steps={FLOW_M01}
                currentStep={jobPhase ?? "detect"}
                cancellable={jobStatus === "PENDING"}
                onCancel={() => {
                  setJobStatus("CANCELLED")
                  setPhase("upload")
                }}
                showLog={false}
                logs={
                  jobPhase
                    ? [{ seq: 1, text: `Đang ${jobPhase}...`, at: new Date().toISOString() }]
                    : []
                }
              />
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-surface-alt p-3.5">
              <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-primary" />
              <div className="text-caption leading-relaxed text-text-muted">
                Job chạy ở máy chủ và không mất khi rời màn hình — mở lại ở mục Lượt chạy để xem kết quả.
              </div>
            </div>
          </div>
        )}

        {/* Phase: Result 1 */}
        {phase === "result1" && (
          <div className="flex flex-col items-center gap-5">
            <AnalysisResultCard
              imageUrl={analysisImageUrl ?? undefined}
              fields={fields1}
              judgment={judgment1}
              confidence={typeof analysisData?.confidence === "number" ? analysisData.confidence : 94}
              qualityLabel="Độ tin cậy cao — mọi cấu phần đạt ngưỡng"
              isSaved={saved1}
              onSaveDraft={handleSaveDraft1}
              onReject={handleReject1}
              onApprove={handleApprove1}
              onFieldChange={handleFieldChange1}
              onFieldAdd={handleFieldAdd1}
              onFieldRemove={handleFieldRemove1}
              onItemChange={handleItemChange1}
              disabled={approvalState === "APPROVED" || !canEdit}
            />

            {approvalState !== "APPROVED" && (
              <div className="w-full max-w-3xl border-t border-border pt-5">
                <div className="flex items-center justify-between rounded-xl bg-primary/5 p-4">
                  <div>
                    <div className="text-title-sm font-bold text-primary">⑤ Đã duyệt đặc điểm nhận diện</div>
                    <div className="text-meta text-text-muted">Sản phẩm đã có trong kho ở dạng cấu trúc</div>
                  </div>
                  <Button
                    onClick={goSuggest}
                    className="flex items-center gap-2"
                  >
                    Gợi ý: Sinh nội dung bán hàng
                    <ChevronRight size={16} strokeWidth={2.4} />
                  </Button>
                </div>
                <div className="mt-2 text-center text-caption text-text-muted">
                  Người dùng chọn đi tiếp — không tự chạy.
                </div>
              </div>
            )}

            {approvalState === "APPROVED" && isHrefInPhase("/creative-studio") && (
              <div className="w-full max-w-3xl border-t border-border pt-5">
                <div className="flex items-center justify-between rounded-xl bg-success-bg border border-success/30 p-4">
                  <div>
                    <div className="text-body font-bold text-success">✓ Đã duyệt — Chuyển sang Sáng tạo nội dung</div>
                    <div className="text-meta text-text-muted">Đặc điểm nhận diện đã duyệt → Creative Studio (Chặng 5-14)</div>
                  </div>
                  <Button
                    onClick={handleGoCreativeStudio}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white"
                  >
                    <Sparkles size={14} /> Tới Creative Studio
                  </Button>
                </div>
              </div>
            )}

            {/* Modal xác nhận đưa vào Sản phẩm & Giá hay chỉ lưu Kho dữ liệu */}
            <Dialog
              open={showApproveConfirmModal}
              onOpenChange={setShowApproveConfirmModal}
              title="Xác nhận duyệt kết quả phân tích"
              description="Bạn có muốn đưa kết quả phân tích này vào danh mục Sản phẩm & Giá của cửa hàng không?"
              size="md"
            >
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-border bg-surface-alt/60 p-3.5 text-body-sm text-text-muted leading-relaxed">
                  <p className="font-semibold text-text mb-1.5">Lựa chọn lưu trữ:</p>
                  <ul className="list-disc pl-5 space-y-1 text-caption">
                    <li>
                      <strong className="text-text">Đồng ý đưa vào Sản phẩm & Giá</strong>: Tạo sản phẩm mới trong danh mục, hiển thị trên trang bán hàng và đồng thời lưu vào Kho dữ liệu.
                    </li>
                    <li>
                      <strong className="text-text">Chỉ lưu vào Kho dữ liệu</strong>: Lưu an toàn trong Kho dữ liệu để tham khảo, tạo nội dung bán hàng hoặc bài viết sau này mà không đưa vào Sản phẩm & Giá.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={approvingAnalysis}
                    onClick={() => setShowApproveConfirmModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={approvingAnalysis}
                    onClick={() => doApproveAnalysis(false)}
                    className="border-primary/40 text-primary hover:bg-primary/5 font-semibold"
                  >
                    {approvingAnalysis ? "Đang xử lý..." : "Chỉ lưu Kho dữ liệu"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={approvingAnalysis}
                    onClick={() => doApproveAnalysis(true)}
                    className="font-bold shadow-xs"
                  >
                    {approvingAnalysis ? "Đang xử lý..." : "Đồng ý đưa vào Sản phẩm & Giá"}
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
        )}

        {/* Phase: Suggest (between M01 and M01b) */}
        {phase === "suggest" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-title font-extrabold">Gợi ý bước kế tiếp</div>
              <div className="mt-1 text-body-sm text-text-muted">Sản phẩm đã có trong kho — Nội dung bán hàng</div>
            </div>
            <Card className="w-full max-w-md p-6 text-center">
              <Sparkles size={32} strokeWidth={1.5} className="mx-auto mb-3 text-primary" />
              <div className="text-title-sm font-semibold">Sinh nội dung bán hàng</div>
              <div className="mt-1 text-meta text-text-muted">
                Đọc từ sản phẩm vừa duyệt → Tên, mô tả, thẻ, tone, dịp, phân khúc giá
              </div>
              <Button className="mt-5 w-full" onClick={goResult2}>
                Tiếp tục sang Nội dung bán hàng
              </Button>
            </Card>
            <Button variant="ghost" onClick={goResult1}>
              Quay lại Thẻ kết quả 1
            </Button>
          </div>
        )}

        {/* Phase: Saved (M01a) */}
        {phase === "saved" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success-bg">
              <Check size={40} strokeWidth={2} className="text-secondary" />
            </div>
            <div className="text-center">
              <div className="text-title font-extrabold">Đã lưu vào Kho</div>
              <div className="mt-1 text-body-sm text-text-muted">Đặc điểm nhận diện đã được lưu vào kho sản phẩm</div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPhase("upload")}>
                Phân tích ảnh khác
              </Button>
              {isHrefInPhase("/creative-studio") && <Button onClick={handleGoCreativeStudio}>
                Tới Creative Studio
              </Button>}
              <Button onClick={() => router.push("/")}>Quay về Trang chủ</Button>
            </div>
          </div>
        )}

        {/* Phase: Error */}
        {phase === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger-bg">
              <AlertTriangle size={40} strokeWidth={2} className="text-danger" />
            </div>
            <div className="text-center">
              <div className="text-title font-extrabold text-danger">Xử lý không thành công</div>
              {jobPhase && (
                <div className="mt-1 text-body-sm font-semibold text-text">
                  Bước gặp lỗi: {FLOW_M01.find((s) => s.key === jobPhase)?.label ?? jobPhase}
                </div>
              )}
              <div className="mt-1 text-body-sm text-text-muted">{errorMsg ?? "Đã xảy ra lỗi"}</div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => { setErrorMsg(null); setPhase("upload") }}>Chạy lại</Button>
              <Button variant="ghost" onClick={() => router.push("/")}>Quay về Trang chủ</Button>
            </div>
          </div>
        )}
          </>
        )}

        {/* ============================================================ */}
        {/* TAB M01b: Sinh dữ liệu bán hàng (Kho đã duyệt)                */}
        {/* ============================================================ */}
        {activeTab === "m01b" && (
          <>
            {copyLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse motion-reduce:animate-none">
                  <Sparkles size={32} />
                </div>
                <div className="text-title font-bold">Đang sinh dữ liệu bán hàng (AI)...</div>
                <div className="text-body-sm text-text-muted max-w-sm text-center">
                  AI đang tổng hợp tên gợi ý, mô tả sản phẩm, thẻ phân loại, tone màu, dịp và phân khúc giá.
                </div>
              </div>
            ) : phase === "result2" ? (
              <div className="flex flex-col items-center gap-5">
                <CommercialContentCard
                  imageUrl={analysisImageUrl ?? undefined}
                  fields={productCopyData ? mapProductCopyToFields(productCopyData as Record<string, unknown>, analysisData) : MOCK_COPY_FIELDS_PLACEHOLDER}
                  judgment={judgment2}
                  qualityScore={89}
                  qualityLabel="Nội dung phù hợp giọng thương hiệu"
                  isSaved={saved2}
                  onBackToLibrary={() => {
                    setProductCopyData(null)
                    setEditedFields(null)
                    setPhase("upload")
                  }}
                  onSaveDraft={handleSaveDraft2}
                  onReject={handleReject2}
                  onApprove={handleApprove2}
                  onFieldChange={handleFieldChange2}
                  onFieldAdd={handleFieldAdd2}
                  onFieldRemove={handleFieldRemove2}
                  disabled={copyApprovalState === "APPROVED" || !canH6}
                />

                {judgment2 !== "blocked" && (
                  <div className="w-full max-w-3xl border-t border-border pt-5 flex items-center justify-between">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setProductCopyData(null)
                        setEditedFields(null)
                        setPhase("upload")
                      }}
                    >
                      Chọn mẫu khác trong kho
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab("m01c")
                        }}
                        className="border-primary text-primary hover:bg-primary/10 font-bold flex items-center gap-1.5"
                      >
                        <FileText size={15} />
                        Tạo Thẻ chào hàng →
                      </Button>
                      <Button
                        onClick={goSaved}
                        disabled={!canH6 || copyApprovalState !== "APPROVED"}
                      >
                        ⑥ Hoàn tất & Lưu vào Kho sản phẩm
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : phase === "saved" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success-bg">
                  <Check size={40} strokeWidth={2} className="text-secondary" />
                </div>
                <div className="text-center">
                  <div className="text-title font-extrabold">Đã lưu vào Kho sản phẩm</div>
                  <div className="mt-1 text-body-sm text-text-muted">Kho sản phẩm và thư viện nội dung bán hàng đã được cập nhật</div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setActiveTab("m01c")}
                    className="bg-primary text-white font-bold flex items-center gap-1.5 shadow-md shadow-primary/20"
                  >
                    <FileText size={15} />
                    Tạo Thẻ chào hàng →
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProductCopyData(null)
                      setEditedFields(null)
                      setPhase("upload")
                    }}
                  >
                    Tạo cho mẫu khác trong kho
                  </Button>
                  <Button variant="ghost" onClick={() => router.push("/")}>Quay về Trang chủ</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <M01bGuidanceCard />

                {!canH5 && (
                  <div className="max-w-xl mx-auto w-full rounded-xl border border-warning/30 bg-warning-bg p-3 text-body-sm text-warning">
                    Tài khoản của bạn chưa có quyền H5 (sinh dữ liệu bán hàng). Vui lòng liên hệ quản trị viên.
                  </div>
                )}

                <ApprovedAnalysesSelector
                  disabled={copyLoading || !canH5}
                  selectedAnalysisId={analysisId}
                  onSelect={async (item) => {
                    if (!canH5) {
                      setErrorMsg("Không có năng lực H5 (tạo dữ liệu bán hàng)")
                      return
                    }
                    setAnalysisId(item.id)
                    setAnalysisData({ ...(item.edited ?? item.raw), ...(item.product?.name ? { product_name: item.product.name } : {}), ...(item.product?.code ? { code: item.product.code } : {}) })
                    if (item.image_url) {
                      setAnalysisImageUrl(item.image_url)
                    }
                    const res = await generateProductCopyApi(item.id, item.product_id)
                    if (res) {
                      setEditedFields(null)
                      setPhase("result2")
                    }
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Tab 3: M01c — Thẻ chào sản phẩm */}
        {activeTab === "m01c" && (
          <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            {analysisData ? (
              <>
                <SalesPitchCard
                  pitchData={buildSalesPitchData(
                    analysisData,
                    productCopyData,
                    pitchOverrides,
                    analysisImageUrl,
                    tenantSalesDefaults
                  )}
                  onOverridesChange={setPitchOverrides}
                  onFinalize={handleFinalizePitch}
                />
                <div className="flex items-center justify-between border-t border-border pt-4 pb-8">
                  <Button variant="secondary" onClick={() => setActiveTab("m01b")}>
                    ← Quay lại Nội dung bán hàng
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-6">
                <M01cGuidanceCard />

                <ApprovedAnalysesSelector
                  disabled={copyLoading}
                  selectedAnalysisId={analysisId}
                  onSelect={async (item) => {
                    setAnalysisId(item.id)
                    setAnalysisData({ ...(item.edited ?? item.raw), ...(item.product?.name ? { product_name: item.product.name } : {}), ...(item.product?.code ? { code: item.product.code } : {}) })
                    if (item.image_url) {
                      setAnalysisImageUrl(item.image_url)
                    }
                    if (canH5) {
                      try {
                        await generateProductCopyApi(item.id, item.product_id)
                      } catch { /* ignore */ }
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Kho lưu trữ tài khoản */}
        {activeTab === "storage" && (
          <div className="w-full max-w-5xl mx-auto py-2">
            <AccountStorageHub
              localPhotos={localPhotos}
              finalizedPitches={finalizedPitches}
              onSelectRawPhoto={(photo) => {
                if (photo.isLocal) {
                  setActiveTab("m01a")
                  setPhase("upload")
                } else {
                  setSelectedAssetIds([photo.id])
                  setActiveTab("m01a")
                  setPhase("confirm")
                }
              }}
              onSelectApprovedAnalysis={async (item, targetTab) => {
                setAnalysisId(item.id)
                setAnalysisData(item.edited ?? item.raw)
                setEditedFields(item.edited)
                setApprovalState(item.approval_state)
                if (item.image_url) {
                  setAnalysisImageUrl(item.image_url)
                }
                if (targetTab === "m01b") {
                  setActiveTab("m01b")
                  if (canH5) {
                    try {
                      await generateProductCopyApi(item.id, item.product_id)
                    } catch { /* ignore */ }
                  }
                } else if (targetTab === "m01c") {
                  setActiveTab("m01c")
                  if (canH5 && !productCopyData) {
                    try {
                      await generateProductCopyApi(item.id, item.product_id)
                    } catch { /* ignore */ }
                  }
                }
              }}
              onSelectFinalizedPitch={(pitch) => {
                setPitchOverrides(pitch)
                setAnalysisImageUrl(pitch.imageUrl ?? null)
                setActiveTab("m01c")
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const MOCK_FIELDS_RESULT1_PLACEHOLDER: ResultField[] = [
  { key: "flowers", label: "Danh sách thành phần", type: "list", editable: true, value: [], confidence: 94, placeholder: "Thêm thành phần..." },
  { key: "foliage", label: "Chi tiết phụ", type: "list", editable: true, value: [], confidence: 91, placeholder: "Thêm chi tiết phụ..." },
  { key: "accessories", label: "Phụ kiện & Khóa/Cúc", type: "list", editable: true, value: [], confidence: 88, placeholder: "Thêm phụ kiện..." },
  { key: "wrapping", label: "Vật liệu gói & Bao bì", type: "list", editable: true, value: [], confidence: 88, placeholder: "Thêm bao bì..." },
  { key: "colors", label: "Màu sắc & Phân bổ bảng màu", type: "list", editable: true, value: [], confidence: 96, placeholder: "Thêm tone màu..." },
  { key: "category", label: "Phân loại sản phẩm", type: "text", editable: true, value: "—", confidence: null },
  { key: "shape", label: "Hình dáng thiết kế", type: "text", editable: true, value: "—", confidence: null },
  { key: "facing", label: "Hướng nhìn / Mặt hoa", type: "text", editable: true, value: "—", confidence: null },
  { key: "container", label: "Vật chứa", type: "text", editable: true, value: "—", confidence: null },
  { key: "phong_cach", label: "Phong cách thiết kế", type: "text", editable: true, value: "—", confidence: null },
  { key: "dip_su_dung", label: "Dịp sử dụng đề xuất", type: "text", editable: true, value: "—", confidence: null },
  { key: "so_tang_lop", label: "Cấu trúc sản xuất", type: "readonly", editable: false, value: "—" },
  { key: "materials_note", label: "Ghi chú vật liệu", type: "text", editable: true, value: "—", confidence: null },
  { key: "checklist", label: "Checklist 10 cấu phần tiêu chuẩn", type: "list", editable: false, value: [] },
  { key: "totals", label: "Tổng số lượng thành phần", type: "readonly", editable: false, value: "—" },
  { key: "totals-bud", label: "Tổng số nụ", type: "readonly", editable: false, value: "—" },
  { key: "totals-damaged", label: "Tổng số cành hỏng", type: "readonly", editable: false, value: "—" },
  { key: "confidence", label: "Độ tin cậy tổng thể", type: "readonly", editable: false, value: "—" },
]

const MOCK_COPY_FIELDS_PLACEHOLDER: ResultField[] = [
  { key: "name", label: "Tên sản phẩm", type: "text", editable: true, value: "—" },
  { key: "desc", label: "Mô tả sản phẩm", type: "textarea", editable: true, value: "" },
  { key: "tags", label: "Thẻ phân loại", type: "list", editable: true, value: [], confidence: null, placeholder: "Thêm thẻ..." },
  { key: "tones", label: "Tone màu dạng nhãn bán hàng", type: "list", editable: true, value: [], confidence: null, placeholder: "Thêm tone..." },
  { key: "style", label: "Phong cách thiết kế", type: "text", editable: true, value: "—" },
  { key: "occasions", label: "Dịp phù hợp", type: "list", editable: true, value: [], confidence: null, placeholder: "Thêm dịp..." },
  { key: "price-segment", label: "Phân khúc giá gợi ý", type: "readonly", editable: false, value: "—" },
]
