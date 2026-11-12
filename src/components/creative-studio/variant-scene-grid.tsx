"use client"

import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Download } from "@/components/ui/icon-set/download"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Check } from "@/components/ui/icon-set/check"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { VariantDirection } from "@/modules/media/domain/variant-direction-rules"
import type { NarrativeScene } from "./variant-scene-types"

export type SceneGridProps = {
  scenes: NarrativeScene[]
  selectedSceneIndex: number
  setSelectedSceneIndex: (i: number) => void
  generatingSceneIndex: number | null
  generatingAllScenes: boolean
  handleGenerateSingleScene: (idx: number, ratio?: string, opts?: { direction?: VariantDirection; count?: number }) => Promise<void>
}

export function SceneGrid({
  scenes,
  selectedSceneIndex,
  setSelectedSceneIndex,
  generatingSceneIndex,
  generatingAllScenes,
  handleGenerateSingleScene,
}: SceneGridProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-caption font-bold text-text uppercase tracking-wider">
          Danh sách {scenes.length} phân cảnh (chọn cảnh để xem tiêu điểm):
        </span>
        <span className="text-caption text-text-muted">Chuẩn kịch bản Narrative Arc Chặng 04–05</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {scenes.map((scene) => {
          const isSelected = scene.sceneIndex === selectedSceneIndex
          return (
            <Button
              variant="ghost"
              aria-pressed={isSelected}
              key={scene.sceneIndex}
              onClick={() => setSelectedSceneIndex(scene.sceneIndex)}
              className={`h-auto whitespace-normal font-normal items-stretch gap-0 p-0 text-left relative overflow-hidden rounded-xl border-2 transition-all flex flex-col cursor-pointer ${isSelected ? "border-primary ring-2 ring-primary/20 bg-surface shadow-md" : "border-border bg-surface shadow-2xs hover:border-text-muted hover:shadow-xs"}`}
            >
              <div className="relative aspect-square w-full flex items-center justify-center overflow-hidden bg-bg">
                {scene.imageUrl ? (
                  <img src={scene.imageUrl} alt={scene.title} className="h-full w-full object-contain p-2 hover:scale-105 transition-transform duration-300" />
                ) : (
                  <ImageIcon size={32} className="text-text-muted" />
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-extrabold uppercase tracking-wider border shadow-2xs ${scene.beatColor}`}>
                    Cảnh {scene.sceneIndex} · {scene.beat}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-2 border-t border-border">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-caption font-bold text-text-muted uppercase">Cảnh {scene.sceneIndex}</span>
                    <Badge tone={scene.isOriginal ? "neutral" : "success"} className="text-caption px-1.5 py-0">{scene.tag}</Badge>
                  </div>
                  <h5 className="text-caption font-bold text-text line-clamp-1">{scene.title}</h5>
                  <p className="text-caption text-text-muted mt-1 line-clamp-2 leading-relaxed">{scene.setting}</p>
                </div>
                <div className="pt-2 border-t border-dashed border-border flex items-center justify-between text-caption">
                  <span className="text-secondary font-bold truncate max-w-[120px]">{scene.integrityText}</span>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={(e) => { e.stopPropagation(); if (scene.imageUrl) window.open(scene.imageUrl, "_blank") }}
                    className="text-primary font-bold h-auto p-0 flex items-center gap-1 shrink-0 text-caption">
                    <Download size={11} /> Tải về
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm"
                  disabled={generatingSceneIndex !== null || generatingAllScenes}
                  onClick={(e) => { e.stopPropagation(); void handleGenerateSingleScene(scene.sceneIndex) }}
                  className="w-full mt-2 text-caption border-primary/20 text-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center gap-1.5">
                  <Sparkles size={12} className={generatingSceneIndex === scene.sceneIndex ? "animate-spin motion-reduce:animate-none" : ""} />
                  {generatingSceneIndex === scene.sceneIndex
                    ? "Đang chờ worker dựng cảnh..."
                    : scene.hasGenerated
                    ? `🔄 Sinh lại Cảnh ${scene.sceneIndex}`
                    : scene.usesCloud
                    ? `⚡ Sinh Cảnh ${scene.sceneIndex} (nhà cung cấp AI)`
                    : `⚡ Sinh Cảnh ${scene.sceneIndex} (Studio cục bộ)`}
                </Button>
                {scene.fallbackReason && (
                  <p className="mt-1.5 text-caption leading-snug text-warning-text">
                    Nhà cung cấp AI không dựng được cảnh — đã dùng phông cục bộ: {scene.fallbackReason}
                  </p>
                )}
                {scene.error && <p className="mt-1.5 text-caption leading-snug text-danger">{scene.error}</p>}
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
