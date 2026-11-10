"use client"

import { Input } from "@/components/ui/input"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { Layers } from "@/components/ui/icon-set/layers"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Search } from "@/components/ui/icon-set/search"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Pencil } from "@/components/ui/icon-set/pencil"
import { Eye } from "@/components/ui/icon-set/eye"
import { Tag } from "@/components/ui/icon-set/tag"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { FileText } from "@/components/ui/icon-set/file-text"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TabActionHeader } from "@/components/ui/tab-header"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import {
  type SalesPitchData,
  generateZaloPitchScript,
  formatCurrencyVnd,
} from "@/modules/products/domain/sales-pitch-template"

import { TrashConfirmModal, type TrashConfirmTarget } from "@/components/storage/trash-confirm-modal"
import { StorageTrashTab } from "@/components/storage/storage-trash-tab"
import { readApiError } from "@/components/greeting-card/api-error"
import { formatDate } from "@/lib/i18n/formatters"

import { buildOverflowActions, buildPrimaryActions, buildStorageTabs, libraryTypeOf, trashTypeForLibrary, type StorageTab } from "@/components/storage/storage-hub-tabs"
import { LibraryPanel } from "@/components/storage/library/library-panel"
import { useLibrarySummary } from "@/components/storage/library/use-library-summary"

export type { StorageTab }

/** Một dòng `GET /api/v1/assets` — chỉ các trường kho ảnh đọc. */
interface AssetApiRow {
  id: string
  name?: string | null
  filename?: string | null
  storage_key?: string
  mime_type?: string
  file_size?: number
  created_at?: string
  image_url?: string | null
}

/** Một dòng hoa trong `bom.flowers` của kết quả phân tích (JSON, chưa kiểm dạng). */
interface BomFlowerRow {
  name?: string
  quantity?: number | string
  count?: number | string
}

export interface RawAssetItem {
  id: string
  name: string
  storage_key?: string | undefined
  image_url?: string | null | undefined
  mime_type?: string | undefined
  file_size?: number | undefined
  created_at?: string | undefined
  isLocal?: boolean | undefined
  file?: File | undefined
}

export interface ApprovedAnalysisItem {
  id: string
  product_id: string | null
  asset_id: string
  image_url?: string | null | undefined
  job_id: string
  provider: string
  model: string
  raw: Record<string, unknown>
  edited: Record<string, unknown> | null
  approval_state: "APPROVED"
  approved_at: string | null
  approved_by: string | null
  created_at: string
  product?: {
    id: string
    name: string
    code: string
    category: string | null
  } | null | undefined
}

interface AccountStorageHubProps {
  initialTab?: StorageTab | undefined
  localPhotos?: Array<{ id: string; file?: File | undefined; previewUrl: string; name: string }> | undefined
  finalizedPitches?: SalesPitchData[] | undefined
  onSelectRawPhoto?: (photo: RawAssetItem) => void
  onSelectApprovedAnalysis?: (analysis: ApprovedAnalysisItem, targetTab: "m01b" | "m01c") => void
  onSelectFinalizedPitch?: (pitch: SalesPitchData) => void
  onDeleteFinalizedPitch?: (pitchId: string) => void
  className?: string
}

const EMPTY_PHOTOS: Array<{ id: string; file?: File; previewUrl: string; name: string }> = []
const EMPTY_PITCHES: SalesPitchData[] = []

export function AccountStorageHub({
  initialTab = "approved",
  localPhotos = EMPTY_PHOTOS,
  finalizedPitches = EMPTY_PITCHES,
  onSelectRawPhoto,
  onSelectApprovedAnalysis,
  onSelectFinalizedPitch,
  onDeleteFinalizedPitch,
  className = "",
}: AccountStorageHubProps) {
  const router = useRouter()
  const session = useSession()
  const { dict, ti } = useI18n()
  const [activeTab, setActiveTab] = useState<StorageTab>(initialTab)
  const [searchQuery, setSearchQuery] = useState("")

  // Raw assets state
  const [serverAssets, setServerAssets] = useState<RawAssetItem[]>([])
  const [loadingRaw, setLoadingRaw] = useState(false)
  const [errorRaw, setErrorRaw] = useState<string | null>(null)

  // Approved analyses state
  const [approvedItems, setApprovedItems] = useState<ApprovedAnalysisItem[]>([])
  const [loadingApproved, setLoadingApproved] = useState(false)
  const [errorApproved, setErrorApproved] = useState<string | null>(null)

  // Finalized pitches state with localStorage sync
  const [internalFinalizedPitches, setInternalFinalizedPitches] = useState<SalesPitchData[]>(finalizedPitches)

  // Trash & Executive state
  const [trashTarget, setTrashTarget] = useState<TrashConfirmTarget | null>(null)
  const [trashCount, setTrashCount] = useState<number>(0)

  const isExecutive =
    session.roleKey === "dieu_hanh" ||
    session.roleKey === "store_admin" ||
    session.can("G3") ||
    session.can("L4")

  // Kho dữ liệu v2 — thư viện tập trung (Screen Contract kho-du-lieu.md §4–§5)
  const library = useLibrarySummary()
  const activeLibraryType = libraryTypeOf(activeTab)
  const showScope = library.isChain && !library.viewerBranchId
  // Tab Ảnh gốc của chuỗi khi chọn trụ sở/chi nhánh: dùng lưới thư viện (lọc được theo người tạo)
  const scopedRawType = activeTab === "raw" && showScope && library.scope !== "all" ? "original" : null

  useEffect(() => {
    if (finalizedPitches.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lấy từ props, không có thì từ localStorage, chủ đích
      setInternalFinalizedPitches(finalizedPitches)
      return
    }
    try {
      const orgKey = session.organization?.id ?? "default"
      const saved = localStorage.getItem(`smeos_finalized_pitches_${orgKey}`) ?? localStorage.getItem(`floraos_finalized_pitches_${orgKey}`)
      if (saved) {
        const parsed = JSON.parse(saved) as SalesPitchData[]
        setInternalFinalizedPitches(parsed)
      }
    } catch { /* ignore */ }
  }, [finalizedPitches.length, session.organization?.id])

  // Fallback handlers with router
  const handleSelectRaw = (photo: RawAssetItem) => {
    if (onSelectRawPhoto) {
      onSelectRawPhoto(photo)
    } else {
      router.push(`/tai-anh?mode=analyze&asset_id=${encodeURIComponent(photo.id)}`)
    }
  }

  const handleSelectApproved = (item: ApprovedAnalysisItem, targetTab: "m01b" | "m01c") => {
    if (onSelectApprovedAnalysis) {
      onSelectApprovedAnalysis(item, targetTab)
    } else {
      router.push(`/tai-anh?tab=${targetTab}&analysis_id=${encodeURIComponent(item.id)}`)
    }
  }

  const handleSelectFinalized = (pitch: SalesPitchData) => {
    if (onSelectFinalizedPitch) {
      onSelectFinalizedPitch(pitch)
    } else {
      const pitchId = pitch.id ?? pitch.productName
      router.push(`/tai-anh?tab=m01c&pitch_id=${encodeURIComponent(pitchId)}`)
    }
  }

  const handleDeletePitch = (pitchId: string) => {
    if (onDeleteFinalizedPitch) {
      onDeleteFinalizedPitch(pitchId)
    }
    setInternalFinalizedPitches((prev) => {
      const updated = prev.filter((p) => (p.id ?? p.productName) !== pitchId)
      try {
        const orgKey = session.organization?.id ?? "default"
        localStorage.setItem(`smeos_finalized_pitches_${orgKey}`, JSON.stringify(updated))
      } catch { /* ignore */ }
      return updated
    })
  }

  // Copied state for quick Zalo copy in tab 3
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null)

  // Fetch Raw Assets
  const fetchRawAssets = async () => {
    setLoadingRaw(true)
    setErrorRaw(null)
    try {
      const res = await fetch("/api/v1/assets?limit=50", {
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error(`Lỗi tải ảnh gốc (${res.status})`)
      const json = (await res.json()) as { data?: AssetApiRow[] }
      const items: RawAssetItem[] = (json.data ?? []).map((a) => ({
        id: a.id,
        name: a.name ?? a.filename ?? a.storage_key ?? a.id,
        storage_key: a.storage_key,
        mime_type: a.mime_type,
        file_size: a.file_size,
        created_at: a.created_at,
        image_url: a.image_url ?? null,
      }))
      setServerAssets(items)
    } catch (e) {
      setErrorRaw(e instanceof Error ? e.message : "Không tải được danh sách ảnh gốc")
    } finally {
      setLoadingRaw(false)
    }
  }

  // Fetch Approved Analyses
  const fetchApprovedAnalyses = async () => {
    setLoadingApproved(true)
    setErrorApproved(null)
    try {
      const res = await fetch("/api/v1/vision/analyses?approval_state=APPROVED&limit=50", {
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error(`Lỗi tải phân tích đã duyệt (${res.status})`)
      const json = (await res.json()) as { data?: ApprovedAnalysisItem[] }
      setApprovedItems(json.data ?? [])
    } catch (e) {
      setErrorApproved(e instanceof Error ? e.message : "Không tải được danh sách phân tích đã duyệt")
    } finally {
      setLoadingApproved(false)
    }
  }

  // Fetch Trash items count (Executive only)
  const fetchTrashCount = async () => {
    if (!isExecutive) return
    try {
      const res = await fetch("/api/v1/storage/trash")
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data)) {
          setTrashCount(json.data.length)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleConfirmTrash = async (target: TrashConfirmTarget) => {
    const res = await fetch("/api/v1/storage/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: target.id, type: target.type }),
    })
    if (!res.ok) {
      throw new Error(await readApiError(res, "Không thể chuyển vào thùng rác"))
    }
    // Cập nhật state UI ngay lập tức
    if (target.type === "RAW_ASSET") {
      setServerAssets((prev) => prev.filter((a) => a.id !== target.id))
    } else if (target.type === "APPROVED_ANALYSIS") {
      setApprovedItems((prev) => prev.filter((i) => i.id !== target.id))
    }
    library.refresh()
    await fetchTrashCount()
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    fetchRawAssets()
    fetchApprovedAnalyses()
    if (isExecutive) {
      fetchTrashCount()
    }
  }, [isExecutive])

  const tabHandlers = {
    go: (href: string) => router.push(href as Route),
    refreshRaw: () => void fetchRawAssets(),
    refreshApproved: () => void fetchApprovedAnalyses(),
    refreshLibrary: library.refresh,
  }

  // All raw assets combined (local uploads + server assets)
  const allRawAssets: RawAssetItem[] = useMemo(() => {
    const locals: RawAssetItem[] = localPhotos.map((p) => ({
      id: p.id,
      name: p.name,
      image_url: p.previewUrl,
      isLocal: true,
      file: p.file,
    }))
    return [...locals, ...serverAssets]
  }, [localPhotos, serverAssets])

  // Filtered raw assets
  const filteredRawAssets = useMemo(() => {
    if (!searchQuery.trim()) return allRawAssets
    const q = searchQuery.toLowerCase().trim()
    return allRawAssets.filter((a) => a.name.toLowerCase().includes(q))
  }, [allRawAssets, searchQuery])

  // Filtered approved items
  const filteredApprovedItems = useMemo(() => {
    if (!searchQuery.trim()) return approvedItems
    const q = searchQuery.toLowerCase().trim()
    return approvedItems.filter((item) => {
      const pName = item.product?.name?.toLowerCase() ?? ""
      const pCode = item.product?.code?.toLowerCase() ?? ""
      const effective = (item.edited ?? item.raw) as Record<string, unknown>
      const identity = (effective.identity as Record<string, unknown> | undefined) ?? {}
      const bom = (effective.bom as Record<string, unknown> | undefined) ?? {}
      const flowers = Array.isArray(bom.flowers)
        ? bom.flowers.map((f: { name?: string }) => f.name?.toLowerCase() ?? "").join(" ")
        : ""
      const style = typeof identity.phong_cach === "string" ? identity.phong_cach.toLowerCase() : ""
      return pName.includes(q) || pCode.includes(q) || flowers.includes(q) || style.includes(q)
    })
  }, [approvedItems, searchQuery])

  // Filtered finalized pitches
  const filteredFinalizedPitches = useMemo(() => {
    if (!searchQuery.trim()) return internalFinalizedPitches
    const q = searchQuery.toLowerCase().trim()
    return internalFinalizedPitches.filter((p) => {
      const name = p.productName.toLowerCase()
      const desc = p.description.toLowerCase()
      const style = p.style.toLowerCase()
      const occasions = p.occasions.join(" ").toLowerCase()
      const flowers = p.mainFlowers.map((f) => f.name.toLowerCase()).join(" ")
      return name.includes(q) || desc.includes(q) || style.includes(q) || occasions.includes(q) || flowers.includes(q)
    })
  }, [internalFinalizedPitches, searchQuery])

  // Quick Copy Zalo Handler for Tab 3
  const handleQuickCopyZalo = async (pitch: SalesPitchData) => {
    const script = generateZaloPitchScript(pitch)
    try {
      await navigator.clipboard.writeText(script)
      setCopiedPitchId(pitch.id ?? pitch.productName)
      setTimeout(() => setCopiedPitchId(null), 2500)
    } catch {
      setCopiedPitchId(pitch.id ?? pitch.productName)
      setTimeout(() => setCopiedPitchId(null), 2500)
    }
  }

  return (
    <div className={`flex flex-col gap-5 w-full ${className}`}>
      {/* Header & 3-Tab Navigator */}
      <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 border border-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-meta font-bold text-accent-text uppercase tracking-wider">Kho ảnh & nội dung</span>
              <Badge tone="neutral" className="font-semibold text-caption">{library.isChain ? "Chuỗi" : "Cửa hàng"}</Badge>
            </div>
            <h2 className="mt-1 text-title font-extrabold text-text tracking-tight">
              Mọi thứ cửa hàng đã tạo, ở một chỗ
            </h2>
            <p className="text-body-sm text-text-muted mt-0.5">
              Ảnh, video, âm thanh, nội dung, bộ sưu tập chung, bộ sưu tập riêng và kịch bản tư vấn. Mục đã xóa được giữ 30 ngày trong Thùng rác.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dict.storage.filters.searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-surface-alt text-body-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Standardized SaaS Tab Action Header (Tabs on Left + Actions on Top-Right) */}
        <TabActionHeader
          tabs={buildStorageTabs({
            counts: { raw: allRawAssets.length, approved: approvedItems.length, finalized: internalFinalizedPitches.length, trash: trashCount },
            isExecutive,
            libraryTypes: library.types,
            libraryCounts: library.counts,
          })}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as StorageTab)}
          primaryActions={buildPrimaryActions(activeTab, tabHandlers)}
          overflowActions={buildOverflowActions(activeTab, tabHandlers)}
        />
      </div>

      {(activeLibraryType || (activeTab === "raw" && showScope)) && (
        <LibraryPanel
          library={library}
          type={activeLibraryType ?? scopedRawType}
          showScope={showScope}
          onTrash={
            isExecutive && trashTypeForLibrary(activeLibraryType ?? scopedRawType ?? "audio")
              ? (item) => setTrashTarget({ id: item.id, name: item.title || "Mục", imageUrl: item.thumbnail_url, type: trashTypeForLibrary(item.type)! })
              : undefined
          }
        />
      )}

      {/* TAB CONTENT 1: Ảnh Gốc */}
      {activeTab === "raw" && !scopedRawType && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text-muted uppercase tracking-wider">
              Danh sách ảnh gốc ({filteredRawAssets.length} ảnh)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRawAssets}
              disabled={loadingRaw}
              className="text-caption gap-1.5"
            >
              <RefreshCw size={13} className={loadingRaw ? "animate-spin motion-reduce:animate-none" : ""} />
              Làm mới kho ảnh
            </Button>
          </div>

          {errorRaw && (
            <div className="rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-caption text-danger flex items-center gap-2">
              <AlertCircle size={15} />
              {errorRaw}
            </div>
          )}

          {filteredRawAssets.length === 0 && !loadingRaw && (
            <Card className="p-8 text-center bg-surface-alt border-dashed">
              <ImageIcon size={32} className="mx-auto text-text-muted mb-2 opacity-50" />
              <div className="text-body-sm font-bold text-text">Chưa có ảnh gốc nào</div>
              <p className="text-caption text-text-muted mt-1 max-w-sm mx-auto">
                Tải ảnh sản phẩm từ thiết bị lên tại tab &quot;Phân tích ảnh mới&quot; để lưu trữ và bắt đầu nhận diện hoa tự động.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredRawAssets.map((asset) => (
              <Card
                key={asset.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-surface-alt">
                  {asset.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.image_url}
                      alt={asset.name}
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-muted">
                      <ImageIcon size={24} className="opacity-40" />
                    </div>
                  )}
                  {asset.isLocal && (
                    <Badge className="absolute left-2 top-2 bg-info text-white text-caption py-0 px-1.5 font-bold border-none">
                      Mới tải lên
                    </Badge>
                  )}
                </div>

                <div className="p-3 flex flex-col gap-2">
                  <div className="text-meta font-semibold text-text truncate" title={asset.name}>
                    {asset.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="secondary"
                      type="button"
                      onClick={() => handleSelectRaw(asset)}
                      className="px-0 py-0 flex flex-1 items-center justify-center rounded-lg text-caption h-7 gap-1 font-semibold"
                    >
                      <Sparkles size={12} />
                      Phân tích
                    </Button>
                    {isExecutive && !asset.isLocal && (
                      <Button variant="outline"
                        type="button"
                        onClick={() =>
                          setTrashTarget({
                            id: asset.id,
                            name: asset.name,
                            imageUrl: asset.image_url,
                            type: "RAW_ASSET",
                          })
                        }
                        aria-label="Chuyển ảnh vào thùng rác"
                        className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex items-center justify-center h-7 w-7 border border-border text-text-muted hover:text-danger hover:bg-danger-bg shrink-0 rounded-lg"
                        title="Chuyển vào thùng rác 30 ngày (Chỉ Điều hành)"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Ảnh Đã Duyệt Chờ Sinh Dữ Liệu (M01a Approved) */}
      {activeTab === "approved" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text-muted uppercase tracking-wider">
              Danh sách ảnh đã duyệt ({filteredApprovedItems.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApprovedAnalyses}
              disabled={loadingApproved}
              className="text-caption gap-1.5"
            >
              <RefreshCw size={13} className={loadingApproved ? "animate-spin motion-reduce:animate-none" : ""} />
              Làm mới danh sách
            </Button>
          </div>

          {errorApproved && (
            <div className="rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-caption text-danger flex items-center gap-2">
              <AlertCircle size={15} />
              {errorApproved}
            </div>
          )}

          {filteredApprovedItems.length === 0 && !loadingApproved && (
            <Card className="p-8 text-center bg-surface-alt border-dashed">
              <Layers size={32} className="mx-auto text-text-muted mb-2 opacity-50" />
              <div className="text-body-sm font-bold text-text">Chưa có phân tích nào được phê duyệt</div>
              <p className="text-caption text-text-muted mt-1 max-w-sm mx-auto">
                Hãy chuyển sang trang {ti("scanButtonLabel") || "Quét ảnh"} để nhận diện và duyệt ảnh trước khi tạo bài giới thiệu và tư vấn.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApprovedItems.map((item) => {
              const effective = (item.edited ?? item.raw) as Record<string, unknown>
              const identity = (effective.identity as Record<string, unknown> | undefined) ?? {}
              const bom = (effective.bom as Record<string, unknown> | undefined) ?? {}
              const flowers = Array.isArray(bom.flowers) ? bom.flowers : []
              const flowerCount =
                typeof effective.flower_count === "number"
                  ? effective.flower_count
                  : typeof effective.total_stems === "number"
                  ? effective.total_stems
                  : flowers.reduce((sum: number, f: BomFlowerRow) => sum + (Number(f.quantity ?? f.count) || 0), 0)

              const displayName =
                item.product?.name ||
                (effective.product_name as string) ||
                (identity.category as string) ||
                "Sản phẩm thiết kế"
              const displayStyle = (identity.phong_cach as string) || "Hiện đại"
              const displayOccasion = identity.dip_su_dung ? String(identity.dip_su_dung) : null

              return (
                <Card
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface p-4 hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex gap-3.5">
                    {/* Thumbnail Image */}
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-surface-alt border border-border">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={displayName}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-text-muted">
                          <ImageIcon size={22} className="opacity-40" />
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.5 text-caption font-bold text-white">
                        {flowerCount} cành
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <Badge tone="success" className="text-caption py-0 px-1.5 font-bold gap-1">
                            <CheckCircle2 size={10} /> ĐÃ DUYỆT
                          </Badge>
                          <span className="text-caption text-text-muted font-medium">{displayStyle}</span>
                          {displayOccasion && (
                            <span className="text-caption text-primary font-semibold truncate">• {displayOccasion}</span>
                          )}
                        </div>

                        <h4 className="text-body font-bold text-text truncate">{displayName}</h4>

                        {flowers.length > 0 && (
                          <div className="mt-1 text-caption text-text-muted truncate">
                            {flowers.map((f: BomFlowerRow) => `${f.name || "Hoa"}${f.quantity ? ` (${f.quantity})` : ""}`).join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="text-caption text-text-muted flex items-center gap-1 mt-1">
                        <Clock size={11} />
                        {item.approved_at ? formatDate(item.approved_at) : "Gần đây"}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this approved item */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/80">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectApproved(item, "m01b")}
                      className="flex-1 text-caption h-8 gap-1 border-border font-semibold text-text hover:text-primary"
                    >
                      <Sparkles size={13} className="text-accent" />
                      Tạo bài giới thiệu
                    </Button>
                    <Button variant="primary"
                      size="sm"
                      onClick={() => handleSelectApproved(item, "m01c")}
                      className="flex-1 text-caption h-8 gap-1 font-bold"
                    >
                      <Tag size={13} />
                      Tạo thẻ chào
                    </Button>
                    {isExecutive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTrashTarget({
                            id: item.id,
                            name: displayName,
                            imageUrl: item.image_url,
                            type: "APPROVED_ANALYSIS",
                          })
                        }
                        className="h-8 w-8 p-0 text-text-muted hover:text-danger hover:bg-danger-bg shrink-0 rounded-lg"
                        title="Chuyển vào thùng rác 30 ngày (Chỉ Điều hành)"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Sale Pitch Đã Hoàn Thành (Finalized Pitches) */}
      {activeTab === "finalized" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text-muted uppercase tracking-wider">
              Danh sách kịch bản tư vấn ({filteredFinalizedPitches.length})
            </span>
            <span className="text-caption text-text-muted">
              Bấm &quot;Sao chép kịch bản&quot; để gửi khách hàng.
            </span>
          </div>

          {filteredFinalizedPitches.length === 0 && (
            <Card className="p-8 text-center bg-surface-alt border-dashed">
              <CheckCircle2 size={32} className="mx-auto text-success mb-2 opacity-60" />
              <div className="text-body-sm font-bold text-text">Chưa có kịch bản tư vấn nào</div>
              <p className="text-caption text-text-muted mt-1 max-w-sm mx-auto">
                Khi bạn duyệt thẻ chào sản phẩm và kịch bản tư vấn, nội dung sẽ được lưu vào đây để dùng lại.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFinalizedPitches.map((pitch, idx) => {
              const pitchKey = pitch.id ?? `${pitch.productName}-${idx}`
              const isCopied = copiedPitchId === pitchKey

              return (
                <Card
                  key={pitchKey}
                  className="overflow-hidden rounded-2xl border-2 border-success/25 bg-surface p-4 hover:shadow-lg transition-all flex flex-col justify-between gap-3.5"
                >
                  <div className="flex gap-3.5">
                    {/* Thumbnail */}
                    <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-surface-alt border border-border">
                      {pitch.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pitch.imageUrl}
                          alt={pitch.productName}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-text-muted">
                          <ImageIcon size={24} className="opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-caption font-bold text-white">
                        {pitch.dimensions.heightCm}×{pitch.dimensions.widthCm} cm
                      </div>
                    </div>

                    {/* Information */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <Badge className="bg-success/15 text-success font-bold text-caption py-0 px-1.5 border border-success/30 gap-0.5">
                            <CheckCircle2 size={10} strokeWidth={2.5} /> ĐÃ DUYỆT
                          </Badge>
                          <span className="text-meta font-extrabold text-primary">
                            {formatCurrencyVnd(pitch.priceVnd)}
                          </span>
                        </div>

                        <h4 className="text-body font-extrabold text-text tracking-tight truncate leading-tight">
                          {pitch.productName}
                        </h4>

                        <div className="mt-1 flex flex-wrap gap-1">
                          {pitch.occasions.slice(0, 2).map((occ, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-surface-alt px-1.5 py-0.5 text-caption font-medium text-text-muted border border-border/60"
                            >
                              {occ}
                            </span>
                          ))}
                        </div>

                        <div className="mt-1 text-caption text-text-muted line-clamp-1">
                          {pitch.mainFlowers.map((f) => `${f.name}${f.quantity ? ` (${f.quantity})` : ""}`).join(", ")}
                        </div>
                      </div>

                      <div className="text-caption text-text-muted flex items-center justify-between mt-1">
                        <span>{pitch.style}</span>
                        <span>{pitch.finalizedAt ? formatDate(pitch.finalizedAt) : "Hôm nay"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-border/80">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectFinalized(pitch)}
                      className="flex-1 text-caption h-8 gap-1 font-semibold text-text hover:text-primary"
                    >
                      <Eye size={13} /> Xem thẻ chào
                    </Button>

                    <Button variant="secondary"
                      size="sm"
                      onClick={() => handleQuickCopyZalo(pitch)}
                      className={`flex-1 text-caption h-8 gap-1 font-bold ${
                        isCopied ? "bg-success text-white" : "bg-primary hover:bg-primary/90 text-white"
                      }`}
                    >
                      {isCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
                      {isCopied ? "Đã sao chép!" : "Sao chép kịch bản"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePitch(pitchKey)}
                      className="h-8 w-8 p-0 text-text-muted hover:text-danger hover:bg-danger-bg"
                      title="Xóa thẻ chào này"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Thùng Rác Lưu Trữ 30 Ngày (Chỉ Điều Hành) */}
      {activeTab === "trash" && isExecutive && (
        <StorageTrashTab
          onItemRestored={() => {
            fetchRawAssets()
            fetchApprovedAnalyses()
            fetchTrashCount()
          }}
        />
      )}

      {/* Modal xác nhận xóa an toàn */}
      <TrashConfirmModal
        target={trashTarget}
        onClose={() => setTrashTarget(null)}
        onConfirm={handleConfirmTrash}
      />
    </div>
  )
}
