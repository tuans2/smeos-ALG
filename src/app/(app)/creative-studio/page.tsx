"use client"

import { useI18n } from "@/lib/i18n"
import { decodeScopeParam } from "@/modules/creative-production/domain/build-handoff-url"
import { areaScopeStatus, resolvePublishing } from "@/modules/creative-production/domain/publishing-rules"
import React, { useState, useMemo, useEffect, useCallback } from "react"
import { Sparkles, ArrowLeft, Wand2, FileText, Headphones, Film, Package, AlertTriangle, Camera } from "@/components/ui/icons"
import { useSearchParams, useRouter } from "next/navigation"
import { TabActionHeader, type TabItem, type TabOverflowAction } from "@/components/ui/tab-header"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { CreativeGuidanceCard } from "@/components/templates/creative-studio/creative-guidance-card"
import { ProductIntelligenceWorkspace } from "@/components/market-intelligence/product-intelligence-workspace"
import { VariantWorkspace } from "@/components/creative-studio/variant-workspace"
import { ContentsWorkspace } from "@/components/creative-studio/contents-workspace"
import { AudioWorkspace } from "@/components/creative-studio/audio-workspace"
import { VideoWorkspace } from "@/components/creative-studio/video-workspace"
import { PackageWorkspace } from "@/components/creative-studio/package-workspace"
import { ValidationScreen } from "@/components/creative-studio/validation-screen"
import { useCreativeStudioData } from "@/components/creative-studio/use-creative-studio-data"
import { validateTransition } from "@/modules/creative-production/domain/validate-transition"

import type { ProductIntelligenceReport, ConcreteTopic } from "@/modules/market-intelligence/domain/product-intelligence-types"

// ============================================================
// CreativeStudioContext — carry-forward từ Chặng 01–05 (Khu vực A)
// ============================================================

export interface CreativeStudioContextType {
  topicId: string
  mode: "CREATIVE" | "AUTHENTIC"
  sourceImageUrl: string
  sourceVideoUrl: string | undefined
  productName: string
  productId: string | undefined
  assetId: string | undefined
  voiceId: string | undefined
  musicMood: string | undefined
  /** Phạm vi sản xuất chọn cuối Chặng 04 (`?platforms=`/`?outputs=`) — bỏ trống = mặc định. */
  platforms: string[] | "all" | undefined
  outputs: string[] | "all" | undefined
  report: ProductIntelligenceReport | null
  topics: ConcreteTopic[]
  selectedTopic: ConcreteTopic | null
  commercialPassport?: {
    category: string
    style: string
    components: string[]
    colors: string[]
    priceRange?: string | undefined
    targetAudience?: string | undefined
    suggestedOccasions?: string[] | undefined
  } | undefined
}

export const CreativeStudioContext = React.createContext<CreativeStudioContextType | null>(null)

// ============================================================
// Tab definitions
// ============================================================

const CREATIVE_STUDIO_TABS: Record<
  string,
  {
    id: string
    label: string
    icon: typeof Sparkles
    workspace: "area-a" | "area-b" | "area-c" | "area-d" | "area-e" | "area-f"
    description: string
  }
> = {
  "area-a": {
    id: "area-a",
    label: "Phân tích ảnh sản phẩm",
    icon: Camera,
    workspace: "area-a",
    description: "Tải ảnh, phân tích sản phẩm và chọn chủ đề chính",
  },
  "area-b": {
    id: "area-b",
    label: "Viết nội dung (Copywriting)",
    icon: FileText,
    workspace: "area-b",
    description: "Viết nội dung sáng tạo và chân thực",
  },
  "area-c": {
    id: "area-c",
    label: "Sản xuất âm thanh & Giọng đọc",
    icon: Headphones,
    workspace: "area-c",
    description: "Tạo giọng đọc, nhạc nền và phối âm thanh",
  },
  "area-d": {
    id: "area-d",
    label: "Biến thể marketing & Bối cảnh",
    icon: Wand2,
    workspace: "area-d",
    description: "Tạo các biến thể quảng cáo và bối cảnh",
  },
  "area-e": {
    id: "area-e",
    label: "Dựng video đa kênh",
    icon: Film,
    workspace: "area-e",
    description: "Dựng video đa kênh",
  },
  "area-f": {
    id: "area-f",
    label: "Gói chiến dịch & Duyệt",
    icon: Package,
    workspace: "area-f",
    description: "Đóng gói, kiểm tra chất lượng và duyệt chiến dịch",
  },
}

// ============================================================
// PAGE SHELL
// ============================================================

export default function CreativeStudioPage() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const data = useCreativeStudioData()

  // --- Context from URL (carry-forward Chặng 1-4) ---
  // 22/09/2026 (nợ #118): URL chỉ mang định danh — `topic` là report.id (=
  // product_analysis_runs.id) khi bàn giao qua Product Intelligence, `selectedTopic`
  // là chủ đề cụ thể user đã chọn trong report đó. `imageUrl` KHÔNG còn được đọc
  // từ query string (ảnh luôn resolve tươi từ `assetId` — xem effect dưới).
  const [context, setContext] = useState<CreativeStudioContextType>(() => ({
    topicId: searchParams.get("selectedTopic") || searchParams.get("topic") || "",
    mode: (searchParams.get("mode") as "CREATIVE" | "AUTHENTIC") || "CREATIVE",
    sourceImageUrl: "",
    sourceVideoUrl: searchParams.get("videoUrl") || undefined,
    productName: searchParams.get("productName") || "",
    productId: searchParams.get("productId") || undefined,
    assetId: searchParams.get("assetId") || undefined,
    voiceId: searchParams.get("voiceId") || undefined,
    musicMood: searchParams.get("musicMood") || undefined,
    platforms: decodeScopeParam(searchParams.get("platforms")),
    outputs: decodeScopeParam(searchParams.get("outputs")),
    report: null,
    topics: [],
    selectedTopic: null,
  }))

  // --- Trạng thái tải tường minh (Lớp 3 — không lỗi im lặng) ---
  const [imageLoadError, setImageLoadError] = useState<string | null>(null)
  const [reportLoadError, setReportLoadError] = useState<string | null>(null)

  // --- Resolve ảnh hiển thị bằng assetId — KHÔNG tin bất kỳ URL nào truyền qua query
  // string (Data URL/blob đã từng làm chết cứng nút "Bắt đầu sáng tạo", nợ #118) ---
  useEffect(() => {
    const assetId = context.assetId
    if (!assetId) return
    let cancelled = false
    fetch(`/api/v1/assets/${encodeURIComponent(assetId)}/view-url`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tải được ảnh sản phẩm từ kho (asset có thể đã bị xoá).")
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        setContext((prev) => ({ ...prev, sourceImageUrl: json.url }))
      })
      .catch((err) => {
        if (cancelled) return
        setImageLoadError(err instanceof Error ? err.message : "Không tải được ảnh sản phẩm.")
      })
    return () => {
      cancelled = true
    }
  }, [context.assetId])

  // --- Tải lại report Product Intelligence bằng report.id (param `topic`) ---
  const loadReport = useCallback(() => {
    const runId = searchParams.get("topic")
    if (!runId) return

    fetch(`/api/v1/product-intelligence/${encodeURIComponent(runId)}`)
      .then((res) => {
        // 404 không phải lỗi ở đây — luồng bàn giao không qua Product Intelligence
        // (vd. /tai-anh) dùng `topic` như một nhãn hiển thị thuần, không phải run id.
        if (res.status === 404) return null
        if (!res.ok) throw new Error("Không tải được báo cáo Product Intelligence.")
        return res.json()
      })
      .then((json) => {
        if (!json) return
        const report = json.report as ProductIntelligenceReport
        const topics = report.topics || []
        const selectedTopicId = searchParams.get("selectedTopic") || runId
        const selectedTopic = topics.find((t) => t.id === selectedTopicId) || topics[0] || null

        // Extract commercialPassport from report for validation
        // Build from report components/attributes if commercialPassport missing
        const commercialPassport = {
          // 23/09/2026: chỉ lấy dữ liệu THẬT của report — thiếu thì để trống cho
          // ValidationScreen báo thiếu, không điền "Sản phẩm thiết kế"/"Tone màu hài hòa".
          // `category` là hình dáng sản phẩm (bó/giỏ/kệ), không phải phân khúc giá.
          category: report.attributes?.shape || report.commercialPassport?.tags?.[0] || "",
          style: report.commercialPassport?.style || report.attributes?.style || "",
          components: (report.components || []).map((c) => c.flowerType).filter(Boolean),
          colors: [
            ...(report.attributes?.mainColors || []),
            ...(report.attributes?.secondaryColors || []),
          ],
          priceRange: report.commercialPassport?.priceRange
            ? `${report.commercialPassport.priceRange.minPrice.toLocaleString("vi-VN")} – ${report.commercialPassport.priceRange.maxPrice.toLocaleString("vi-VN")} VNĐ`
            : undefined,
          targetAudience: report.commercialPassport?.targetAudience?.buyerPersona,
          suggestedOccasions: report.commercialPassport?.occasions,
        }

        setContext((prev) => ({
          ...prev,
          report,
          topics,
          selectedTopic,
          commercialPassport,
        }))
      })
      .catch((err) => {
        setReportLoadError(err instanceof Error ? err.message : "Không tải được báo cáo Product Intelligence.")
      })
  }, [searchParams])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  // Đồng bộ context từ URL khi chuyển đổi hoặc bàn giao từ Chặng 05
  useEffect(() => {
    const topicParam = searchParams.get("selectedTopic") || searchParams.get("topic")
    const modeParam = searchParams.get("mode") as "CREATIVE" | "AUTHENTIC" | null
    const nameParam = searchParams.get("productName")
    const prodIdParam = searchParams.get("productId")
    const assetIdParam = searchParams.get("assetId")
    const videoParam = searchParams.get("videoUrl")
    const voiceParam = searchParams.get("voiceId")
    const musicParam = searchParams.get("musicMood")
    const platformsParam = searchParams.get("platforms")
    const outputsParam = searchParams.get("outputs")

    // 23/09/2026: bỏ "passport dự phòng" bịa sẵn — nó làm cổng Validation luôn
    // qua dù chưa có dữ liệu thật của Chặng 02.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state từ nguồn ngoài (URL/API), chủ đích
    setContext((prev) => {
      return {
        ...prev,
        ...(topicParam ? { topicId: topicParam } : {}),
        ...(modeParam ? { mode: modeParam } : {}),
        ...(nameParam ? { productName: nameParam } : {}),
        ...(prodIdParam !== null ? { productId: prodIdParam || undefined } : {}),
        ...(assetIdParam !== null ? { assetId: assetIdParam || undefined } : {}),
        ...(videoParam !== null ? { sourceVideoUrl: videoParam || undefined } : {}),
        ...(voiceParam !== null ? { voiceId: voiceParam || undefined } : {}),
        ...(musicParam !== null ? { musicMood: musicParam || undefined } : {}),
        ...(platformsParam !== null ? { platforms: decodeScopeParam(platformsParam) } : {}),
        ...(outputsParam !== null ? { outputs: decodeScopeParam(outputsParam) } : {}),
      }
    })
  }, [searchParams])

  // --- Initial active tab from URL 'tab' or 'area' parameter ---
  const getInitialTabId = (): string => {
    const tabParam = searchParams.get("tab")
    if (tabParam && tabParam in CREATIVE_STUDIO_TABS) {
      return tabParam
    }
    const area = searchParams.get("area")
    switch (area) {
      case "b":
        return "area-b"
      case "c":
        return "area-c"
      case "d":
        return "area-d"
      case "e":
        return "area-e"
      case "f":
        return "area-f"
      default:
        return "area-a"
    }
  }

  // --- Active tab ---
  const [activeTabId, setActiveTabId] = useState<string>(() => getInitialTabId())
  const [validationDismissed, setValidationDismissed] = useState(false)

  // Đồng bộ activeTabId khi URL query thay đổi (?tab=area-a hoặc ?area=b)
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && tabParam in CREATIVE_STUDIO_TABS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ state từ nguồn ngoài (URL/API), chủ đích
      setActiveTabId(tabParam)
    } else {
      const area = searchParams.get("area")
      if (area) {
        const mapped = `area-${area}`
        if (mapped in CREATIVE_STUDIO_TABS) {
          setActiveTabId(mapped)
        }
      }
    }
  }, [searchParams])

  // --- Validation (Chặng chuyển tiếp) ---
  // Khu vực A chính là nơi THỰC HIỆN Chặng 1 đến 5 (tải ảnh, bóc tách Vision, Trend Fit và chọn chủ đề),
  // nên KHÔNG BAO GIỜ bị chặn bởi ValidationScreen. ValidationScreen chỉ áp dụng cho Khu vực B-F
  // khi người dùng vào thẳng các bước sản xuất mà chưa hoàn thành Chặng 1-5.
  const validationResult = useMemo(() => validateTransition({
    topicId: context.topicId || undefined,
    mode: context.mode,
    sourceImageUrl: context.sourceImageUrl || undefined,
    sourceVideoUrl: context.sourceVideoUrl,
    productName: context.productName || undefined,
    productId: context.productId,
    assetId: context.assetId,
    commercialPassport: context.commercialPassport,
    hasReport: !!context.report,
    hasTopics: context.topics.length > 0,
    voiceId: context.voiceId,
    musicMood: context.musicMood,
  }), [context])

  const showValidation = activeTabId !== "area-a" && !validationResult.valid && !validationDismissed

  // --- Tabs ---
  // Phạm vi sản xuất (PO 24/09/2026): chỉ sản xuất những gì đã chọn cuối Chặng 04.
  const scope = useMemo(() => resolvePublishing(context.platforms ?? null, context.outputs ?? null), [context.platforms, context.outputs])
  const activeScope = areaScopeStatus(scope, activeTabId)
  const tabs: TabItem[] = useMemo(() =>
    Object.values(CREATIVE_STUDIO_TABS).map((tab) => {
      const st = areaScopeStatus(scope, tab.id)
      return {
        id: tab.id,
        label: st === "out" ? `${tab.label} · ngoài phạm vi` : st === "derived" ? `${tab.label} · cần cho video` : tab.label,
        icon: tab.icon,
      }
    }),
    [scope]
  )

  // --- Primary Actions ---
  // 23/09/2026: bỏ bảy nút header `onClick: () => {}` (nút chết). Mỗi Khu vực
  // có nút hành động thật ngay trong workspace; header chỉ giữ điều hướng.

  // --- Overflow Actions ---
  const overflowActions: TabOverflowAction[] = useMemo(() => [
    { id: "go-home", label: "Quay về Trang chủ", icon: ArrowLeft, onClick: () => router.push("/") },
    ...(activeTabId !== "area-a" ? [{
      id: "back-to-a",
      label: "Quay lại bước Phân tích ảnh",
      icon: ArrowLeft,
      dividerAbove: true,
      onClick: () => setActiveTabId("area-a"),
    }] : []),
  ], [activeTabId, router])

  // --- Tab change handler ---
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
  }

  // Đang làm lại một tài sản cho gói chiến dịch (Chặng 07 → khu vực gốc, 24/09/2026).
  const returnToPackage = searchParams.get("returnTo") === "f" && activeTabId !== "area-f"
  const backToPackage = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("area", "f")
    params.delete("returnTo")
    params.delete("focusScene")
    router.push(`/creative-studio?${params.toString()}` as never)
  }

  // --- Render workspace by tab ---
  const renderWorkspace = () => {
    switch (activeTabId) {
      case "area-a":
        return <ProductIntelligenceWorkspace />
      case "area-b":
        return <ContentsWorkspace />
      case "area-c":
        return <AudioWorkspace />
      case "area-d":
        return <VariantWorkspace data={data} />
      case "area-e":
        return <VideoWorkspace />
      case "area-f":
        return <PackageWorkspace />
      default:
        return null
    }
  }

  // --- Render ---
  return (
    <CreativeStudioContext.Provider value={context}>
      <div className="flex h-full flex-col overflow-hidden bg-bg">
        {/* Top Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-3">
          <PageHeader title="Studio sáng tạo" breadcrumbs="Chặng 01–14 · Studio sáng tạo đa phương tiện" />
          <TabActionHeader
            tabs={tabs}
            activeTab={activeTabId}
            onTabChange={handleTabChange}
            primaryActions={[]}
            overflowActions={overflowActions}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6 gap-6">
          {(imageLoadError || reportLoadError) && (
            <div className="w-full max-w-3xl mx-auto rounded-xl border border-warning/30 bg-warning/10 p-3 flex items-start gap-2 text-meta text-warning-text">
              <AlertTriangle size={16} className="text-warning-text shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {imageLoadError && <p>{imageLoadError}</p>}
                {reportLoadError && <p>{reportLoadError}</p>}
              </div>
            </div>
          )}
          {showValidation ? (
            /* Validation Screen — hiển thị khi thiếu required data ở các Khu vực B-F */
            <ValidationScreen
              result={validationResult}
              onContinue={() => setValidationDismissed(true)}
              onGoBack={() => setActiveTabId("area-a")}
            />
          ) : (
            <>
              {/* Feature Guidance Card */}
              <div className="w-full max-w-3xl mx-auto">
                <CreativeGuidanceCard area={activeTabId as "area-a" | "area-b" | "area-c" | "area-d" | "area-e" | "area-f"} />
              </div>

              {/* Context Info Bar — chỉ hiển thị tại Khu vực B-F khi đã có topic/product */}
              {activeTabId !== "area-a" && (context.topicId || context.productName) && (
                <div className="flex w-full max-w-3xl mx-auto flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface-alt px-4 py-3 text-body-sm">
                  <span className="text-text-muted">Sản phẩm: <span className="font-semibold text-text">{context.productName || "Chưa chọn"}</span></span>
                  <span className="text-text-muted">Nguồn: <span className="font-semibold text-text">{context.sourceImageUrl ? "Ảnh" : context.sourceVideoUrl ? "Video" : "Chưa có"}</span></span>
                </div>
              )}

              {activeScope !== "in" && (
                <div
                  className={`w-full max-w-3xl mx-auto rounded-xl border p-3 text-meta ${
                    activeScope === "out" ? "border-border bg-surface-alt text-text" : "border-warning/30 bg-warning/10 text-warning-text"
                  }`}
                >
                  {activeScope === "out"
                    ? "Khu vực này nằm ngoài phạm vi sản xuất bạn chọn ở Chặng 04 — gói chiến dịch sẽ không đòi kết quả ở đây. Bạn vẫn có thể làm thêm nếu muốn."
                    : "Bạn không chọn riêng loại kết quả này, nhưng video cần nó — hệ thống sẽ sản xuất để dựng video."}
                  {" "}Phạm vi: {scope.produce.join(", ")} · khung {scope.ratios.join(", ")}.
                </div>
              )}

              {/* Workspace */}
              {returnToPackage && (
                <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-meta">
                  <span className="text-text">
                    Đang làm lại tài sản cho <strong>gói chiến dịch</strong>. Xong thì quay lại — tài sản mới sẽ được đề xuất thay vào gói.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={backToPackage}
                    className="shrink-0"
                  >
                    ← Quay lại gói (Chặng 07)
                  </Button>
                </div>
              )}
              {renderWorkspace()}
            </>
          )}
        </div>
      </div>
    </CreativeStudioContext.Provider>
  )
}
