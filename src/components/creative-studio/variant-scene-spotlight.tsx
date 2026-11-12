"use client"

import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Download } from "@/components/ui/icon-set/download"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Check } from "@/components/ui/icon-set/check"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { VariantDirection } from "@/modules/media/domain/variant-direction-rules"
import {
  SIMILAR_CANDIDATE_COUNT,
  similarDirection,
  alternateDirection,
  variantTotalCostCredit,
  variantUnitCostCredit,
  type VariantRenderOptions,
} from "@/modules/media/domain/variant-candidates"
import type { NarrativeScene, SceneCandidate, SceneMeta } from "./variant-scene-types"

const SHOT_LABEL: Record<string, string> = { close: "Cận", medium: "Trung", wide: "Toàn" }
const LIGHT_LABEL: Record<string, string> = { left: "sáng trái", right: "sáng phải", above: "sáng trên", front: "sáng trước" }

function describeDirection(d: VariantDirection | null | undefined): string {
  if (!d) return ""
  const parts = [SHOT_LABEL[d.composition.shot] ?? d.composition.shot, LIGHT_LABEL[d.lighting.direction] ?? d.lighting.direction]
  return parts.join(" · ")
}

export type SceneSpotlightProps = {
  activeScene: NarrativeScene
  sceneCount: number
  sceneMeta: Record<number, SceneMeta>
  sceneCandidates: Record<number, SceneCandidate[]>
  sceneEngine: "cloud_provider" | "local_studio"
  renderOpts: VariantRenderOptions
  setRenderOpts: React.Dispatch<React.SetStateAction<VariantRenderOptions>>
  generatingSceneIndex: number | null
  generatingAllScenes: boolean
  approvingSceneIndex: number | null
  canApproveVariantCap: boolean
  handleGenerateSingleScene: (idx: number, ratio?: string, opts?: { direction?: VariantDirection; count?: number }) => Promise<void>
  handleApproveScene: (idx: number) => Promise<void>
  handleSelectCandidate: (idx: number, c: SceneCandidate) => void
}

export function ActiveSceneSpotlight({
  activeScene,
  sceneCount,
  sceneMeta,
  sceneCandidates,
  sceneEngine,
  renderOpts,
  setRenderOpts,
  generatingSceneIndex,
  generatingAllScenes,
  approvingSceneIndex,
  canApproveVariantCap,
  handleGenerateSingleScene,
  handleApproveScene,
  handleSelectCandidate,
}: SceneSpotlightProps) {
  const idx = activeScene.sceneIndex
  const list = sceneCandidates[idx] ?? []
  const current = sceneMeta[idx]?.direction ?? null
  const engine = activeScene.usesCloud ? "cloud_provider" : "local_studio"
  const busy = generatingSceneIndex !== null || generatingAllScenes
  const giuNguyenDiemAnh = renderOpts.composeMode === "paste" || renderOpts.composeMode === "harmonize"
  const similarCost = variantTotalCostCredit(engine, SIMILAR_CANDIDATE_COUNT, renderOpts)
  const altCost = variantTotalCostCredit(engine, 1, renderOpts)
  const score = sceneMeta[idx]?.aestheticScore

  return (
    <Card className="w-full p-4 sm:p-5 border-2 border-primary/30 bg-surface shadow-xs rounded-2xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-5 relative aspect-square w-full rounded-xl border border-border overflow-hidden flex items-center justify-center bg-bg">
          {activeScene.imageUrl ? (
            <img src={activeScene.imageUrl} alt={activeScene.title} className="h-full w-full object-contain p-2" />
          ) : (
            <ImageIcon size={40} className="text-text-muted" />
          )}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-extrabold uppercase tracking-wider border shadow-2xs ${activeScene.beatColor}`}>
              Cảnh {activeScene.sceneIndex} · {activeScene.beat}
            </span>
            <Badge tone={activeScene.isOriginal ? "neutral" : "success"} className="text-caption">{activeScene.tag}</Badge>
          </div>
        </div>

        <div className="md:col-span-7 flex flex-col justify-between h-full space-y-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-caption font-bold text-primary uppercase tracking-wider">Phân cảnh đang xem ({activeScene.sceneIndex}/{sceneCount})</span>
              <span className="text-border">·</span>
              <span className="text-caption text-text-muted">{activeScene.lighting}</span>
            </div>
            <h4 className="text-body-sm font-bold text-text mt-1">{activeScene.title}</h4>
            <p className="text-caption text-text-muted mt-2 leading-relaxed">{activeScene.setting}</p>
            {activeScene.palette.length > 0 && (
              <p className="text-caption text-text-muted mt-1">Bảng màu: {activeScene.palette.join(" · ")}</p>
            )}
          </div>

          {activeScene.fallbackReason && (
            <div className="rounded-xl border border-warning bg-warning-bg px-3.5 py-2.5 text-caption text-warning-text">
              <strong>Chưa có bối cảnh của kịch bản:</strong> worker lùi về phông Studio cục bộ. Lý do: {activeScene.fallbackReason}
            </div>
          )}

          <div className="rounded-xl bg-surface-alt p-3.5 border border-border space-y-2">
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">Kiểm định Subject Integrity:</span>
              <span className="font-bold text-secondary flex items-center gap-1">
                <ShieldCheck size={14} className="text-success" />{activeScene.integrityText}
              </span>
            </div>
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">Tỉ lệ khung hình:</span>
              <span className="font-mono font-bold text-text">{activeScene.ratio}</span>
            </div>
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">Mục đích sử dụng:</span>
              <span className="font-medium text-text">{activeScene.purpose || "—"}</span>
            </div>
          </div>

          {activeScene.hasGenerated && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between text-caption">
                <span className="font-bold text-text">Phương án của cảnh {idx} ({list.length})</span>
                {current && (
                  <span className="text-text-muted">
                    Đang xem: {describeDirection(current)}
                    {typeof score === "number" && <span title="Chấm kỹ thuật tự động (độ nét, phơi sáng, tách nền, bố cục) — không thay mắt người"> · Kỹ thuật {Math.round(score)}/100</span>}
                  </span>
                )}
              </div>
              {list.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {list.map((c, i) => {
                    const chosen = c.jobId === sceneMeta[idx]?.jobId
                    return (
                      <Button key={c.jobId || c.assetId} type="button" variant="ghost"
                        title={describeDirection(c.direction)}
                        onClick={() => handleSelectCandidate(idx, c)}
                        className={`relative h-16 w-16 shrink-0 rounded-lg border-2 overflow-hidden p-0 ${chosen ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-text-muted"}`}>
                        <img src={c.url} alt={`Phương án ${list.length - i}`} className="h-full w-full object-cover" />
                        {c.approved && (
                          <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-success text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </Button>
                    )
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy || !current}
                  onClick={() => current && handleGenerateSingleScene(idx, activeScene.ratio, { direction: similarDirection(current, engine), count: SIMILAR_CANDIDATE_COUNT })}
                  className="gap-1.5 text-caption h-8"
                  title={engine === "cloud_provider" ? "Giữ cỡ cảnh, ánh sáng, phong cách — hậu cảnh mới (seed mới)" : "Giữ cỡ cảnh và phong cách — dời vị trí sản phẩm / hướng sáng"}>
                  <RotateCcw size={12} /> Sinh lại giống thế này · {SIMILAR_CANDIDATE_COUNT} phương án ({similarCost} credit)
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy || !current}
                  onClick={() => current && handleGenerateSingleScene(idx, activeScene.ratio, { direction: alternateDirection(current) })}
                  className="gap-1.5 text-caption h-8"
                  title={current ? `Hướng mới: ${describeDirection(alternateDirection(current))}` : undefined}>
                  <Sparkles size={12} /> Thử hướng khác ({altCost} credit)
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-caption text-text-muted">
                <span className="font-bold text-text">Chất lượng lượt sau:</span>
                {engine === "cloud_provider" && (
                  <label className="flex items-center gap-1 cursor-pointer" title="Mặc định nhà cung cấp AI ghép và chỉnh sáng cả sản phẩm (hài hoà nhất). Bật ô này để giữ nguyên từng điểm ảnh sản phẩm — nhà cung cấp chỉ vẽ hậu cảnh.">
                    <Checkbox checked={giuNguyenDiemAnh}
                      onCheckedChange={(c) => setRenderOpts((o) => ({ ...o, composeMode: c === true ? "paste" : undefined, quality: "standard" }))} />
                    Giữ nguyên từng điểm ảnh sản phẩm (không chỉnh sáng)
                  </label>
                )}
                {engine === "cloud_provider" && giuNguyenDiemAnh && (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={renderOpts.quality === "high"}
                      onCheckedChange={(c) => setRenderOpts((o) => ({ ...o, quality: c === true ? "high" : "standard" }))} />
                    Cao (Stability Ultra, +{variantUnitCostCredit("cloud_provider", { quality: "high", composeMode: "paste" }) - variantUnitCostCredit("cloud_provider", { composeMode: "paste" })} credit)
                  </label>
                )}
                <label className="flex items-center gap-1 cursor-pointer"
                  title={engine === "cloud_provider" && !giuNguyenDiemAnh
                    ? `Khung xuất gấp đôi; nhà cung cấp tăng nét cả ảnh bằng mô hình của họ (+${variantUnitCostCredit("cloud_provider", { upscale: "2x" }) - variantUnitCostCredit("cloud_provider")} credit)`
                    : "Khung xuất gấp đôi; chỉ tăng nét hậu cảnh, sản phẩm giữ nguyên điểm ảnh"}>
                  <Checkbox checked={renderOpts.upscale === "2x"}
                    onCheckedChange={(c) => setRenderOpts((o) => ({ ...o, upscale: c === true ? "2x" : "none" }))} />
                  Xuất 2× độ phân giải
                </label>
                {(engine === "local_studio" || giuNguyenDiemAnh) && (
                  <label className="flex items-center gap-1 cursor-pointer" title="Màu bóng theo hậu cảnh, khớp độ nét hậu cảnh — không đụng sản phẩm (xử lý cục bộ)">
                    <Checkbox checked={renderOpts.composeMode === "harmonize"}
                      onCheckedChange={(c) => setRenderOpts((o) => ({ ...o, composeMode: c === true ? "harmonize" : "paste" }))} />
                    Hoà hợp bóng &amp; nền
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <Button type="button" variant="outline" size="sm"
              onClick={() => { if (activeScene.imageUrl) window.open(activeScene.imageUrl, "_blank") }}
              className="gap-1.5 text-caption h-9">
              <Download size={13} /> Tải ảnh phân cảnh này
            </Button>
            {activeScene.transparentUrl && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => window.open(activeScene.transparentUrl as string, "_blank")}
                className="gap-1.5 text-caption h-9">
                <Download size={13} /> PNG tách nền
              </Button>
            )}
            {activeScene.hasGenerated && (
              <Button type="button" size="sm"
                disabled={activeScene.approved || !canApproveVariantCap || approvingSceneIndex !== null}
                onClick={() => handleApproveScene(activeScene.sceneIndex)}
                className="gap-1.5 text-caption h-9">
                <Check size={13} />
                {activeScene.approved ? "Đã duyệt (I5)" : approvingSceneIndex === activeScene.sceneIndex ? "Đang duyệt..." : "Duyệt ảnh này"}
              </Button>
            )}
            <span className="text-caption text-text-muted">Bấm vào các khung bên dưới để chuyển xem từng cảnh</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
