"use client"

import React, { useState, useRef } from "react"
import { Video } from "@/components/ui/icon-set/video"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { PhotoUploadGuidance, VIDEO_GUIDANCE, QR_GUIDANCE } from "./photo-upload-guidance"
import { uploadBrandAsset } from "./upload-brand-asset"

export interface BrandVideoQrSectionProps {
  introVideo: string
  qrCode: string
  onVideoChange: (videoUrl: string) => void
  onQrChange: (qrUrl: string) => void
  disabled?: boolean
  onError: (msg: string) => void
}

export function BrandVideoQrSection({
  introVideo,
  qrCode,
  onVideoChange,
  onQrChange,
  disabled = false,
  onError,
}: BrandVideoQrSectionProps) {
  const [videoUploading, setVideoUploading] = useState(false)
  const [qrUploading, setQrUploading] = useState(false)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoUploading(true)
    try {
      const { viewUrl } = await uploadBrandAsset(file)
      onVideoChange(viewUrl)
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Tải video thất bại")
    } finally {
      setVideoUploading(false)
      if (videoInputRef.current) videoInputRef.current.value = ""
    }
  }

  const handleQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    try {
      const { viewUrl } = await uploadBrandAsset(file)
      onQrChange(viewUrl)
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Tải mã QR thất bại")
    } finally {
      setQrUploading(false)
      if (qrInputRef.current) qrInputRef.current.value = ""
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Video Intro / Outro */}
      <div className="rounded-xl border border-border bg-surface-alt p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-body font-bold text-text flex items-center gap-2">
            <Video size={16} className="text-primary" />
            <span>Video Intro/Outro (3-5s)</span>
          </h4>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoFile}
            className="hidden"
            disabled={disabled || videoUploading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || videoUploading}
            onClick={() => videoInputRef.current?.click()}
            className="text-caption font-bold text-primary hover:underline disabled:opacity-50 h-auto p-0 hover:bg-transparent"
          >
            {videoUploading ? "Đang tải..." : introVideo ? "Thay đổi" : "Tải lên"}
          </Button>
        </div>
        <p className="text-caption text-text-muted mb-3">
          Tự động ghép vào đầu hoặc cuối các video quay sản phẩm hoa trên TikTok/Reels.
        </p>
        <PhotoUploadGuidance
          currentCount={introVideo ? 1 : 0}
          tier={VIDEO_GUIDANCE.tier}
          categoryLabel={VIDEO_GUIDANCE.categoryLabel}
          benefits={VIDEO_GUIDANCE.benefits}
          tips={VIDEO_GUIDANCE.tips}
        />
        {introVideo ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-16/9">
            <video src={introVideo} controls className="h-full w-full object-contain" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xóa video nhận diện"
              title="Xóa video nhận diện"
              onClick={() => onVideoChange("")}
              className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-surface/80 p-1 text-danger hover:bg-surface transition-colors"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ) : (
          <div className="aspect-16/9 rounded-xl border border-dashed border-border flex items-center justify-center text-caption text-text-muted">
            Chưa có video nhận diện
          </div>
        )}
      </div>

      {/* Mã QR Zalo */}
      <div className="rounded-xl border border-border bg-surface-alt p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-body font-bold text-text flex items-center gap-2">
            <QrCode size={16} className="text-primary" />
            <span>Mã QR Zalo của tiệm</span>
          </h4>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleQrFile}
            className="hidden"
            disabled={disabled || qrUploading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || qrUploading}
            onClick={() => qrInputRef.current?.click()}
            className="text-caption font-bold text-primary hover:underline disabled:opacity-50 h-auto p-0 hover:bg-transparent"
          >
            {qrUploading ? "Đang tải..." : qrCode ? "Thay đổi" : "Tải lên"}
          </Button>
        </div>
        <p className="text-caption text-text-muted mb-3">
          Khách bấm &quot;Mã QR&quot; trên trang đặt hoa sẽ thấy mã này để kết nối Zalo với tiệm. Không tải mã QR ngân hàng vào đây.
        </p>
        <PhotoUploadGuidance
          currentCount={qrCode ? 1 : 0}
          tier={QR_GUIDANCE.tier}
          categoryLabel={QR_GUIDANCE.categoryLabel}
          benefits={QR_GUIDANCE.benefits}
          tips={QR_GUIDANCE.tips}
        />
        {qrCode ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-surface aspect-16/9 flex items-center justify-center p-2">
            <img src={qrCode} alt="Mã QR Zalo" className="max-h-full max-w-full object-contain" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Xóa mã QR"
              title="Xóa mã QR"
              onClick={() => onQrChange("")}
              className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-surface/80 p-1 text-danger hover:bg-surface transition-colors"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ) : (
          <div className="aspect-16/9 rounded-xl border border-dashed border-border flex items-center justify-center text-caption text-text-muted">
            Chưa có mã QR
          </div>
        )}
      </div>
    </div>
  )
}
