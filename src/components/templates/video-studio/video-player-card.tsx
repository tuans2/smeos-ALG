"use client"

import React, { useState } from "react"
import { Play } from "@/components/ui/icon-set/play"
import { Pause } from "@/components/ui/icon-set/pause"
import { Download } from "@/components/ui/icon-set/download"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Volume2 } from "@/components/ui/icon-set/volume2"
import { VolumeX } from "@/components/ui/icon-set/volume-x"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"

export interface VideoPlayerCardProps {
  videoUrl?: string | undefined
  posterUrl?: string | undefined
  title?: string | undefined
  productName?: string | undefined
  price?: string | undefined
  onDownload?: (() => void) | undefined
  onShare?: (() => void) | undefined
}

/**
 * VideoPlayerCard (Thẻ khung chiếu video sản phẩm 9:16 M05)
 */
export function VideoPlayerCard({
  videoUrl,
  posterUrl,
  title = "Video ngắn giới thiệu sản phẩm",
  productName = "Sản phẩm thiết kế",
  price = "450.000đ",
  onDownload,
  onShare,
}: VideoPlayerCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const toast = useToast()
  const videoRef = React.useRef<HTMLVideoElement>(null)

  // 24/09/2026: bỏ ảnh bìa mẫu Unsplash — không có ảnh sản phẩm thì để nền trống.
  const effectivePoster = posterUrl || undefined

  // Tự động chuẩn hóa đường dẫn nội bộ nếu gặp domain giả lập cũ
  const normalizedVideoUrl = React.useMemo(() => {
    if (!videoUrl) return undefined
    const match = videoUrl.match(/org\/([^/]+)\/videos\/([^/?#]+)/)
    if (match) {
      return `/api/v1/storage/videos/${match[1]}/${match[2]}`
    }
    return videoUrl
  }, [videoUrl])

  const handleToggleMute = (e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    if (!videoRef.current) return
    const nextMuted = !videoRef.current.muted
    videoRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    if (!normalizedVideoUrl) {
      toast.info("Video chưa sẵn sàng hoặc đang render. Vui lòng quay lại sau ít giây.")
      return
    }
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.muted = isMuted
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((err) => {
            console.warn("Autoplay policy error, trying muted play:", err)
            if (videoRef.current) {
              videoRef.current.muted = true
              setIsMuted(true)
              videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch((playErr) => {
                  console.error("Không thể phát video:", playErr)
                  setIsPlaying(false)
                })
            }
          })
      }
    }
  }

  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between">
        <div>
          <div className="text-caption font-semibold text-text-muted">Video Studio Video Preview</div>
          <div className="text-title font-extrabold text-text">{title}</div>
        </div>
        <Badge tone="success">Chuẩn 9:16 Mobile</Badge>
      </div>

      <div className="group relative aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl border border-border bg-black shadow-lg">
        {normalizedVideoUrl ? (
          <video
            ref={videoRef}
            src={normalizedVideoUrl}
            poster={effectivePoster}
            playsInline
            controls={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="h-full w-full object-cover cursor-pointer"
            onClick={handleTogglePlay}
            loop
          />
        ) : effectivePoster ? (
          <img
              role="button"
              tabIndex={0}
            src={effectivePoster}
            alt={productName}
            className="h-full w-full object-cover cursor-pointer"
            onClick={handleTogglePlay}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-meta text-white/70">Chưa có video</div>
        )}

        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4 pointer-events-none transition-opacity duration-300 ${
            isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-caption font-bold text-white/90">@smeOS Studio</div>
            {normalizedVideoUrl && (
              <Button variant="ghost"
                type="button"
                onClick={handleToggleMute}
                className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition cursor-pointer"
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-body-sm font-extrabold text-white">{productName}</div>
            <div className="text-caption font-semibold text-accent-text">{price}</div>
            <div className="mt-1 flex items-center justify-center">
              <Button variant="ghost"
                type="button"
                onClick={handleTogglePlay}
                className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md hover:bg-white/40 transition hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                aria-label={isPlaying ? "Tạm dừng video" : "Phát video"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex items-center justify-between border-t border-border pt-4">
        <div className="text-caption text-text-muted">Định dạng MP4 1080x1920</div>
        <div className="flex items-center gap-2">
          {onShare && (
            <Button variant="secondary" size="sm" onClick={onShare} className="gap-1.5">
              <Share2 size={14} />
              Đăng TikTok
            </Button>
          )}
          {onDownload && (
            <Button size="sm" onClick={onDownload} className="gap-1.5">
              <Download size={14} />
              Tải MP4
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
