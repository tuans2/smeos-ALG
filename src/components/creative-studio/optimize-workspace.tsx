/**
 * OptimizeWorkspace — Tab 1: M04a Tối ưu ảnh
 *
 * Render logic rút từ page.tsx monolith (phase "select", "confirm-a",
 * "running-a", "result-a").
 */

"use client"

import { Camera } from "@/components/ui/icon-set/camera"
import { Check } from "@/components/ui/icon-set/check"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Download } from "@/components/ui/icon-set/download"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Layers } from "@/components/ui/icon-set/layers"
import { Upload } from "@/components/ui/icon-set/upload"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Cloud } from "@/components/ui/icon-set/cloud"
import { ResultCard } from "@/components/result/result-card"
import { FlowSteps } from "@/components/flow/flow-steps"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  EnhancerProviderSelector,
  ENHANCER_PROVIDERS,
  StudioSceneSelector,
  OptimizationModeSelector,
  AppliedChangesBreakdown,
} from "@/components/templates/creative-studio"
import { BeforeAfterPreviewCard } from "@/components/templates/creative-studio/before-after-preview-card"
import { AssetPickerGrid } from "./asset-picker-grid"
import { FLOW_M04A } from "./types"
import type { UseCreativeStudioReturn } from "./use-creative-studio-data"

interface OptimizeWorkspaceProps {
  data: UseCreativeStudioReturn
}

export function OptimizeWorkspace({ data }: OptimizeWorkspaceProps) {
  const {
    phase,
    setPhase,
    assets,
    selectedAssetId,
    setSelectedAssetId,
    optimizationEngine,
    setOptimizationEngine,
    selectedEnhancerProvider,
    setSelectedEnhancerProvider,
    selectedStudioScene,
    setSelectedStudioScene,
    optimizationMode,
    setOptimizationMode,
    selectedCapabilities,
    setSelectedCapabilities,
    masterApproved,
    optimizationData,
    approvalState,
    requiresWarning,
    fieldsA,
    setFieldsA,
    savedA,
    setSavedA,
    judgmentA,
    setJudgmentA,
    selectedRatio,
    setSelectedRatio,
    showBoundary,
    setShowBoundary,
    fileInputRef,
    uploadingDirect,
    handleDirectUpload,
    jobPhase,
    jobStatus,
    loadingAssets,
    canOptimize,
    canApprove,
    canDownload,
    goRunningA,
    handleApproveAApi,
    handleDownloadRatio,
    loadAssets,
    setMasterApproved,
  } = data

  // Only render for M04a phases
  const isOptimizePhase = phase === "select" || phase === "confirm-a" || phase === "running-a" || phase === "result-a"
  if (!isOptimizePhase) return null

  return (
    <>
      {/* ==== SELECT OR CONFIRM ==== */}
      {(phase === "select" || phase === "confirm-a") && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 w-full max-w-3xl mx-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleDirectUpload}
          />

          <div className="text-center">
            <div className="text-title font-extrabold text-text">Tải &amp; chọn ảnh — Tối ưu ảnh gốc & Kiểm duyệt Danh tính</div>
            <div className="mt-1 text-body-sm text-text-muted">
              {masterApproved && phase === "select"
                ? "Đã có Master Image chính thức — bạn có thể tối ưu lại với ảnh khác hoặc sang Tab 2"
                : "Tải ảnh chụp xưởng hoa từ máy tính hoặc chọn ảnh sẵn có để nâng cấp chuẩn HD Master"}
            </div>
          </div>

          {/* Banner khi đã có Master Image */}
          {masterApproved && phase === "select" && (
            <div className="w-full rounded-xl bg-surface-alt p-5 text-center border border-border shadow-xs">
              <div className="text-body font-bold text-secondary">Đã có Master Image được duyệt chính thức</div>
              <div className="text-caption text-text-muted mt-1">Bạn có thể tạo thêm biến thể ở Tab 2 hoặc tối ưu lại ảnh mới.</div>
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="outline" onClick={() => { setPhase("confirm-a"); loadAssets() }}>
                  Tối ưu lại ảnh khác
                </Button>
                <Button onClick={() => setPhase("config-b")} className="gap-1.5">
                  Sang Tab 2 (Biến thể) <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Upload & Select khi chưa có Master Image */}
          {!masterApproved && phase === "select" && (
            <Card className="w-full flex flex-col items-center gap-3 border-dashed border-2 border-border bg-surface-alt p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-xs">
                <Camera size={28} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="text-title-sm font-bold">Bắt đầu tối ưu ảnh xưởng hoa</div>
              <div className="text-meta text-text-muted max-w-md">
                Ảnh sẽ được tăng cường độ nét (Lanczos 2x), cân bằng tương phản và kiểm duyệt 4 cổng Identity Guard.
              </div>
              <div className="flex gap-2.5 mt-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                  disabled={uploadingDirect}
                >
                  <Upload size={16} /> Tải ảnh từ máy tính
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { loadAssets(); setPhase("confirm-a") }}
                >
                  <Sparkles size={16} className="mr-1.5" /> Chọn từ kho ảnh
                </Button>
              </div>
            </Card>
          )}

          {/* Giao diện cấu hình (confirm-a) */}
          {phase === "confirm-a" && (
            <div className="w-full flex flex-col gap-4">
              {/* Upload card */}
              <Card
              role="button"
              tabIndex={0}
                onClick={() => !uploadingDirect && fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2.5 border-dashed border-2 border-primary/40 bg-primary/5 p-6 cursor-pointer hover:border-primary transition-all text-center select-none"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-xs text-primary">
                  {uploadingDirect ? (
                    <Loader2 size={24} className="animate-spin motion-reduce:animate-none text-primary" />
                  ) : (
                    <Upload size={22} strokeWidth={2} />
                  )}
                </div>
                <div>
                  <div className="text-body-sm font-bold text-text">
                    {uploadingDirect ? "Đang tải ảnh lên kho..." : "Bấm để tải ảnh mới từ máy tính của bạn"}
                  </div>
                  <div className="text-caption text-text-muted mt-0.5">
                    Hỗ trợ JPG, PNG, WebP — Tự động phân tích và sẵn sàng tối ưu
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={uploadingDirect}
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="gap-1.5 mt-1"
                >
                  <Upload size={14} />
                  Chọn file ảnh từ máy
                </Button>
              </Card>

              {/* Asset list */}
              {!loadingAssets && assets.length > 0 && (
                <>
                  <AssetPickerGrid
                    assets={assets}
                    selectedId={selectedAssetId}
                    onSelect={setSelectedAssetId}
                    loading={loadingAssets}
                    label="Hoặc chọn từ kho ảnh"
                  />

                  {/* ENGINE SWITCHER */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-caption font-bold text-text mb-2">Cơ chế xử lý ảnh:</div>
                    {/* PO 25/09/2026: nhà cung cấp TRƯỚC (chất lượng cao nhất); cục bộ là phương án dự phòng. */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-surface-alt rounded-xl border border-border">
                      <Button
                        type="button"
                        size="xs"
                        variant={optimizationEngine === "cloud_provider" ? "primary" : "ghost"}
                        onClick={() => {
                          setOptimizationEngine("cloud_provider")
                          if (selectedEnhancerProvider === "studio" || selectedEnhancerProvider === "local") setSelectedEnhancerProvider("auto")
                        }}
                        className="gap-1.5"
                      >
                        <Cloud size={14} /> Nhà cung cấp AI (khuyên dùng)
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={optimizationEngine === "local_studio" ? "primary" : "ghost"}
                        onClick={() => {
                          setOptimizationEngine("local_studio")
                          setSelectedEnhancerProvider("studio")
                        }}
                        className="gap-1.5"
                      >
                        <Layers size={14} /> Cục bộ (dự phòng)
                      </Button>
                    </div>
                  </div>

                  {/* LOCAL STUDIO BRANCH */}
                  {optimizationEngine === "local_studio" && (
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="rounded-lg bg-surface-alt p-3 border border-border text-meta text-text-muted flex items-start gap-2">
                        <ShieldCheck size={16} className="text-success mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-text">Bảo tồn chủ thể 100% (Offline 0đ):</span> Bóc tách viền sắc nét bằng model cục bộ, cân bằng ánh sáng Studio, khử viền & Smart Reframe 4 tỷ lệ không phụ thuộc Cloud API.
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <StudioSceneSelector value={selectedStudioScene} onChange={setSelectedStudioScene} />
                      </div>
                      <div className="pt-2 border-t border-border">
                        <OptimizationModeSelector
                          mode={optimizationMode}
                          onModeChange={setOptimizationMode}
                          selectedCapabilities={selectedCapabilities}
                          onCapabilitiesChange={setSelectedCapabilities}
                          selectedProvider="studio"
                        />
                      </div>
                    </div>
                  )}

                  {/* CLOUD PROVIDER BRANCH */}
                  {optimizationEngine === "cloud_provider" && (
                    <div className="flex flex-col gap-3 mt-1">
                      <div className="rounded-lg bg-primary/5 p-3 border border-primary/20 text-meta text-primary flex items-start gap-2">
                        <Sparkles size={16} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold">AI Cloud Models:</span> Nâng cấp độ nét, tái tạo ánh sáng nghệ thuật và bóc tách phông nền qua các Cloud Provider chuyên nghiệp hàng đầu.
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <EnhancerProviderSelector value={selectedEnhancerProvider} onChange={setSelectedEnhancerProvider} />
                      </div>
                    </div>
                  )}

                  {/* Submit button */}
                  <Button
                    className="h-[48px] w-full px-8 text-body-sm font-bold shadow-md shadow-primary/20 mt-3"
                    onClick={goRunningA}
                    disabled={
                      !selectedAssetId ||
                      !canOptimize ||
                      uploadingDirect ||
                      (optimizationEngine === "local_studio" && optimizationMode === "custom" && selectedCapabilities.length === 0)
                    }
                  >
                    <Sparkles size={18} strokeWidth={2} className="mr-2" />
                    {optimizationEngine === "local_studio"
                      ? "Tiến hành tối ưu ảnh (Studio cục bộ)"
                      : `Nâng cấp qua Cloud AI (${ENHANCER_PROVIDERS.find((p) => p.id === selectedEnhancerProvider)?.name || "Provider"})`}
                  </Button>

                  {masterApproved && (
                    <div className="flex justify-center pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>
                        <ArrowLeft size={14} className="mr-1.5" /> Quay lại
                      </Button>
                    </div>
                  )}
                </>
              )}

              {loadingAssets && (
                <div className="text-center py-6 text-body-sm text-text-muted flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                  Đang tải danh sách ảnh từ kho...
                </div>
              )}

              {assets.length === 0 && !loadingAssets && (
                <div className="text-center py-4 text-body-sm text-text-muted">
                  Kho chưa có ảnh nào. Vui lòng bấm khung phía trên để tải ảnh từ máy tính.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==== RUNNING ==== */}
      {phase === "running-a" && (
        <div className="flex flex-1 flex-col items-center gap-5 w-full max-w-xl mx-auto">
          <div className="text-center">
            <div className="text-title font-extrabold">Đang tối ưu ảnh & Kiểm duyệt Identity Guard</div>
            <div className="mt-1 text-body-sm text-text-muted">{jobPhase ?? "Đang khởi tạo tác vụ..."}</div>
          </div>
          <div className="w-full">
            <FlowSteps
              steps={FLOW_M04A}
              currentStep={
                jobPhase === "GENERATING_OUTPUTS"
                  ? "VERIFYING"
                  : jobPhase === "PROCESSING" || !jobPhase
                  ? "ANALYZING"
                  : jobPhase
              }
              cancellable={jobStatus === "PENDING" || jobStatus === "PROCESSING"}
              onCancel={() => { data.setPhase("select") }}
              showLog
              logs={jobPhase ? [{ seq: 1, text: `Đang xử lý: ${jobPhase}...`, at: new Date().toISOString() }] : []}
            />
          </div>
          <div className="flex items-start gap-2.5 rounded-xl bg-surface-alt p-4 border border-border w-full">
            <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-primary" />
            <div className="text-caption leading-relaxed text-text-muted">
              Tác vụ Tối ưu ảnh chạy độc lập tại máy chủ — bạn có thể an tâm chuyển trang mà không làm mất tiến trình xử lý.
            </div>
          </div>
        </div>
      )}

      {/* ==== RESULT ==== */}
      {phase === "result-a" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="text-caption text-text-muted">④ Thẻ kết quả — Tối ưu ảnh</div>
              <div className="text-title font-extrabold">Kết quả tối ưu ảnh & Kiểm duyệt Identity Guard</div>
            </div>
            <Badge tone={savedA ? "success" : judgmentA === "blocked" ? "danger" : judgmentA === "warning" ? "warning" : "neutral"}>
              {savedA ? "Đã lưu nháp" : judgmentA === "blocked" ? "Bị từ chối" : judgmentA === "warning" ? "Cảnh báo" : "An toàn"}
            </Badge>
          </div>

          {/* Warning banner */}
          {requiresWarning && approvalState !== "approved" && (
            <div className="w-full rounded-xl border-[1.5px] border-warning/30 bg-warning/10 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-warning-text" />
                <div className="text-body-sm leading-relaxed text-warning-text font-medium">
                  Lưu ý chất lượng: Identity Guard phát hiện sự khác biệt nhẹ giữa ảnh gốc và ảnh sau tối ưu. Vui lòng kiểm tra kỹ trước khi duyệt.
                </div>
              </div>
            </div>
          )}

          {/* Rejected banner */}
          {(approvalState === "rejected" || judgmentA === "blocked") && (
            <div className="w-full rounded-xl border-[1.5px] border-danger bg-danger-bg p-4.5 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={18} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-danger" />
                <div className="flex-1">
                  <div className="text-title-sm font-bold text-danger">Identity Guard đã TỪ CHỐI ảnh này</div>
                  <div className="text-meta text-danger/90 mt-0.5 leading-relaxed">
                    Ảnh sau khi tăng cường làm sai lệch đặc tính hoa thật (điểm số dưới ngưỡng an toàn 90%). Nút duyệt Master Image đã được khóa bảo vệ.
                  </div>
                </div>
              </div>

              {Array.isArray((optimizationData?.identity_guard as { ly_do?: string[] } | undefined)?.ly_do) &&
                ((optimizationData?.identity_guard as { ly_do?: string[] }).ly_do?.length ?? 0) > 0 && (
                  <div className="rounded-lg bg-surface/70 p-3 border border-danger/20 text-caption">
                    <div className="font-bold text-danger mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Chi tiết các sai lệch được phát hiện:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-text">
                      {((optimizationData?.identity_guard as { ly_do?: string[] }).ly_do ?? []).map((ld, i) => (
                        <li key={i} className="leading-relaxed font-medium">{ld}</li>
                      ))}
                    </ul>
                  </div>
                )}

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setJudgmentA("safe"); setPhase("confirm-a"); loadAssets() }}
                  className="border-danger/30 text-danger hover:bg-danger-bg"
                >
                  <ArrowLeft size={14} className="mr-1.5" /> Chọn ảnh khác
                </Button>
                <Button
                  size="sm"
                  onClick={goRunningA}
                  className="bg-danger text-white hover:bg-danger/90"
                >
                  <RotateCcw size={14} className="mr-1.5" /> Chạy lại với ảnh này
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const currentAsset = assets.find((a) => a.id === selectedAssetId)
                    if (currentAsset) {
                      data.promoteOriginalToMaster(currentAsset.id).then(() => {
                        setPhase("config-b")
                      })
                    } else {
                      setPhase("saved")
                    }
                  }}
                  className="border-primary/40 text-primary hover:bg-primary/10 font-bold ml-auto"
                >
                  <Check size={14} className="mr-1.5" /> Dùng ảnh gốc làm Master → Sang Tab 2
                </Button>
              </div>
            </div>
          )}

          {/* Before / After Preview Card */}
          <BeforeAfterPreviewCard
            originalImageUrl={
              (optimizationData?.outputs as { original_url?: string | null } | undefined)?.original_url ?? null
            }
            enhancedImageUrl={(() => {
              const outputs = optimizationData?.outputs as {
                master_url?: string | null
                original_url?: string | null
                ratio_urls?: Record<string, string>
                variant_urls?: { studio?: string; lifestyle?: string; bokeh?: string }
              } | undefined
              return outputs?.ratio_urls?.[selectedRatio] || outputs?.master_url || null
            })()}
            variantUrls={
              (optimizationData?.outputs as {
                variant_urls?: { studio?: string; lifestyle?: string; bokeh?: string }
              } | undefined)?.variant_urls
            }
            variantRatioUrls={
              (optimizationData?.outputs as {
                variant_ratio_urls?: Record<string, Record<string, string>>
              } | undefined)?.variant_ratio_urls
            }
            aspectRatio={selectedRatio}
            availableRatios={["1:1", "4:5", "9:16", "16:9"]}
            onRatioChange={(r) => setSelectedRatio(r)}
            presetName={
              judgmentA === "blocked"
                ? "Identity Guard: TỪ CHỐI"
                : judgmentA === "warning"
                ? "Identity Guard: CẢNH BÁO"
                : "Identity Guard: AN TOÀN"
            }
            presetTone={judgmentA === "blocked" ? "danger" : judgmentA === "warning" ? "warning" : "success"}
            isRejected={judgmentA === "blocked" || approvalState === "rejected"}
            onDownload={
              canDownload && (masterApproved || approvalState === "approved")
                ? () => handleDownloadRatio(selectedRatio)
                : undefined
            }
            onApplyVariant={() => setPhase("config-b")}
          />

          {/* Applied Changes Breakdown */}
          {(() => {
            const appliedChanges =
              (optimizationData as { applied_changes?: string[] } | undefined)?.applied_changes ||
              ((optimizationData?.parameters as { applied_changes?: string[] } | undefined)?.applied_changes) ||
              ((optimizationData?.flags as { applied_changes?: string[] } | undefined)?.applied_changes)
            const executedMode =
              (optimizationData?.parameters as { mode?: string } | undefined)?.mode || optimizationMode
            const providerUsed =
              ENHANCER_PROVIDERS.find((p) => p.id === selectedEnhancerProvider)?.name || "OpenAI"

            return (
              <AppliedChangesBreakdown
                appliedChanges={appliedChanges}
                mode={executedMode}
                providerName={providerUsed}
              />
            )
          })()}

          {/* Dynamic ResultCard */}
          {(() => {
            const guardObj = optimizationData?.identity_guard as {
              identity_score?: number
              color_score?: number
              geometry_score?: number
              component_consistency?: number
            } | undefined
            const idS = guardObj?.identity_score ?? 1
            const colS = guardObj?.color_score ?? 1
            const geoS = guardObj?.geometry_score ?? 1
            const compS = guardObj?.component_consistency ?? 1
            const minScore = Math.min(idS, colS, geoS, compS)
            const scorePercent = Math.round(minScore * 100)

            return (
              <ResultCard
                fields={fieldsA}
                judgment={judgmentA}
                quality={{
                  score: scorePercent,
                  label:
                    judgmentA === "blocked"
                      ? `Identity Guard: TỪ CHỐI (${scorePercent}%) — dưới ngưỡng tối thiểu 90%`
                      : judgmentA === "warning"
                      ? `Identity Guard: CẢNH BÁO (${scorePercent}%) — cần kiểm tra kỹ trước khi duyệt`
                      : `Identity Guard: TỐT (${scorePercent}%) — đạt chuẩn Master Image`,
                  status: judgmentA,
                }}
                onSaveDraft={() => { setSavedA(true); setTimeout(() => setSavedA(false), 2000) }}
                onReject={() => setJudgmentA("blocked")}
                {...(approvalState !== "approved" && approvalState !== "rejected" ? { onApprove: handleApproveAApi } : {})}
                {...(approvalState === "rejected" ? { onRunAgain: goRunningA } : {})}
                {...(approvalState === "rejected" ? { onSkip: () => { setPhase("saved"); setMasterApproved(true) } } : {})}
                disabled={approvalState === "approved"}
                onFieldChange={(key, value) => setFieldsA((p) => p.map((f) => (f.key === key ? { ...f, value } : f)))}
              />
            )
          })()}

          {/* Footer navigation to M04b */}
          {approvalState !== "rejected" && (
            <div className="w-full border-t border-border pt-5">
              {masterApproved && (
                <div className="rounded-xl bg-surface-alt p-4 mb-3 border border-border">
                  <div className="text-meta font-bold text-primary">
                    Ranh giới cứng: Biến thể marketing không thay đổi bản chất sản phẩm. Nếu cần chỉnh ánh sáng hoặc hình dáng sản phẩm, hãy quay lại Tab 1.
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setShowBoundary(!showBoundary)} className="mt-2">
                    {showBoundary ? "Ẩn ghi chú" : "Xem chi tiết ranh giới"}
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-primary/5 p-4 border border-primary/20">
                <div>
                  <div className="text-body font-bold text-primary">Tab 2 — Biến thể marketing (Biến thể marketing)</div>
                  <div className="text-meta text-text-muted">
                    {masterApproved ? "Master Image đã duyệt — sẵn sàng tạo biến thể bối cảnh" : "Cần duyệt Master Image trước khi tạo biến thể"}
                  </div>
                </div>
                <Button
                  onClick={() => void data.goRunningB()}
                  className="flex items-center gap-2"
                  disabled={!masterApproved || !data.canRunVariant}
                >
                  Tạo biến thể <ChevronRight size={16} strokeWidth={2.4} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
