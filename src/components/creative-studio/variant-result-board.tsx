"use client"

import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StageGateApprovalBar } from "@/components/ui/stage-gate-approval-bar"
import { ProviderSelect } from "./provider-select"
import {
  variantTotalCostCredit,
  type VariantRenderOptions,
} from "@/modules/media/domain/variant-candidates"
import type { NarrativeScene, SceneCandidate, SceneMeta, ResultBoardProps } from "./variant-scene-types"
import { ActiveSceneSpotlight } from "./variant-scene-spotlight"
import { SceneGrid } from "./variant-scene-grid"

// Re-export for backward compat
export type { ResultBoardProps }

export function VariantResultBoard({
  narrativeResultScenes,
  sceneCandidates,
  sceneMeta,
  selectedSceneIndex,
  setSelectedSceneIndex,
  sceneCount,
  generatedSceneCount,
  sceneCreditTotal,
  cloudAvailable,
  sceneEngine,
  setSceneEngine,
  renderOpts,
  setRenderOpts,
  sceneProvider,
  setSceneProvider,
  watermarkEnabled: _watermarkEnabled,
  variantRatio,
  setVariantRatio,
  planRatios,
  ratioCounts,
  viewRatio,
  judgmentB,
  variantIntegrity,
  minSceneIntegrity,
  generatingAllScenes,
  generatingSceneIndex,
  approvingSceneIndex,
  canApproveVariantCap,
  handleGenerateAllScenes,
  handleGenerateAllRatios,
  handleGenerateSingleScene,
  handleApproveScene,
  handleSelectCandidate,
  setPhase,
  navigateToArea,
  planScenes,
}: ResultBoardProps) {
  const activeScene = narrativeResultScenes.find((s) => s.sceneIndex === selectedSceneIndex) || narrativeResultScenes[0]
  void variantTotalCostCredit // used in sub-component

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
      {planRatios.length > 1 && (
        <div className="flex w-full flex-wrap items-center gap-1.5" role="group" aria-label="Khung ảnh">
          <span className="mr-1 text-caption font-bold uppercase tracking-wider text-text-muted">Khung theo nền tảng:</span>
          {planRatios.map((r) => {
            const done = r === viewRatio ? generatedSceneCount : (ratioCounts[r] ?? 0)
            return (
              <Button key={r} type="button" aria-pressed={r === viewRatio} variant={r === viewRatio ? "primary" : "outline"} size="sm"
                onClick={() => setVariantRatio(r)} className="rounded-lg text-caption font-bold">
                {r} · {done}/{sceneCount}
              </Button>
            )
          })}
        </div>
      )}

      {/* Header kết quả */}
      <div className="flex items-center justify-between w-full flex-wrap gap-2 border-b border-border pb-4">
        <div>
          <div className="text-caption text-text-muted">④ Thẻ kết quả — Biến thể · Kịch bản bối cảnh</div>
          <div className="text-display font-extrabold text-text">Bộ {sceneCount} phân cảnh theo chủ đề</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {cloudAvailable && (
            <div className="inline-flex rounded-lg border border-border overflow-hidden text-caption font-bold">
              {(["cloud_provider", "local_studio"] as const).map((eng) => (
                <Button key={eng} type="button" variant={sceneEngine === eng ? "primary" : "ghost"} size="sm"
                  onClick={() => setSceneEngine(eng)} className="rounded-none text-caption"
                  title={eng === "cloud_provider" ? "Cảnh có không gian riêng: nhà cung cấp AI" : "Mọi cảnh dùng phông Studio cục bộ"}>
                  {eng === "cloud_provider" ? "Nhà cung cấp AI" : "Studio cục bộ"}
                </Button>
              ))}
            </div>
          )}
          {cloudAvailable && sceneEngine === "cloud_provider" && (
            <ProviderSelect kind="image_variant" value={sceneProvider} onChange={setSceneProvider} label="" />
          )}
          <Button size="sm" onClick={handleGenerateAllScenes} disabled={generatingAllScenes || generatingSceneIndex !== null}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover font-bold shadow-md h-9">
            {generatingAllScenes ? `Đang sinh phân cảnh...` : `⚡ Sinh trọn bộ ${sceneCount} phân cảnh${planRatios.length > 1 ? ` khung ${viewRatio}` : ""} (${sceneCreditTotal} credit)`}
          </Button>
          {planRatios.length > 1 && (
            <Button size="sm" variant="outline" onClick={handleGenerateAllRatios}
              disabled={generatingAllScenes || generatingSceneIndex !== null} className="h-9 gap-1.5 font-bold"
              title="Mỗi khung trong phạm vi sản xuất một bộ ảnh riêng (một video riêng ở Video)">
              Sinh đủ {planRatios.length} khung ({sceneCreditTotal * planRatios.length} credit)
            </Button>
          )}
          <Badge tone={judgmentB === "blocked" ? "danger" : "success"} className="text-caption px-3 py-1 font-bold">
            {judgmentB === "blocked" ? "Bị cổng toàn vẹn từ chối" : `${generatedSceneCount}/${sceneCount} phân cảnh đã sinh`}
          </Badge>
        </div>
      </div>

      {judgmentB === "blocked" && (
        <div className="w-full rounded-xl border-2 border-danger bg-danger-bg px-4 py-3 text-body-sm text-danger">
          <div className="font-bold">Không có biến thể nào được ghi</div>
          <div className="mt-1">Cổng toàn vẹn đo thấy lõi sản phẩm bị thay đổi. Master Image của tiệm vẫn nguyên vẹn.</div>
          {variantIntegrity && variantIntegrity.ly_do.length > 0 && (
            <ul className="mt-2 list-disc pl-5">{variantIntegrity.ly_do.map((ly, i) => <li key={i}>{ly}</li>)}</ul>
          )}
        </div>
      )}

      {judgmentB === "warning" && variantIntegrity && (
        <div className="w-full rounded-xl border-2 border-warning bg-warning-bg px-4 py-3 text-body-sm text-warning-text">
          Lõi chủ thể lệch nhẹ so với Master Image ({(variantIntegrity.subject_pixel_identity * 100).toFixed(2)}%). Xem kỹ ảnh trước khi duyệt.
        </div>
      )}

      {activeScene && (
        <ActiveSceneSpotlight
          activeScene={activeScene}
          sceneCount={sceneCount}
          sceneMeta={sceneMeta}
          sceneCandidates={sceneCandidates}
          sceneEngine={sceneEngine}
          renderOpts={renderOpts}
          setRenderOpts={setRenderOpts}
          generatingSceneIndex={generatingSceneIndex}
          generatingAllScenes={generatingAllScenes}
          approvingSceneIndex={approvingSceneIndex}
          canApproveVariantCap={canApproveVariantCap}
          handleGenerateSingleScene={handleGenerateSingleScene}
          handleApproveScene={handleApproveScene}
          handleSelectCandidate={handleSelectCandidate}
        />
      )}

      <SceneGrid
        scenes={narrativeResultScenes}
        selectedSceneIndex={selectedSceneIndex}
        setSelectedSceneIndex={setSelectedSceneIndex}
        generatingSceneIndex={generatingSceneIndex}
        generatingAllScenes={generatingAllScenes}
        handleGenerateSingleScene={handleGenerateSingleScene}
      />

      <div className="w-full space-y-2 pt-2">
        <StageGateApprovalBar
          stageCode="Chặng 06c — BIẾN THỂ ẢNH M04b"
          title={`Phê duyệt bộ ${sceneCount} ảnh tiếp thị theo kịch bản chủ đề`}
          description={`Đã sinh ${generatedSceneCount}/${sceneCount} phân cảnh theo kịch bản ${planScenes.map((sc) => sc.beat).join(" → ")}. Số toàn vẹn lõi đo bởi worker. Chủ shop xác nhận để tiến sang Tạo Video (Khu vực E).`}
          isApproved={judgmentB !== "blocked" && generatedSceneCount > 0}
          approveLabel={`Phê duyệt bộ ${sceneCount} ảnh & chuyển sang Tạo Video (Khu vực E) →`}
          onApprove={() => navigateToArea("e")}
          metrics={[
            { label: "Phân cảnh", value: `${generatedSceneCount}/${sceneCount} đã sinh` },
            { label: "Toàn vẹn lõi (thấp nhất)", value: minSceneIntegrity === null ? "Chưa đo" : `${(minSceneIntegrity * 100).toFixed(2)}%` },
            { label: "Tỉ lệ", value: variantRatio || "1:1" },
          ]}
        />
      </div>

      <div className="w-full border-t border-border pt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setPhase("config-b")}>
          <RotateCcw size={15} className="mr-1.5" /> Đổi nguồn hậu cảnh / tỉ lệ
        </Button>
        <Button variant="outline" onClick={() => setPhase("saved")} className="gap-1.5">
          Xong → Lưu vào kho ảnh
        </Button>
      </div>
    </div>
  )
}

// Re-export types for consumers
export type { NarrativeScene, SceneCandidate, SceneMeta }
