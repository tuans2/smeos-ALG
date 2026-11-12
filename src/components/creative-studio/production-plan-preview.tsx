"use client"

/**
 * Xem trước + sửa KỊCH BẢN SẢN XUẤT TỔNG (v2, 24/09/2026) — Chặng 05.
 *
 * Một bản kịch bản quyết định mọi thứ các khu vực sau sẽ làm: câu chuyện, nền
 * tảng đăng → khung hình, từng cảnh (thời lượng, lời thoại, phụ đề, chuyển
 * cảnh, bối cảnh ảnh), âm thanh (giọng, nhạc, nhịp), video (khuôn, phụ đề,
 * màn kết) và bài đăng từng kênh. Sửa ở đây là miễn phí và tăng `revision`.
 */

import { useState } from "react"
import { Clapperboard } from "@/components/ui/icon-set/clapperboard"
import { Film } from "@/components/ui/icon-set/film"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Megaphone } from "@/components/ui/icon-set/megaphone"
import { Music } from "@/components/ui/icon-set/music"
import { Save } from "@/components/ui/icon-set/save"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Disclosure } from "@/components/ui/disclosure"
import { PLATFORM_SPECS } from "@/modules/creative-production/domain/publishing-rules"
import { VOICE_CATALOG } from "@/modules/audio-studio/domain/voice-catalog"
import { estimateSpeechSeconds } from "@/modules/audio-studio/domain/audio-task-rules"
import { patchScenePlan, type LoadedScenePlan } from "./scene-plan-client"
import { OUTPUT_LABELS } from "./production-scope-picker"

const BEAT_LABEL: Record<string, string> = {
  SETUP: "Mở đầu",
  RISING: "Phát triển",
  CLIMAX: "Cao trào",
  RESOLUTION: "Kết",
  CTA: "Kêu gọi",
}
const MOOD_LABEL: Record<string, string> = {
  romantic: "Lãng mạn",
  upbeat: "Sôi động",
  chill: "Thư giãn",
  warm: "Ấm áp",
  luxury: "Sang trọng",
  none: "Không nhạc",
}
const PACING_LABEL: Record<string, string> = { slow: "Chậm", medium: "Vừa", fast: "Nhanh" }
const TRANSITION_LABEL: Record<string, string> = {
  fade: "Mờ dần",
  slide_left: "Trượt trái",
  slide_right: "Trượt phải",
  zoom_in: "Phóng to",
  zoom_out: "Thu nhỏ",
  dissolve: "Hoà tan",
}
const CHANNEL_LABEL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", zalo: "Zalo" }

type SceneDraft = { duration: number; voice: string; overlay: string }

export function ProductionPlanPreview({
  loaded,
  onChange,
  editable = true,
}: {
  loaded: LoadedScenePlan
  onChange?: (next: LoadedScenePlan) => void
  editable?: boolean
}) {
  const plan = loaded.plan
  const [drafts, setDrafts] = useState<Record<number, SceneDraft>>(() =>
    Object.fromEntries(plan.scenes.map((s) => [s.sceneIndex, { duration: s.durationSeconds, voice: s.voiceScript, overlay: s.textOverlay }]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = plan.scenes.some((s) => {
    const d = drafts[s.sceneIndex]
    return d && (d.duration !== s.durationSeconds || d.voice !== s.voiceScript)
  })
  const canEdit = editable && Boolean(loaded.jobId)
  const voice = VOICE_CATALOG.find((v) => v.voiceId === plan.audio.voiceId)
  const total = plan.scenes.reduce((a, s) => a + (drafts[s.sceneIndex]?.duration ?? s.durationSeconds), 0)

  const save = async () => {
    if (!loaded.jobId) return
    setSaving(true)
    setError(null)
    try {
      const next = await patchScenePlan(loaded.jobId, {
        scenes: plan.scenes
          .filter((s) => {
            const d = drafts[s.sceneIndex]
            return d && (d.duration !== s.durationSeconds || d.voice !== s.voiceScript)
          })
          .map((s) => {
            const d = drafts[s.sceneIndex]!
            return {
              scene_index: s.sceneIndex,
              ...(d.duration !== s.durationSeconds ? { duration_seconds: d.duration } : {}),
              ...(d.voice !== s.voiceScript ? { voice_script: d.voice } : {}),
            }
          }),
      })
      setDrafts(Object.fromEntries(next.plan.scenes.map((s) => [s.sceneIndex, { duration: s.durationSeconds, voice: s.voiceScript, overlay: s.textOverlay }])))
      onChange?.(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 text-meta">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={plan.source === "ai" ? "success" : "neutral"} className="text-caption">
            {plan.source === "ai" ? "Kịch bản AI" : "Kịch bản cơ bản"}
          </Badge>
          <Badge tone="neutral" className="text-caption">Phiên bản {plan.revision}</Badge>
          <span className="text-text-muted">{plan.emotionalTone}</span>
        </div>
        {plan.story.logline && <p className="font-semibold text-text">{plan.story.logline}</p>}
        {plan.story.hook && <p className="mt-1 italic text-text-muted">Hook: “{plan.story.hook}”</p>}
        {plan.story.cta && <p className="mt-0.5 text-success font-semibold">CTA: {plan.story.cta}</p>}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-text"><Film size={13} /> Video</p>
          <p>
            Đăng: {plan.publishing.allPlatforms ? "Tất cả nền tảng" : plan.publishing.platforms.map((p) => PLATFORM_SPECS[p]?.label ?? p).join(", ")}
          </p>
          <p>
            Sản xuất: {plan.publishing.produce.map((o) => OUTPUT_LABELS[o]).join(", ")}
            {plan.publishing.derivedOutputs.length > 0 &&
              ` (tự thêm ${plan.publishing.derivedOutputs.map((o) => OUTPUT_LABELS[o].toLowerCase()).join(" + ")} vì video cần)`}
          </p>
          <p>
            Khung <b>{plan.publishing.ratios.join(", ")}</b> · {plan.scenes.length} cảnh · ~{Math.round(total)}s · phụ đề{" "}
            {plan.video.hasSubtitle ? "có (= lời thoại)" : "không"}
          </p>
          {plan.publishing.produce.includes("video") && plan.publishing.videoVariants.length > 1 && (
            <p>
              {plan.publishing.videoVariants.length} video:{" "}
              {plan.publishing.videoVariants.map((v) => `${v.ratio} ~${v.targetSeconds}s`).join(", ")}
            </p>
          )}
          <p>Màn kết: {plan.video.endCardText || "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-text"><Music size={13} /> Âm thanh</p>
          <p>Giọng: {voice?.displayName ?? plan.audio.voiceId}</p>
          <p>Nhạc: {MOOD_LABEL[plan.audio.musicMood] ?? plan.audio.musicMood} · nhịp {PACING_LABEL[plan.audio.pacing] ?? plan.audio.pacing}</p>
          <p className="text-text-muted">Âm thanh phối đúng giọng + nhạc này; video dùng nguyên bản phối.</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="mb-2 flex items-center gap-1.5 font-bold text-text"><Clapperboard size={13} /> Từng cảnh (ảnh D · lời thoại C · video E)</p>
        <div className="flex flex-col gap-2">
          {plan.scenes.map((s) => {
            const d = drafts[s.sceneIndex] ?? { duration: s.durationSeconds, voice: s.voiceScript, overlay: s.textOverlay }
            const need = estimateSpeechSeconds(d.voice)
            return (
              <div key={s.sceneIndex} className="rounded-lg border border-border/60 bg-surface-alt/60 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-text">
                    {s.sceneIndex}. {BEAT_LABEL[s.beat] ?? s.beat} — {s.title}
                  </span>
                  <span className="flex items-center gap-1 text-text-muted">
                    {canEdit ? (
                      <Input
                        type="number"
                        min={1.5}
                        max={15}
                        step={0.5}
                        inputSize="sm"
                        value={d.duration}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [s.sceneIndex]: { ...d, duration: Math.min(15, Math.max(1.5, parseFloat(e.target.value) || 1.5)) } }))
                        }
                        className="w-16 text-right"
                      />
                    ) : (
                      <b>{s.durationSeconds}</b>
                    )}
                    s · {TRANSITION_LABEL[s.transition] ?? s.transition}
                  </span>
                </div>
                <p className="text-text-muted">Bối cảnh: {s.setting}</p>
                {canEdit ? (
                  <>
                    <Textarea
                      rows={2}
                      value={d.voice}
                      maxLength={300}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [s.sceneIndex]: { ...d, voice: e.target.value } }))}
                      placeholder="Lời thoại (cũng là phụ đề trên video)"
                      className="mt-1 text-caption"
                    />
                    {need > d.duration && (
                      <p className="text-caption text-warning-text">Lời thoại cần ~{need}s — dài hơn cảnh, âm thanh sẽ kéo dài cảnh này.</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="italic">“{s.voiceScript}” <span className="not-italic text-text-muted">(lời thoại = phụ đề)</span></p>
                  </>
                )}
              </div>
            )
          })}
        </div>
        {canEdit && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-text-muted">Tổng ~{Math.round(total)}s</span>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-caption" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> : <Save size={12} />} Lưu thay đổi (miễn phí)
            </Button>
          </div>
        )}
        {error && <p className="mt-1 text-danger">{error}</p>}
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="mb-1 flex items-center gap-1.5 font-bold text-text"><Megaphone size={13} /> Bài đăng (Nội dung)</p>
        {plan.content.posts.length === 0 ? (
          <p className="text-text-muted">Chưa có bài theo kịch bản — Nội dung sẽ viết theo khuôn dự phòng.</p>
        ) : (
          plan.content.posts.map((p) => (
            <Disclosure key={p.channel} label={CHANNEL_LABEL[p.channel] ?? p.channel} className="mb-2 p-3">
              <p className="whitespace-pre-line text-text">{p.text}</p>
              {p.hashtags.length > 0 && <p className="text-text-muted mt-1">{p.hashtags.join(" ")}</p>}
            </Disclosure>
          ))
        )}
        {plan.content.videoCaption.text && (
          <p className="mt-1 text-text">
            <b>Chú thích video:</b> {plan.content.videoCaption.text} {plan.content.videoCaption.hashtags.join(" ")}
          </p>
        )}
      </div>
    </div>
  )
}
