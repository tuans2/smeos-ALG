"use client"

import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Camera } from "@/components/ui/icon-set/camera"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { SourcePicker } from "./source-picker"
import { ProviderSelect } from "./provider-select"
import { variantUnitCostCredit, type VariantRenderOptions } from "@/modules/media/domain/variant-candidates"
import type { PublishRatio } from "@/modules/creative-production/domain/publishing-rules"
import type { ScenePlan } from "@/modules/creative-production/domain/scene-plan-rules"
import type { CreativeStudioContextType } from "@/app/(app)/creative-studio/page"
import type { AssetItem, MasterItem } from "./types"
import type { NarrativeScene } from "./variant-scene-types"
import { ScenePlanSection } from "./variant-scene-plan-section"

export type VariantConfigPanelProps = {
  context: CreativeStudioContextType | null
  scenePlan: ScenePlan | null
  planLoading: boolean
  planWriting: boolean
  planError: string | null
  planCtx: unknown
  cloudAvailable: boolean
  sceneEngine: "cloud_provider" | "local_studio"
  setSceneEngine: (e: "cloud_provider" | "local_studio") => void
  sceneProvider: string
  setSceneProvider: (v: string) => void
  renderOpts: VariantRenderOptions
  variantRatio: PublishRatio
  setVariantRatio: (r: PublishRatio) => void
  watermarkEnabled: boolean
  setWatermarkEnabled: (v: boolean) => void
  sceneCount: number
  sceneCreditTotal: number
  narrativeResultScenes: NarrativeScene[]
  showManualSourcePicker: boolean
  setShowManualSourcePicker: (v: boolean) => void
  approvedMasters: MasterItem[]
  selectedMasterId: string
  setSelectedMasterId: (id: string) => void
  assets: AssetItem[]
  promoteOriginalToMaster: (assetId: string) => Promise<void>
  loadingMasters: boolean
  loadingAssets: boolean
  canApprove: boolean
  promotingMaster: boolean
  generatingAllScenes: boolean
  masterError: string | null
  activeMasterId: string | null
  hasImageSource: boolean
  navigateToArea: (a: "a" | "b" | "c" | "d" | "e" | "f") => void
  openSceneBoard: (generateAll: boolean) => Promise<void>
  handleWritePlan: (rewrite: boolean) => Promise<void>
  handleUseRulePlan: () => void
}

export function VariantConfigPanel({
  context,
  scenePlan,
  planLoading,
  planWriting,
  planError,
  planCtx,
  cloudAvailable,
  sceneEngine,
  setSceneEngine,
  sceneProvider,
  setSceneProvider,
  renderOpts,
  variantRatio,
  setVariantRatio,
  watermarkEnabled,
  setWatermarkEnabled,
  sceneCount,
  sceneCreditTotal,
  narrativeResultScenes,
  showManualSourcePicker,
  setShowManualSourcePicker,
  approvedMasters,
  selectedMasterId,
  setSelectedMasterId,
  assets,
  promoteOriginalToMaster,
  loadingMasters,
  loadingAssets,
  canApprove,
  promotingMaster,
  generatingAllScenes,
  masterError,
  activeMasterId,
  hasImageSource,
  navigateToArea,
  openSceneBoard,
  handleWritePlan,
  handleUseRulePlan,
}: VariantConfigPanelProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
      <div className="text-center w-full">
        <div className="text-title font-extrabold text-primary">Biến thể marketing — Tạo biến thể ảnh Marketing Tiếp thị</div>
        <div className="mt-1 text-body-sm text-text-muted">
          Tự động liên kết ảnh sản phẩm thật và áp dụng kịch bản bối cảnh cung truyện (Narrative Arc) từ Chặng 04–05.
        </div>
      </div>

      {/* Nguồn ảnh */}
      {context?.sourceImageUrl || context?.assetId ? (
        <div className="w-full space-y-2">
          <Card className="w-full p-4 border border-success/30 bg-success/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
              <div className="h-16 w-16 rounded-xl border border-success/30 bg-surface p-1 overflow-hidden shrink-0 shadow-2xs">
                {context.sourceImageUrl ? (
                  <img src={context.sourceImageUrl} alt={context.productName || "Ảnh sản phẩm"} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-success/10 text-success"><Camera size={22} /></div>
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="success" className="text-caption px-2 py-0.5">
                    <CheckCircle2 size={11} className="mr-1" />
                    Ảnh sản phẩm từ Chặng 01–02 (Đang sử dụng)
                  </Badge>
                  {context.assetId && <span className="text-caption font-mono text-text-muted">Asset #{context.assetId.slice(0, 8)}</span>}
                </div>
                <h4 className="text-body-sm font-bold text-text truncate">{context.productName || "Sản phẩm"}</h4>
                <p className="text-caption text-text-muted truncate">
                  {context.commercialPassport?.style || "Hiện đại & Tinh tế"} · {context.commercialPassport?.category || ""}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm"
              onClick={() => setShowManualSourcePicker(!showManualSourcePicker)}
              className="text-caption text-text-muted hover:text-text h-8 self-end sm:self-center shrink-0">
              {showManualSourcePicker ? "Ẩn đổi ảnh" : "Đổi ảnh khác từ kho"}
            </Button>
          </Card>
          {showManualSourcePicker && (
            <SourcePicker masters={approvedMasters} selectedMasterId={selectedMasterId} onSelectMaster={setSelectedMasterId}
              assets={assets} onPromoteToMaster={promoteOriginalToMaster} onGoToOptimize={() => navigateToArea("a")}
              loadingMasters={loadingMasters} loadingAssets={loadingAssets} canApprove={canApprove} />
          )}
        </div>
      ) : (
        <SourcePicker masters={approvedMasters} selectedMasterId={selectedMasterId} onSelectMaster={setSelectedMasterId}
          assets={assets} onPromoteToMaster={promoteOriginalToMaster} onGoToOptimize={() => navigateToArea("a")}
          loadingMasters={loadingMasters} loadingAssets={loadingAssets} canApprove={canApprove} />
      )}

      <ScenePlanSection context={context} scenePlan={scenePlan} planLoading={planLoading} planWriting={planWriting}
        planError={planError} planCtx={planCtx} renderOpts={renderOpts} narrativeResultScenes={narrativeResultScenes}
        handleWritePlan={handleWritePlan} handleUseRulePlan={handleUseRulePlan} />

      {/* Nguồn hậu cảnh */}
      {scenePlan && cloudAvailable && (
        <div className="w-full">
          <div className="text-body-sm font-bold text-text mb-2">Nguồn hậu cảnh cho các cảnh có không gian riêng:</div>
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-alt rounded-xl border border-border w-full">
            {(["cloud_provider", "local_studio"] as const).map((eng) => (
              <Button key={eng} type="button" variant={sceneEngine === eng ? "primary" : "ghost"}
                onClick={() => setSceneEngine(eng)} className="py-2.5 px-3 text-caption font-bold gap-1.5">
                {eng === "cloud_provider"
                  ? <><Sparkles size={14} /> Nhà cung cấp AI ({variantUnitCostCredit("cloud_provider", renderOpts)} credit/cảnh)</>
                  : <><ShieldCheck size={14} /> Cục bộ — dự phòng ({variantUnitCostCredit("local_studio", renderOpts)} credit/cảnh)</>}
              </Button>
            ))}
          </div>
          {sceneEngine === "cloud_provider" && (
            <div className="mt-2">
              <ProviderSelect kind="image_variant" value={sceneProvider} onChange={setSceneProvider} label="Nhà cung cấp dựng cảnh cho lượt này" />
            </div>
          )}
          <p className="mt-1.5 text-caption text-text-muted leading-relaxed">
            {sceneEngine === "cloud_provider"
              ? "Nhà cung cấp dựng cảnh + hoà sáng quanh sản phẩm thật; ALG đo lại hình dáng, cấu trúc, màu. Mọi bên lỗi thì lùi phông cục bộ."
              : "Dự phòng: mỗi cảnh dùng phông Studio dựng sẵn gần nhất (6 phông) — rẻ hơn nhưng chất lượng thấp hơn nhà cung cấp."}
          </p>
        </div>
      )}

      {/* Tùy biến đa kênh */}
      <Card className="w-full p-4 border border-border bg-surface flex flex-col gap-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="text-caption font-semibold text-text-muted uppercase tracking-wider">Tùy biến xuất bản đa kênh</div>
          <Badge tone="accent" className="text-caption font-bold">
            {scenePlan ? `Trọn bộ ${sceneCount} cảnh: ${sceneCreditTotal} credit` : "Chưa có kịch bản"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-caption font-bold text-text block mb-1.5">Tỉ lệ khung hình</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["1:1", "4:5", "9:16", "16:9"] as const).map((r) => (
                <Button key={r} type="button" size="sm" variant={variantRatio === r ? "primary" : "outline"}
                  onClick={() => setVariantRatio(r)} className="h-8 text-caption font-bold">{r}</Button>
              ))}
            </div>
            <div className="text-caption text-text-muted mt-1">
              {variantRatio === "1:1" && "Vuông chuẩn Instagram / Zalo"}
              {variantRatio === "4:5" && "Dọc nhẹ chuẩn Facebook Feed"}
              {variantRatio === "9:16" && "Dọc toàn màn hình Story / Reels / TikTok"}
              {variantRatio === "16:9" && "Ngang Banner Website / Youtube"}
            </div>
          </div>
          <div>
            <label className="text-caption font-bold text-text block mb-1.5">Bản quyền & Đóng dấu</label>
            <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-surface-alt cursor-pointer hover:border-text-muted">
              <Checkbox checked={watermarkEnabled} onCheckedChange={(c) => setWatermarkEnabled(c === true)} />
              <div className="text-caption">
                <span className="font-bold text-text">Đóng dấu Watermark Shop</span>
                <span className="block text-caption text-text-muted">Logo/tên tiệm từ Hồ sơ thương hiệu; bản PNG tách nền không đóng dấu</span>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* Boundary notice */}
      <div className="w-full rounded-xl bg-primary/5 p-4 border border-primary/20 flex items-start gap-3">
        <ShieldCheck size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="text-caption text-primary/90 leading-relaxed">
          <strong>Ranh giới bất biến:</strong> Biến thể marketing không thay đổi hình dáng hay màu sắc sản phẩm thật. Sản phẩm từ Master Image được bảo toàn 100%.
        </div>
      </div>

      {/* Nút hành động */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button className="h-[48px] sm:col-span-2 px-6 text-body-sm font-bold shadow-md shadow-primary/20"
          onClick={() => void openSceneBoard(true)}
          disabled={!hasImageSource || !scenePlan || promotingMaster || generatingAllScenes}>
          <Sparkles size={18} strokeWidth={2} className="mr-2" />
          {promotingMaster ? "Đang dùng ảnh gốc làm Master..." : !scenePlan ? "Cần kịch bản bối cảnh trước" : `Sinh trọn bộ ${sceneCount} phân cảnh (${sceneCreditTotal} credit)`}
        </Button>
        <Button variant="outline" className="h-[48px] px-4 text-body-sm font-bold"
          onClick={() => void openSceneBoard(false)} disabled={!hasImageSource || !scenePlan || promotingMaster}>
          Sinh từng cảnh →
        </Button>
      </div>

      {masterError && (
        <div className="w-full rounded-xl border border-danger bg-danger-bg px-4 py-3 text-body-sm text-danger">{masterError}</div>
      )}
      {!activeMasterId && context?.assetId && !masterError && (
        <p className="w-full text-caption text-text-muted">
          Ảnh từ Tải &amp; chọn ảnh chưa là Master Image — khi bấm tạo, hệ thống sẽ dùng nguyên ảnh gốc làm Master (không chỉnh ảnh, cần quyền duyệt ảnh I2).
        </p>
      )}

      <div className="w-full flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={() => navigateToArea("a")}>
          <ArrowLeft size={14} className="mr-1.5" /> Quay lại Tải &amp; chọn ảnh
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigateToArea("e")}
          className="text-text-muted hover:text-text underline decoration-dotted p-0 h-auto text-caption">
          Bỏ qua tạo biến thể &amp; Chuyển sang Tạo Video →
        </Button>
      </div>
    </div>
  )
}
