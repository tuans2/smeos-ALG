"use client"

/**
 * Chức năng 04 — AI Content Engine: Tạo nội dung bán hàng đa kênh.
 * Input mở rộng: Chọn từ Product Master HOẶC Upload ảnh trực tiếp.
 *
 * Phân tách SRP (mỗi file ≤350 dòng):
 *  - ProductSelector     → product-selector.tsx
 *  - ChannelSelector     → channel-selector.tsx
 *  - ImageUploadTab      → image-upload-tab.tsx
 *  - GenerationResults   → generation-results.tsx
 *  - useImageUploadFlow  → use-image-upload-flow.ts
 */

import { useI18n } from "@/lib/i18n"
import React, { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Database } from "@/components/ui/icon-set/database"
import { Upload } from "@/components/ui/icon-set/upload"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FlowSteps } from "@/components/flow/flow-steps"
import { ContentGuidanceCard, type MultichannelPostItem } from "@/components/templates/content-engine"
import { FlowerContentStudioModal } from "@/components/content/flower-content-studio-modal"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

import { ProductSelector } from "./product-selector"
import { ChannelSelector, CHANNELS_CONFIG } from "./channel-selector"
import { ImageUploadTab } from "./image-upload-tab"
import { GenerationResults } from "./generation-results"
import { useImageUploadFlow } from "./use-image-upload-flow"
import { useProductData } from "./use-product-data"
import { useContentGeneration } from "./use-content-generation"
import { PageHeader } from "@/components/ui/page-header"

const FLOW_STEPS_PRODUCT = [
  { key: "analyze", label: "Đọc thông số sản phẩm & Brand Kit" },
  { key: "generate", label: "Soạn bài cho các kênh" },
  { key: "review", label: "Kiểm duyệt an toàn thương hiệu" },
]

const FLOW_STEPS_UPLOAD = [
  { key: "upload", label: "Tải & Đăng ký ảnh sản phẩm" },
  { key: "vision", label: "AI Vision phân tích thị giác" },
  { key: "generate", label: "Soạn bài cho các kênh" },
  { key: "review", label: "Kiểm duyệt an toàn thương hiệu" },
]

function ContentEngineContent() {
  const router = useRouter()
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)

  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    CHANNELS_CONFIG.map((c) => c.id)
  )
  const [inputMode, setInputMode] = useState<"product" | "upload">("product")
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false)

  // Custom hooks
  const { products, selectedProductId, setSelectedProductId, isLoading, loadError } =
    useProductData(ti.sampleProduct)
  const uploadFlow = useImageUploadFlow()
  const generation = useContentGeneration({
    uploadFlow,
    products,
    selectedProductId,
    selectedChannels,
    ti,
    inputMode,
  })

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0]

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* ─── Header ─── */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-6 py-3.5"
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles size={18} aria-hidden="true" />
            Nội dung bán hàng
          </span>
        }
        tip="Tạo nội dung bán hàng cho nhiều kênh từ một ý tưởng."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStudioModalOpen(true)}
              className="text-caption gap-1.5"
            >
              <Sparkles size={14} />
              Giọng văn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/lich-dang" as never)}
              className="text-caption gap-1.5"
            >
              <Calendar size={14} />
              Lịch đăng bài
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-caption gap-1.5"
            >
              <ArrowLeft size={14} />
              Trang chủ
            </Button>
          </>
        }
      />

      {/* ─── Main ─── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6 max-w-5xl mx-auto w-full gap-5">
        {/* Toast */}
        {generation.notification && (
          <div
            className={`p-3.5 rounded-xl text-caption font-semibold flex items-center gap-2 ${
              generation.notification.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-danger/10 text-danger border border-danger/30"
            }`}
          >
            <CheckCircle2 size={16} />
            {generation.notification.message}
          </div>
        )}

        <ContentGuidanceCard />

        {/* ═══ PHASE 1: ĐẦU VÀO ═══ */}
        {generation.phase === "select" && (
          <div className="flex flex-col gap-5">
            {/* Toggle: Nguồn đầu vào */}
            <Card className="border border-border bg-surface p-1 shadow-sm">
              <div className="grid grid-cols-2 gap-1">
                {(["product", "upload"] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={inputMode === mode ? "primary" : "ghost"}
                    aria-pressed={inputMode === mode}
                    onClick={() => setInputMode(mode)}
                    className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-caption font-bold h-auto"
                  >
                    {mode === "product" ? <Database size={14} /> : <Upload size={14} />}
                    {mode === "product" ? "Chọn từ kho sản phẩm" : "Tải ảnh sản phẩm mới"}
                  </Button>
                ))}
              </div>
            </Card>

            {/* 1A: Product Master */}
            {inputMode === "product" && (
              <ProductSelector
                products={products}
                selectedProductId={selectedProductId}
                isLoading={isLoading}
                loadError={loadError}
                sampleProductLabel={ti.sampleProduct}
                onSelect={setSelectedProductId}
              />
            )}

            {/* 1B: Upload ảnh mới */}
            {inputMode === "upload" && (
              <Card className="border border-border bg-surface p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <div className="text-caption font-semibold text-text-muted">Bước 1: Tải ảnh sản phẩm</div>
                  <div className="text-title-sm font-extrabold text-text">
                    AI đọc ảnh và soạn bài
                  </div>
                </div>
                <ImageUploadTab
                  state={uploadFlow.state}
                  selectedChannels={selectedChannels}
                  onFileSelected={uploadFlow.onFileSelected}
                  onRunFlow={uploadFlow.runFlow}
                  onReset={uploadFlow.reset}
                />
              </Card>
            )}

            {/* 2: Chọn kênh */}
            <ChannelSelector
              selectedChannels={selectedChannels}
              onToggle={(id) =>
                setSelectedChannels((prev) =>
                  prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                )
              }
              onSelectAll={() => setSelectedChannels(CHANNELS_CONFIG.map((c) => c.id))}
              onClearAll={() => setSelectedChannels([])}
            />

            {/* 3: CTA (chỉ Product mode) */}
            {inputMode === "product" && (
              <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-caption text-text-muted">
                  {selectedChannels.length === 0 ? (
                    <span className="text-warning-text font-semibold">
                      ⚠️ Vui lòng chọn ít nhất 1 kênh.
                    </span>
                  ) : (
                    <span>
                      AI sẽ viết bài cho{" "}
                      <strong>{selectedChannels.length} kênh</strong> đã chọn.
                    </span>
                  )}
                </div>
                <Button
                  size="default"
                  onClick={generation.handleGenerate}
                  disabled={selectedChannels.length === 0 || !selectedProduct}
                  className="w-full sm:w-auto gap-2 font-bold px-7 shadow-md whitespace-nowrap"
                >
                  <Sparkles size={16} />
                  {selectedChannels.length === 0 ? "Chưa chọn kênh nào" : "Viết bài"}
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ═══ PHASE 2: ĐANG XỬ LÝ ═══ */}
        {generation.phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            {inputMode === "product" && (
              <div className="text-center">
                <div className="text-body-sm font-semibold text-primary animate-pulse motion-reduce:animate-none">
                  Đang viết bài...
                </div>
                <div className="text-title font-black text-text mt-1">
                  Đang soạn thảo nội dung tiếp thị đa kênh
                </div>
              </div>
            )}
            <div className="w-full max-w-md">
              <FlowSteps
                steps={inputMode === "product" ? FLOW_STEPS_PRODUCT : FLOW_STEPS_UPLOAD}
                currentStep={generation.currentStep}
                cancellable={false}
              />
            </div>
          </div>
        )}

        {/* ═══ PHASE 3: KẾT QUẢ ═══ */}
        {generation.phase === "results" && generation.posts.length > 0 && (
          <GenerationResults
            posts={generation.posts}
            productName={
              inputMode === "upload"
                ? (uploadFlow.state.fileName?.replace(/\.[^.]+$/, "") || "Sản phẩm tải lên")
                : (selectedProduct?.name || ti.sampleProduct)
            }
            productImageUrl={
              inputMode === "upload"
                ? (uploadFlow.state.previewUrl ?? undefined)
                : selectedProduct?.imageUrl
            }
            modelInfo={generation.modelInfo}
            criticScore={generation.criticScore ?? undefined}
            onUpdatePost={generation.handleUpdatePost}
            onApprovePost={generation.handleApprovePost}
            onReset={() => generation.setPhase("select")}
          />
        )}
      </div>

      <FlowerContentStudioModal
        open={isStudioModalOpen}
        onOpenChange={setIsStudioModalOpen}
        initialProductName={selectedProduct?.name}
      />
    </div>
  )
}

export default function ContentEnginePage() {
  const { t } = useI18n()
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-caption text-text-muted">
          Đang tải xưởng nội dung AI...
        </div>
      }
    >
      <ContentEngineContent />
    </Suspense>
  )
}
