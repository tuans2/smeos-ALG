"use client"

import { Headphones } from "@/components/ui/icon-set/headphones"
import { Mic } from "@/components/ui/icon-set/mic"
import { Music } from "@/components/ui/icon-set/music"
import { Volume2 } from "@/components/ui/icon-set/volume2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Send } from "@/components/ui/icon-set/send"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StageGateApprovalBar } from "@/components/ui/stage-gate-approval-bar"
import type { AudioQualityTier, AudioTaskType, TtsProviderKey } from "@/modules/audio-studio/domain/audio-types"
import {
  AUDIO_TASK_SPECS,
  AUDIO_TASK_TYPES,
} from "@/modules/audio-studio/domain/audio-task-rules"
import { VOICE_CATALOG } from "@/modules/audio-studio/domain/voice-catalog"
import { MusicLibraryPanel } from "./music-library-panel"
import { VoiceClonePanel } from "./voice-clone-panel"
import { ProviderSelect } from "./provider-select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { AudioScenesCard } from "./audio-scenes-card"
import { AudioResultCard } from "./audio-result-card"
import { useAudioWorkspace } from "./use-audio-workspace"

const TASK_ICON: Record<AudioTaskType, typeof Mic> = {
  VOICEOVER: Mic,
  MUSIC_SELECT: Music,
  AUDIO_MIX: Volume2,
  VOICE_CLONE: Headphones,
}

export function AudioWorkspace() {
  const {
    taskType,
    setTaskType,
    spec,
    voiceId,
    setVoiceId,
    providerKey,
    setProviderKey,
    qualityTier,
    setQualityTier,
    voiceCloneId,
    setVoiceCloneId,
    musicTrackId,
    setMusicTrackId,
    preferredMood,
    setUserPickedMusic,
    setMusicLicenseOk,
    effectiveMusic,
    musicProvider,
    setMusicProvider,
    musicDuration,
    setMusicDuration,
    scenes,
    setScenes,
    addScene,
    removeScene,
    updateScene,
    scenePlan,
    scenesEdited,
    setScenesEdited,
    scenesFromPlan,
    maxVoiceScriptLength,
    estimateSpeechSeconds,
    totalDuration,
    firstProblem,
    loading,
    polling,
    credit,
    handleCreate,
    musicLicenseOk,
    error,
    audioJob,
    currentJobId,
    stage,
    waitSeconds,
    queuedTooLong,
    pollAudioJob,
    navigateToArea,
    selectedVoice,
  } = useAudioWorkspace()

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h3 className="text-body-sm font-bold text-text mb-3 flex items-center gap-2">
          <Headphones size={14} /> Loại tác vụ
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {AUDIO_TASK_TYPES.map((tt) => {
            const Icon = TASK_ICON[tt]
            const s = AUDIO_TASK_SPECS[tt]
            return (
              <Button
                variant="ghost"
                key={tt}
                aria-pressed={taskType === tt}
                onClick={() => setTaskType(tt)}
                className={`h-auto whitespace-normal font-normal flex-col items-start justify-start gap-0 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                  taskType === tt ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-border-hover"
                }`}
              >
                <span className={`flex items-center gap-1.5 text-caption font-bold ${taskType === tt ? "text-primary" : "text-text"}`}>
                  <Icon size={14} /> {s.label}
                </span>
                <span className="mt-1 block text-caption leading-snug text-text-muted">{s.description}</span>
              </Button>
            )
          })}
        </div>
      </Card>

      {spec.needsVoice && taskType !== "VOICE_CLONE" && (
        <Card className="p-5">
          <h3 className="text-body-sm font-bold text-text mb-3 flex items-center gap-2">
            <Mic size={14} /> Giọng đọc & nhà cung cấp
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VOICE_CATALOG.map((v) => (
              <Button
                variant="ghost"
                key={v.voiceId}
                aria-pressed={voiceId === v.voiceId}
                onClick={() => setVoiceId(v.voiceId)}
                className={`h-auto whitespace-normal font-normal flex-col items-start justify-start gap-0 rounded-lg border px-3 py-2 text-left cursor-pointer ${
                  voiceId === v.voiceId ? "border-primary bg-primary/5" : "border-border bg-surface"
                }`}
              >
                <span className="block text-meta font-bold text-text">{v.displayName}</span>
                <span className="block text-caption text-text-muted">{v.gender === "female" ? "Nữ" : "Nam"} · {v.description}</span>
              </Button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProviderSelect kind="voice" value={providerKey} onChange={(v) => setProviderKey(v as TtsProviderKey | "")} label="Nhà cung cấp giọng đọc" />
            <div>
              <label className="text-caption font-semibold text-text-muted block mb-1">Chất lượng</label>
              <Select value={qualityTier} onValueChange={(v) => setQualityTier(v as AudioQualityTier)}>
                <SelectTrigger className="text-caption"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-2 text-caption text-text-muted">
            Nhà cung cấp lỗi thì hệ thống lùi sang nhà cung cấp khác với <b>cùng giọng</b> {selectedVoice ? `(${selectedVoice.displayName})` : ""} và báo rõ trên kết quả.
          </p>
        </Card>
      )}

      {taskType === "VOICE_CLONE" && (
        <>
          <VoiceClonePanel value={voiceCloneId} onChange={(id) => setVoiceCloneId(id)} />
          <Card className="p-5">
            <label className="text-caption font-semibold text-text-muted block mb-1">Chất lượng giọng nhân bản</label>
            <Select value={qualityTier} onValueChange={(v) => setQualityTier(v as AudioQualityTier)}>
              <SelectTrigger className="text-caption"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (ElevenLabs Turbo)</SelectItem>
                <SelectItem value="premium">Premium (ElevenLabs Multilingual v2)</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        </>
      )}

      {spec.music !== "none" && (
        <MusicLibraryPanel
          key={`music-${preferredMood ?? "any"}`}
          value={musicTrackId}
          required={spec.music === "required"}
          preferredMood={preferredMood}
          onChange={(id, t, byUser) => {
            if (byUser) setUserPickedMusic(true)
            setMusicTrackId(id)
            setMusicLicenseOk(t ? t.license_verified : null)
          }}
        />
      )}

      {spec.music !== "none" && effectiveMusic && (
        <Card className="p-5">
          <h3 className="text-body-sm font-bold text-text mb-3 flex items-center gap-2">
            <Music size={14} /> Nhạc nền do AI sinh
          </h3>
          <ProviderSelect
            kind="music"
            value={musicProvider === "library" ? "" : musicProvider}
            onChange={setMusicProvider}
            label="Nhà cung cấp nhạc nền"
            disabled={musicProvider === "library"}
          />
          <label className="mt-2 flex items-center gap-2 text-caption text-text-muted cursor-pointer">
            <Checkbox checked={musicProvider === "library"} onCheckedChange={(checked) => setMusicProvider(checked ? "library" : "")} />
            Chỉ dùng bài đã chọn trong thư viện (miễn phí, không sinh nhạc mới)
          </label>
          {musicProvider !== "library" && (
            <p className="mt-1 text-caption text-text-muted">
              Nhạc không lời sinh theo tâm trạng, đủ thời lượng thật của bản đọc. Bài đang chọn ở thư viện là bài dự phòng khi nhà cung cấp lỗi (hoàn phần credit nhạc).
            </p>
          )}
        </Card>
      )}

      {taskType === "MUSIC_SELECT" && (
        <Card className="p-5">
          <label className="text-caption font-semibold text-text-muted block mb-1">Thời lượng bản nhạc (giây)</label>
          <Input
            type="number"
            min={5}
            max={120}
            value={musicDuration}
            onChange={(e) => setMusicDuration(Math.min(120, Math.max(5, parseInt(e.target.value) || 15)))}
            className="w-32 text-caption"
          />
          <p className="mt-1 text-caption text-text-muted">Nhạc được cắt/lặp đủ thời lượng, fade in/out, chuẩn độ to -14 LUFS.</p>
        </Card>
      )}

      {spec.needsVoice && (
        <AudioScenesCard
          scenes={scenes}
          addScene={addScene}
          removeScene={removeScene}
          updateScene={updateScene}
          scenePlan={scenePlan}
          scenesEdited={scenesEdited}
          setScenes={setScenes}
          setScenesEdited={setScenesEdited}
          scenesFromPlan={scenesFromPlan}
          maxVoiceScriptLength={maxVoiceScriptLength}
          estimateSpeechSeconds={estimateSpeechSeconds}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-text-muted">
          {firstProblem ? <span className="text-warning-text">{firstProblem}</span> : <>Tổng ~{Math.round(totalDuration)}s · {spec.label}</>}
        </p>
        <Button onClick={handleCreate} disabled={loading || polling || Boolean(firstProblem)} className="gap-2">
          {loading ? (
            <><Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> Đang tạo...</>
          ) : polling ? (
            <><Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> Đang chờ kết quả...</>
          ) : (
            <><Send size={14} /> Tạo {spec.label} · {credit === 0 ? "miễn phí" : `${credit} credit`}</>
          )}
        </Button>
      </div>
      {spec.music !== "none" && effectiveMusic && musicLicenseOk === false && (
        <p className="text-caption text-warning-text">Bài nhạc đang chọn chưa có hồ sơ giấy phép thương mại.</p>
      )}
      {error && (
        <Card className="border-danger/30 bg-danger/10 p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-danger shrink-0" />
          <p className="text-caption text-danger">{error}{audioJob?.refunded ? " — đã hoàn credit." : ""}</p>
        </Card>
      )}
      {currentJobId && (
        <AudioResultCard
          currentJobId={currentJobId}
          stage={stage}
          polling={polling}
          waitSeconds={waitSeconds}
          queuedTooLong={queuedTooLong}
          audioJob={audioJob}
          taskType={taskType}
          spec={spec}
          pollAudioJob={pollAudioJob}
        />
      )}

      {/* ── CỔNG PHÊ DUYỆT CHẶNG 06b ── */}
      <div className="space-y-2 pt-2">
        <StageGateApprovalBar
          stageCode="Chặng 06b — AUDIO & VOICEOVER"
          title="Phê duyệt Lồng tiếng AI & Nhạc nền Cảm xúc"
          description={`${spec.label}: nghe bản ở trên trước khi xác nhận; chủ shop xác nhận để tiến sang Tạo Biến thể ảnh Tiếp thị (Khu vực D).`}
          isApproved={audioJob?.stage === "COMPLETED"}
          approveLabel="Phê duyệt Audio & Chuyển sang Tạo Biến thể ảnh (Khu vực D) →"
          onApprove={() => navigateToArea("d")}
          metrics={[
            { label: "Tác vụ", value: spec.label },
            { label: "Thời lượng", value: `khoảng ${Math.round(totalDuration)} giây` },
            { label: "Nhạc nền", value: audioJob?.music_track_name ?? (effectiveMusic ? "Đã chọn" : "Không") },
            { label: "Giọng đọc", value: taskType === "VOICE_CLONE" ? "Giọng nhân bản" : spec.needsVoice ? selectedVoice?.displayName ?? "—" : "Không" },
          ]}
        />
        <div className="flex justify-between items-center text-caption text-text-muted pt-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => navigateToArea("b")}
            className="hover:text-text transition p-0 h-auto text-caption"
          >
            ← Quay lại Nội dung (Nội dung)
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => navigateToArea("f")}
            className="font-medium text-text-muted hover:text-text transition underline decoration-dotted p-0 h-auto text-caption"
          >
            ⚡ Đi thẳng đến Đóng gói chiến dịch (Chặng 07) →
          </Button>
        </div>
      </div>
    </div>
  )
}
