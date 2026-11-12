"use client"

import { Button } from "@/components/ui/button"
import React, { useRef, useState } from "react"
import Image from "next/image"
import { Camera, CheckCircle2, Image as ImageIcon, Loader2, RefreshCw } from "@/components/ui/icons"

interface PaymentProofUploaderProps {
  sendCode: string
  purpose: "DEPOSIT" | "BALANCE"
  onUploaded: (assetId: string, url: string) => void
  onRemoved: () => void
  disabled?: boolean
}

export function PaymentProofUploader({
  sendCode,
  purpose,
  onUploaded,
  onRemoved,
  disabled = false,
}: PaymentProofUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ảnh vượt quá kích thước 5MB. Vui lòng chọn ảnh nhỏ hơn.")
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("purpose", purpose)

      const res = await fetch(`/api/v1/public/brochure/${sendCode}/payment-proof`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error?.message || data?.message || "Không thể tải ảnh lên, vui lòng thử lại"
        throw new Error(msg)
      }

      const result = (await res.json()) as { assetId: string; url: string }
      setIsSuccess(true)
      onUploaded(result.assetId, result.url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Tải ảnh thất bại")
      setPreviewUrl(null)
      onRemoved()
    } finally {
      setUploading(false)
    }
  }

  function handleReset() {
    setPreviewUrl(null)
    setIsSuccess(false)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onRemoved()
  }

  return (
    <div className="w-full flex flex-col gap-2.5 my-2 text-left">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Dòng hướng dẫn */}
      <div className="rounded-xl p-3 bg-surface border border-border flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-caption font-bold text-primary uppercase tracking-wider">
          <Camera size={14} />
          <span>Ảnh chụp chuyển khoản</span>
        </div>
        <p className="text-body-sm text-text-muted leading-relaxed">
          Sau khi chuyển khoản, vui lòng chụp ảnh màn hình giao dịch thành công và tải lên bên dưới để cửa hàng đối soát nhanh nhất.
        </p>
      </div>

      {/* Khung upload / preview */}
      {previewUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0 bg-surface-alt flex items-center justify-center">
            <Image
              src={previewUrl}
              alt="Ảnh chuyển khoản"
              fill
              unoptimized
              className="object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-bg/60 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin motion-reduce:animate-none text-primary" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {uploading ? (
              <p className="text-caption font-medium text-text-muted">Đang tải ảnh lên...</p>
            ) : isSuccess ? (
              <div className="flex items-center gap-1 text-caption font-bold text-success">
                <CheckCircle2 size={15} />
                <span>Đã tải ảnh thành công</span>
              </div>
            ) : null}

            <Button variant="ghost"
              type="button"
              onClick={handleReset}
              disabled={uploading || disabled}
              className="h-auto p-0 inline-flex items-center gap-1 text-caption text-primary hover:text-primary-dark font-medium underline cursor-pointer disabled:opacity-50 mt-1 self-start"
            >
              <RefreshCw size={12} />
              <span>Đổi ảnh khác</span>
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="text-[length:inherit] h-auto font-[inherit] w-full p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-center"
        >
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <ImageIcon size={20} />
          </div>
          <div>
            <span className="text-body-sm font-bold text-text block">
              Bấm để tải ảnh chuyển khoản
            </span>
            <span className="text-caption text-text-muted block mt-0.5">
              JPG, PNG hoặc WebP · Tối đa 5MB
            </span>
          </div>
        </Button>
      )}

      {uploadError && (
        <p role="alert" className="text-caption text-danger font-medium">
          {uploadError}
        </p>
      )}
    </div>
  )
}
