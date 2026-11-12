"use client"

import { Clock } from "@/components/ui/icon-set/clock"
import { Coins } from "@/components/ui/icon-set/coins"
import { Film } from "@/components/ui/icon-set/film"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  VideoFormat,
  VIDEO_FORMAT_SPECS,
  CaptionStyle,
  CAPTION_STYLE_SPECS,
  type VideoSceneItem,
} from "@/modules/video-studio/domain/video-types"

export const VIDEO_VOICES: Array<{ code: string; label: string }> = [
  { code: "vi-VN-Standard-A", label: "Nữ truyền cảm" },
  { code: "vi-VN-Standard-C", label: "Nữ trẻ trung" },
  { code: "vi-VN-Standard-B", label: "Nam ấm áp" },
  { code: "none", label: "Không lồng tiếng (chỉ nhạc)" },
]

export function VideoConfigCard({
  format,
  setFormat,
  setScenes,
  title,
  setTitle,
  voiceCode,
  setVoiceCode,
  captionStyle,
  setCaptionStyle,
  hasSubtitle,
  setHasSubtitle,
  hasWatermark,
  setHasWatermark,
  renderCredit,
}: {
  format: VideoFormat
  setFormat: (f: VideoFormat) => void
  setScenes: React.Dispatch<React.SetStateAction<VideoSceneItem[]>>
  title: string
  setTitle: (t: string) => void
  voiceCode: string
  setVoiceCode: (v: string) => void
  captionStyle: CaptionStyle
  setCaptionStyle: (cs: CaptionStyle) => void
  hasSubtitle: boolean
  setHasSubtitle: (s: boolean) => void
  hasWatermark: boolean
  setHasWatermark: (w: boolean) => void
  renderCredit: number
}) {
  return (
    <>
      <Card className="p-5">
        <h3 className="text-body-sm font-bold text-text mb-3 flex items-center gap-2">
          <Film size={14} /> Khuôn định dạng
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(VIDEO_FORMAT_SPECS) as VideoFormat[]).map((fmtKey) => {
            const s = VIDEO_FORMAT_SPECS[fmtKey]
            const sel = format === fmtKey
            return (
              <Button
                variant="ghost"
                key={fmtKey}
                aria-pressed={sel}
                onClick={() => {
                  setFormat(fmtKey)
                  setScenes([])
                }}
                className={`h-auto whitespace-normal font-normal flex-col items-stretch justify-start gap-0 w-full text-left rounded-xl border p-3 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  sel ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-surface hover:border-border-hover"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-caption font-bold text-text">{s.label}</span>
                  <Badge tone={sel ? "success" : "neutral"} className="text-caption px-1.5 py-0">
                    {s.aspectRatio}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-caption text-text-muted mt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> khoảng {s.targetDurationSeconds} giây
                  </span>
                  <span
                    className="font-semibold text-warning-text flex items-center gap-0.5"
                    title="Credit ghép khi bấm Dựng video — cộng giá clip nhà cung cấp mỗi cảnh"
                  >
                    <Coins size={11} /> từ {renderCredit} cr
                  </span>
                </div>
              </Button>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-body-sm font-bold text-text mb-3">Cấu hình cơ bản</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-caption font-semibold text-text-muted block mb-1">Tiêu đề</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-caption"
            />
          </div>
          <div>
            <label className="text-caption font-semibold text-text-muted block mb-1">Giọng đọc lồng tiếng</label>
            <Select value={voiceCode} onValueChange={(v: string) => setVoiceCode(v)}>
              <SelectTrigger className="text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_VOICES.map((v) => (
                  <SelectItem key={v.code} value={v.code}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-caption text-text-muted">
              Đọc đúng lời thoại từng cảnh của storyboard (cùng kịch bản với Âm thanh), khớp thời lượng từng cảnh; nhạc nền tự hạ âm lượng khi có giọng.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-caption font-semibold text-text-muted block mb-1">Phụ đề</label>
              <Select value={captionStyle} onValueChange={(v: CaptionStyle) => setCaptionStyle(v)}>
                <SelectTrigger className="text-caption">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CAPTION_STYLE_SPECS) as CaptionStyle[]).map((cs) => (
                    <SelectItem key={cs} value={cs}>
                      {CAPTION_STYLE_SPECS[cs].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={hasSubtitle} onCheckedChange={(val) => setHasSubtitle(!!val)} />
              <span className="text-caption text-text">Phụ đề</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={hasWatermark} onCheckedChange={(val) => setHasWatermark(!!val)} />
              <span className="text-caption text-text">Watermark</span>
            </label>
          </div>
        </div>
      </Card>
    </>
  )
}
