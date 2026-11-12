"use client"

import { Mic } from "@/components/ui/icon-set/mic"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ScenePlan } from "./scene-plan-client"

export interface AudioScene {
  sceneIndex: number
  voiceScript: string
  targetDurationSeconds: number
}

export function AudioScenesCard({
  scenes,
  addScene,
  removeScene,
  updateScene,
  scenePlan,
  scenesEdited,
  setScenes,
  setScenesEdited,
  scenesFromPlan,
  maxVoiceScriptLength,
  estimateSpeechSeconds,
}: {
  scenes: AudioScene[]
  addScene: () => void
  removeScene: (idx: number) => void
  updateScene: (idx: number, field: "targetDurationSeconds" | "voiceScript", value: number | string) => void
  scenePlan: ScenePlan | null
  scenesEdited: boolean
  setScenes: React.Dispatch<React.SetStateAction<AudioScene[]>>
  setScenesEdited: (v: boolean) => void
  scenesFromPlan: (plan: ScenePlan) => AudioScene[]
  maxVoiceScriptLength: number
  estimateSpeechSeconds: (text: string) => number
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body-sm font-bold text-text flex items-center gap-2">
          <Mic size={14} /> Lời thoại ({scenes.length} cảnh)
        </h3>
        <Button variant="secondary" size="sm" onClick={addScene} className="gap-1.5" disabled={scenes.length >= 12}>
          <Mic size={12} /> Thêm cảnh
        </Button>
      </div>
      {scenePlan ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2 text-meta text-text-muted">
          <span>
            Lời thoại theo kịch bản bối cảnh của chủ đề ({scenePlan.scenes.length} cảnh, cùng kịch bản với ảnh biến thể
            {scenePlan.source === "rule" ? " — kịch bản cơ bản" : ""}).
          </span>
          {scenesEdited && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setScenes(scenesFromPlan(scenePlan))
                setScenesEdited(false)
              }}
              className="font-bold text-primary hover:underline cursor-pointer p-0 h-auto text-caption"
            >
              Dùng lại lời thoại của kịch bản
            </Button>
          )}
        </div>
      ) : (
        <p className="mb-3 text-meta text-text-muted">
          Chưa có kịch bản bối cảnh cho chủ đề này — lời thoại đang điền từ hook/tiêu đề/CTA. Viết kịch bản ở Biến thể marketing để ảnh và giọng đọc kể cùng một câu chuyện.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {scenes.map((scene) => {
          const est = estimateSpeechSeconds(scene.voiceScript)
          const longer = est > scene.targetDurationSeconds
          return (
            <div key={scene.sceneIndex} className="bg-surface p-3 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <Badge tone="neutral">Cảnh #{scene.sceneIndex}</Badge>
                {scenes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => removeScene(scene.sceneIndex)}
                    className="text-caption text-danger font-semibold cursor-pointer p-0 h-auto hover:underline"
                  >
                    Xóa
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr]">
                <div>
                  <label className="text-caption font-semibold text-text-muted block mb-1">Thời lượng (s)</label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={scene.targetDurationSeconds}
                    onChange={(e) =>
                      updateScene(scene.sceneIndex, "targetDurationSeconds", Math.min(60, parseFloat(e.target.value) || 1))
                    }
                    className="w-full text-caption"
                  />
                </div>
                <div>
                  <label className="text-caption font-semibold text-text-muted block mb-1">Lời thoại</label>
                  <Textarea
                    rows={2}
                    maxLength={maxVoiceScriptLength}
                    value={scene.voiceScript}
                    onChange={(e) => updateScene(scene.sceneIndex, "voiceScript", e.target.value)}
                    placeholder="Nhập lời thoại…"
                    className="w-full text-caption"
                  />
                  <p className={`mt-0.5 text-caption ${longer ? "text-warning-text" : "text-text-muted"}`}>
                    {scene.voiceScript.length}/{maxVoiceScriptLength} ký tự · đọc ~{est}s
                    {longer ? ` — dài hơn ${scene.targetDurationSeconds}s, cảnh sẽ tự kéo dài để đọc trọn câu` : ""}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
