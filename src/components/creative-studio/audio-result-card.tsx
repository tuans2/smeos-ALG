"use client"

import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { AudioTaskType } from "@/modules/audio-studio/domain/audio-types"
import { AUDIO_TASK_SPECS, type AudioTaskSpec } from "@/modules/audio-studio/domain/audio-task-rules"

export interface AudioJobDetail {
  job_id: string
  stage: "DRAFT" | "GENERATING" | "COMPLETED" | "FAILED"
  task_type: AudioTaskType
  voice_display_name: string | null
  provider_key: string | null
  provider_used: string | null
  provider_fallback: boolean
  music_track_name: string | null
  music_provider_used?: string | null
  music_fallback?: boolean
  music_fallback_reason?: string | null
  has_voice: boolean
  total_duration_seconds: number
  loudness_lufs: number | null
  scenes: Array<{ sceneIndex: number; targetDurationSeconds?: number; actualDurationSeconds: number; extended?: boolean }>
  audio_url: string | null
  voice_only_url: string | null
  credits_cost: number
  refunded: boolean
  error: string | null
}

export const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI TTS",
  elevenlabs: "ElevenLabs",
  minimax: "MiniMax",
  edge_tts: "Microsoft Edge (miễn phí)",
}

export function AudioResultCard({
  currentJobId,
  stage,
  polling,
  waitSeconds,
  queuedTooLong,
  audioJob,
  taskType,
  spec,
  pollAudioJob,
}: {
  currentJobId: string
  stage: "DRAFT" | "GENERATING" | "COMPLETED" | "FAILED"
  polling: boolean
  waitSeconds: number
  queuedTooLong: boolean
  audioJob: AudioJobDetail | null
  taskType: AudioTaskType
  spec: AudioTaskSpec
  pollAudioJob: (jobId: string, opts?: { updateUrl?: boolean }) => Promise<void>
}) {
  return (
    <Card className="p-5 border-success/30 bg-success/10">
      <h3 className="text-body-sm font-bold text-success mb-1 flex items-center gap-2">
        {stage === "COMPLETED" ? (
          <CheckCircle2 size={15} className="text-success" />
        ) : stage === "FAILED" ? (
          <AlertCircle size={15} className="text-danger" />
        ) : (
          <Loader2 size={15} className="animate-spin motion-reduce:animate-none text-success" />
        )}
        {stage === "COMPLETED"
          ? "Đã xong — nghe thử bên dưới"
          : stage === "FAILED"
          ? "Thất bại"
          : stage === "GENERATING"
          ? "Hệ thống đang xử lý âm thanh..."
          : "Đang xếp hàng chờ hệ thống nhận việc..."}
        {polling && stage !== "COMPLETED" && stage !== "FAILED" && (
          <span className="font-normal text-success">({waitSeconds}s)</span>
        )}
      </h3>
      {queuedTooLong && (
        <p className="mb-3 text-meta text-warning-text">
          Chưa hệ thống nào nhận tác vụ này. Kiểm tra terminal đang chạy <code>npm run worker:media</code> (hoặc{" "}
          <code>npm run dev:all</code>) — nếu nó được bật trước khi cập nhật mã, hãy tắt và chạy lại. Tác vụ vẫn nằm
          trong hàng đợi, không cần tạo lại.
        </p>
      )}
      {stage === "COMPLETED" && audioJob?.provider_fallback && (
        <p className="mb-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-meta text-warning-text">
          {PROVIDER_LABEL[audioJob.provider_key ?? ""] ?? audioJob.provider_key} lỗi — giọng đã được đọc bằng{" "}
          {PROVIDER_LABEL[audioJob.provider_used ?? ""] ?? audioJob.provider_used} (cùng giọng trong danh mục).
        </p>
      )}
      {stage === "COMPLETED" && audioJob?.music_fallback && (
        <p className="mb-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-meta text-warning-text">
          Không sinh được nhạc AI ({audioJob.music_fallback_reason ?? "nhà cung cấp lỗi"}) — đã dùng bài dự phòng{" "}
          {audioJob.music_track_name ?? ""}; phần credit nhạc được hoàn.
        </p>
      )}
      {stage === "COMPLETED" && audioJob?.audio_url && (
        <div className="mb-3 rounded-lg border border-success/30 bg-surface p-3">
          <audio controls preload="auto" src={audioJob.audio_url} className="w-full">
            Trình duyệt không phát được âm thanh.
          </audio>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-caption text-text-muted">
            <span>
              {audioJob.total_duration_seconds ? `${Math.round(audioJob.total_duration_seconds * 10) / 10}s` : "—"}
              {audioJob.loudness_lufs !== null ? ` · ${audioJob.loudness_lufs} LUFS` : ""}
              {audioJob.scenes.some((s) => s.extended) ? " · có cảnh được kéo dài để đọc trọn câu" : ""}
            </span>
            <span className="flex gap-3">
              <a href={audioJob.audio_url} download className="font-bold text-primary hover:underline">
                Tải bản chính
              </a>
              {audioJob.voice_only_url && (
                <a href={audioJob.voice_only_url} download className="font-bold text-primary hover:underline">
                  Tải bản chỉ giọng
                </a>
              )}
            </span>
          </div>
        </div>
      )}
      {stage === "COMPLETED" && !audioJob?.audio_url && (
        <p className="mb-3 text-meta text-danger">Tác vụ xong nhưng không có tệp âm thanh trong kho.</p>
      )}
      {!polling && stage !== "COMPLETED" && stage !== "FAILED" && (
        <Button size="sm" variant="outline" className="mb-3" onClick={() => void pollAudioJob(currentJobId, { updateUrl: true })}>
          Kiểm tra lại
        </Button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-caption">
        <div className="bg-surface p-3 rounded-lg border border-success/20">
          <p className="text-caption text-text-muted">Tác vụ</p>
          <p className="font-bold text-text truncate">{AUDIO_TASK_SPECS[audioJob?.task_type ?? taskType].label}</p>
        </div>
        <div className="bg-surface p-3 rounded-lg border border-success/20">
          <p className="text-caption text-text-muted">Giọng đọc</p>
          <p className="font-bold text-text truncate">{audioJob?.voice_display_name ?? (spec.needsVoice ? "—" : "Không có")}</p>
        </div>
        <div className="bg-surface p-3 rounded-lg border border-success/20">
          <p className="text-caption text-text-muted">Nhạc nền</p>
          <p className="font-bold text-text truncate">
            {audioJob?.music_provider_used ? "Nhạc AI (ElevenLabs Music)" : audioJob?.music_track_name ?? "Không có"}
          </p>
        </div>
        <div className="bg-surface p-3 rounded-lg border border-success/20">
          <p className="text-caption text-text-muted">Chi phí</p>
          <p className="font-bold text-warning-text font-mono">
            {audioJob ? (audioJob.refunded ? "đã hoàn" : `${audioJob.credits_cost} credit`) : "—"}
          </p>
        </div>
      </div>
    </Card>
  )
}
