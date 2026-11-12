"use client"

import { useState } from "react"
import { Check } from "@/components/ui/icon-set/check"
import { ImageIcon } from "@/components/ui/icon-set/image-icon"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Wand2 } from "@/components/ui/icon-set/wand2"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { ReviewAsset } from "./package-review-section"
import type { ScenePlan, ScenePlanScene } from "./scene-plan-client"
import { sceneReviseCredit } from "./package-revise-panels"

export interface ReviewImageScene {
  index: number
  beat: string
  title: string
  setting: string
  plan: ScenePlanScene | null
}

export function PackageReviewImages({
  scenes,
  selectedByScene,
  latestByScene,
  approved,
  swapIn,
  setSelectedVariants,
  approveImage,
  busy,
  onRework,
  instructions,
  setInstructions,
  sceneStage,
  sceneError,
  sceneNote,
  runSceneRevise,
  styled,
  selectedVariants,
  scenePlan,
  mode,
  pct,
}: {
  scenes: ReviewImageScene[]
  selectedByScene: Map<number, ReviewAsset>
  latestByScene: Map<number, ReviewAsset>
  approved: boolean
  swapIn: (idx: number, next: ReviewAsset) => void
  setSelectedVariants: (fn: (prev: string[]) => string[]) => void
  approveImage: (a: ReviewAsset) => void
  busy: string | null
  onRework: (area: "b" | "c" | "d" | "e", extra?: Record<string, string>) => void
  instructions: Record<number, string>
  setInstructions: React.Dispatch<React.SetStateAction<Record<number, string>>>
  sceneStage: Record<number, string | null>
  sceneError: Record<number, string | null>
  sceneNote: Record<number, string | null>
  runSceneRevise: (idx: number, current: ScenePlanScene, ratio: string) => Promise<void>
  styled: ReviewAsset[]
  selectedVariants: string[]
  scenePlan: ScenePlan | null
  mode: "CREATIVE" | "AUTHENTIC"
  pct: (v: number | null) => string
}) {
  const [showAll, setShowAll] = useState(false)

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-meta font-bold text-text flex items-center gap-1.5">
          <ImageIcon size={13} /> Ảnh biến thể theo cảnh — {selectedByScene.size}/{scenes.length} cảnh trong gói
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-caption text-primary hover:underline p-0 h-auto"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Ẩn kho ảnh" : "Chọn ảnh khác từ kho"}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scenes.map((sc) => {
          const chosen = selectedByScene.get(sc.index) ?? null
          const latest = latestByScene.get(sc.index) ?? null
          const shown = chosen ?? latest
          const hasNewer = !!(chosen && latest && latest.id !== chosen.id)
          return (
            <div key={sc.index} className="rounded-xl border border-border overflow-hidden bg-surface">
              <div className="relative aspect-square bg-surface-alt flex items-center justify-center">
                {shown?.url ? (
                  <img src={shown.url} alt={sc.title} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-meta text-text-muted">Chưa có ảnh cảnh này</span>
                )}
                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-caption font-bold text-white">
                  Cảnh {sc.index}{sc.beat ? ` · ${sc.beat}` : ""}
                </span>
                {shown && !chosen && (
                  <span className="absolute right-2 top-2 rounded bg-warning-bg px-1.5 py-0.5 text-caption text-warning-text">chưa trong gói</span>
                )}
              </div>
              <div className="p-3 space-y-1.5 text-caption">
                <div className="font-bold text-text">{sc.title}</div>
                {sc.setting && <div className="text-text-muted line-clamp-2">{sc.setting}</div>}
                {shown && (
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Lõi sản phẩm: {pct(shown.identity_score)}</span>
                    <Badge tone={shown.approval_state === "APPROVED" ? "success" : "neutral"} className="text-caption">
                      {shown.approval_state === "APPROVED" ? "Đã duyệt (I5)" : "Chưa duyệt"}
                    </Badge>
                  </div>
                )}
                {hasNewer && !approved && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-primary font-bold hover:underline p-0 h-auto text-caption"
                    onClick={() => swapIn(sc.index, latest)}
                  >
                    ↻ Có ảnh mới hơn cho cảnh này — dùng ảnh mới
                  </Button>
                )}
                {!approved && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {shown && !chosen && (
                      <Button size="sm" variant="outline" className="h-7 text-caption" onClick={() => swapIn(sc.index, shown)}>
                        Đưa vào gói
                      </Button>
                    )}
                    {chosen && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-caption"
                        onClick={() => setSelectedVariants((prev) => prev.filter((x) => x !== chosen.id))}
                      >
                        Bỏ khỏi gói
                      </Button>
                    )}
                    {shown && shown.approval_state !== "APPROVED" && (
                      <Button size="sm" variant="secondary" className="h-7 text-caption gap-1" disabled={busy !== null} onClick={() => void approveImage(shown)}>
                        {busy === `img-${shown.id}` ? <Loader2 size={11} className="animate-spin motion-reduce:animate-none" /> : <Check size={11} />} Duyệt ảnh
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-caption gap-1"
                      onClick={() => onRework("d", { focusScene: String(sc.index) })}
                    >
                      <Wand2 size={11} /> Mở Biến thể marketing
                    </Button>
                  </div>
                )}
                {!approved && sc.plan && (
                  <div className="space-y-1.5 pt-1.5 border-t border-dashed border-border">
                    <Textarea
                      rows={2}
                      value={instructions[sc.index] ?? ""}
                      disabled={!!sceneStage[sc.index]}
                      onChange={(e) => setInstructions((p) => ({ ...p, [sc.index]: e.target.value }))}
                      placeholder="Yêu cầu sửa cảnh, vd: đổi sang quầy lễ tân tông vàng ấm, thêm ánh nắng chiều"
                      className="w-full text-caption"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-caption gap-1"
                      disabled={!!sceneStage[sc.index]}
                      onClick={() => void runSceneRevise(sc.index, sc.plan as ScenePlanScene, shown?.aspect_ratio || "1:1")}
                    >
                      {sceneStage[sc.index] ? <Loader2 size={11} className="animate-spin motion-reduce:animate-none" /> : <Wand2 size={11} />}
                      Sửa cảnh ({sceneReviseCredit(sc.plan, scenePlan?.mode ?? mode)} credit)
                    </Button>
                    {sceneStage[sc.index] && <div className="text-caption text-primary">{sceneStage[sc.index]}</div>}
                    {sceneError[sc.index] && <div className="text-caption text-danger">{sceneError[sc.index]}</div>}
                    {sceneNote[sc.index] && <div className="text-caption text-primary">{sceneNote[sc.index]}</div>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {showAll && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
          {styled.map((a) => {
            const on = selectedVariants.includes(a.id)
            return (
              <Button
                variant="ghost"
                disabled={approved}
                key={a.id}
                onClick={() => {
                  if (approved) return
                  setSelectedVariants((prev) => (on ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                }}
                className={`h-auto whitespace-normal font-normal flex-col items-stretch gap-0 p-0 rounded-lg border-2 overflow-hidden cursor-pointer ${on ? "border-primary" : "border-border"}`}
                title={`Cảnh ${String(a.metadata?.scene_index ?? "?")} · ${pct(a.identity_score)}`}
              >
                {a.url && <img src={a.url} alt="" className="aspect-square w-full object-cover" />}
                <div className="text-caption p-1">Cảnh {String(a.metadata?.scene_index ?? "?")}</div>
              </Button>
            )
          })}
        </div>
      )}
    </section>
  )
}
