"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Music } from "@/components/ui/icon-set/music"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Upload } from "@/components/ui/icon-set/upload"

import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  fetchMusicTracks,
  removeMusicTrack,
  uploadMusicTrack,
  type MusicTrackItem,
} from "./audio-library-client"

const MOOD_LABEL: Record<string, string> = {
  romantic: "Lãng mạn",
  upbeat: "Sôi động",
  chill: "Thư giãn",
  warm: "Ấm áp",
  luxury: "Sang trọng",
}
const LICENSE_LABEL: Record<string, string> = {
  owned: "Tiệm sở hữu",
  royalty_free: "Royalty-free",
  licensed: "Đã mua giấy phép",
  creative_commons: "Creative Commons",
  original: "Sáng tác gốc",
}

/**
 * Thư viện nhạc nền Khu vực C (24/09/2026): chọn bài, nghe thử, xem giấy phép,
 * tiệm tự tải bài riêng (bắt buộc khai nguồn + cam kết quyền dùng).
 */
export function MusicLibraryPanel({
  value,
  onChange,
  required,
  preferredMood,
}: {
  value: string | null
  onChange: (trackId: string | null, track: MusicTrackItem | null, byUser?: boolean) => void
  required: boolean
  preferredMood?: string | undefined
}) {
  const [tracks, setTracks] = useState<MusicTrackItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mood, setMood] = useState<string>("all")
  const [showUpload, setShowUpload] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirm, confirmDialog] = useConfirmDialog()

  useEffect(() => {
    let cancelled = false
    fetchMusicTracks()
      .then((list) => {
        if (cancelled) return
        setTracks(list)
        // Chọn sẵn một bài hợp mood của chủ đề (ưu tiên bài đã xác minh giấy phép).
        if (!value && required) {
          const pick =
            list.find((t) => t.mood === preferredMood && t.license_verified) ??
            list.find((t) => t.mood === preferredMood) ??
            list.find((t) => t.license_verified) ??
            list[0]
          if (pick) onChange(pick.track_id, pick)
        }
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Không tải được thư viện nhạc"))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey])

  const visible = (tracks ?? []).filter((t) => mood === "all" || t.mood === mood)
  const selected = (tracks ?? []).find((t) => t.track_id === value) ?? null

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-body-sm font-bold text-text">
          <Music size={14} /> Nhạc nền {required ? "" : "(tuỳ chọn)"}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", ...Object.keys(MOOD_LABEL)].map((m) => (
            <Button
              key={m}
              type="button"
              size="xs"
              variant={mood === m ? "primary" : "outline"}
              onClick={() => setMood(m)}
              className="rounded-full"
            >
              {m === "all" ? "Tất cả" : MOOD_LABEL[m]}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="mb-2 text-meta text-danger">{error}</p>}
      {!tracks && !error && (
        <p className="flex items-center gap-2 text-meta text-text-muted">
          <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> Đang tải thư viện nhạc…
        </p>
      )}

      <RadioGroup
        aria-label="Nhạc nền"
        value={value ?? "NO_MUSIC"}
        onValueChange={(v) => {
          const track = tracks?.find((t) => t.track_id === v)
          if (track) onChange(track.track_id, track, true)
          else onChange(null, null, true)
        }}
        className="flex flex-col gap-2"
      >
        {!required && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-meta">
            <RadioGroupItem value="NO_MUSIC" />
            Không dùng nhạc nền
          </label>
        )}
        {visible.map((t) => {
          const isSelected = value === t.track_id
          return (
            <div
              key={t.track_id}
              className={`rounded-lg border px-3 py-2 ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-meta font-semibold text-text">
                  <RadioGroupItem value={t.track_id} />
                  {t.title}
                  <span className="font-normal text-text-muted">
                    · {MOOD_LABEL[t.mood] ?? t.mood}
                    {t.duration_seconds ? ` · ${Math.round(t.duration_seconds)}s` : ""}
                    {t.source === "org" ? " · nhạc của tiệm" : ""}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <Badge tone={t.license_verified ? "success" : "warning"}>
                    {t.license_verified ? LICENSE_LABEL[t.license_type] ?? t.license_type : "Chưa xác minh bản quyền"}
                  </Badge>
                  {t.source === "org" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      title="Gỡ bài này"
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: `Gỡ "${t.title}"?`,
                            consequence: "Bài nhạc này sẽ bị xoá khỏi thư viện của tiệm.",
                            confirmLabel: "Gỡ bài",
                            tone: "danger",
                          }))
                        ) {
                          return
                        }
                        await removeMusicTrack(t.track_id).catch((e: unknown) =>
                          setError(e instanceof Error ? e.message : "Không gỡ được")
                        )
                        if (value === t.track_id) onChange(null, null)
                        setReloadKey((k) => k + 1)
                      }}
                      className="text-danger p-1 h-7 w-7"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
              <audio controls preload="none" src={t.preview_url} className="mt-1.5 h-8 w-full" />
              <p className="mt-1 text-caption text-text-muted">Nguồn: {t.license_source}</p>
            </div>
          )
        })}
        {tracks && visible.length === 0 && (
          <p className="text-meta text-text-muted">Chưa có bài nào cho mood này — tải nhạc của tiệm lên bên dưới.</p>
        )}
      </RadioGroup>

      {selected && !selected.license_verified && (
        <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-meta text-warning-text">
          Bài này chưa có hồ sơ giấy phép thương mại. Chỉ nên dùng để thử — trước khi đăng quảng cáo hãy chọn bài đã xác
          minh hoặc tải nhạc tiệm có giấy phép.
        </p>
      )}

      <div className="mt-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowUpload((s) => !s)}>
          <Upload size={13} /> {showUpload ? "Đóng" : "Tải nhạc của tiệm"}
        </Button>
        {showUpload && (
          <MusicUploadForm
            onDone={(t) => {
              setShowUpload(false)
              setReloadKey((k) => k + 1)
              onChange(t.track_id, t, true)
            }}
          />
        )}
      </div>
      {confirmDialog}
    </Card>
  )
}

function MusicUploadForm({ onDone }: { onDone: (t: MusicTrackItem) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [mood, setMood] = useState("romantic")
  const [licenseType, setLicenseType] = useState("licensed")
  const [licenseSource, setLicenseSource] = useState("")
  const [attest, setAttest] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!file) return setError("Chọn tệp nhạc (MP3/WAV/M4A, tối đa 20MB)")
    setBusy(true)
    setError(null)
    try {
      onDone(await uploadMusicTrack({ file, title, mood, licenseType, licenseSource, attest }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2">
      <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-caption sm:col-span-2" />
      <Input inputSize="sm" placeholder="Tên bài" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Select value={mood} onValueChange={setMood}>
        <SelectTrigger className="h-9 text-caption"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(MOOD_LABEL).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={licenseType} onValueChange={setLicenseType}>
        <SelectTrigger className="h-9 text-caption"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="licensed">Đã mua giấy phép</SelectItem>
          <SelectItem value="royalty_free">Royalty-free (có điều khoản thương mại)</SelectItem>
          <SelectItem value="owned">Tiệm sở hữu / tự sáng tác</SelectItem>
          <SelectItem value="creative_commons">Creative Commons cho phép thương mại</SelectItem>
        </SelectContent>
      </Select>
      <Input inputSize="sm" placeholder="Nguồn: nơi mua, mã giấy phép hoặc đường dẫn" value={licenseSource} onChange={(e) => setLicenseSource(e.target.value)} />
      <label className="flex items-start gap-2 text-caption text-text-muted sm:col-span-2 cursor-pointer">
        <Checkbox checked={attest} onCheckedChange={(checked) => setAttest(checked === true)} className="mt-0.5" />
        <span>Tôi xác nhận tiệm có quyền dùng bài này trong video/bài quảng cáo trên mạng xã hội, và thông tin nguồn ở trên là đúng.</span>
      </label>
      {error && <p className="text-meta text-danger sm:col-span-2">{error}</p>}
      <Button size="sm" onClick={submit} disabled={busy || !attest} className="gap-1.5 sm:col-span-2">
        {busy ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Upload size={13} />} Tải lên thư viện của tiệm
      </Button>
    </div>
  )
}
