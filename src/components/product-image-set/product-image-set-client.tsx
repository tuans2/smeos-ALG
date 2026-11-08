"use client"

import React, { useState } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { PhotoUploadPanel } from "@/components/product-photo-studio/photo-upload-panel"
import { BundleSelector } from "@/components/product-image-set/bundle-selector"
import { ImageSetViewer } from "@/components/product-image-set/image-set-viewer"
import { useI18n } from "@/lib/i18n"
import { parseCreatedJob, parsePolledJob } from "@/components/generation-job/generation-job-logic"
import type { ProductImageSetResult } from "@/modules/product-image-set/use-cases/get-product-image-set-result"
import { ToolHero } from "@/components/ui/tool-hero"

export function ProductImageSetClient() {
  const { t, dict } = useI18n()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const toast = useToast()
  const [bundleId, setBundleId] = useState("omnichannel_default")
  const [customNote, setCustomNote] = useState("")

  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<ProductImageSetResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePhotoSelected = (file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setJobResult(null)
    setErrorMsg(null)
  }

  const handleStartGenerateSet = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setErrorMsg(null)

    try {
      // 1. Tải ảnh lên kho theo chuẩn hệ thống: upload-url -> PUT -> POST /api/v1/assets
      const { uploadBrandAsset } = await import("@/components/profiles/upload-brand-asset")
      const { assetId } = await uploadBrandAsset(selectedFile)

      setIsUploading(false)
      setIsProcessing(true)

      // 2. Tạo job sinh bộ ảnh biến thể
      const res = await fetch("/api/v1/product-image-set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `image-set-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        },
        body: JSON.stringify({
          asset_id: assetId,
          bundle_id: bundleId,
          custom_note: customNote,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Không thể tạo bộ ảnh thương mại")
      }

      // API trả `{ job_id, … }` (không bọc `data`) — đọc lệch khiến công cụ không bao giờ ra kết quả (audit đợt A-1).
      const created = parseCreatedJob(await res.json().catch(() => null))
      if (!created) throw new Error("Hệ thống chưa xác nhận đã nhận yêu cầu. Hãy thử lại sau ít phút.")
      const data = { jobId: created.jobId }
      setJobId(data.jobId)

      // Polling job
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/v1/product-image-set/${data.jobId}`)
          if (pollRes.ok) {
            const polled = parsePolledJob<ProductImageSetResult>(await pollRes.json())
            if (polled.state === "succeeded" && polled.result) {
              clearInterval(pollInterval)
              setIsProcessing(false)
              setJobResult(polled.result)
            } else if (polled.state === "failed") {
              clearInterval(pollInterval)
              setIsProcessing(false)
              setErrorMsg(polled.error || "Xử lý bộ ảnh thất bại.")
            }
          }
        } catch {
          // Poll retry
        }
      }, 2500)
    } catch (err: unknown) {
      setIsUploading(false)
      setIsProcessing(false)
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo bộ ảnh.")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToolHero icon="Images" tone="rose" title="Bộ ảnh đa kênh" detail="Từ một ảnh, nhận đủ bộ ảnh nhiều tỉ lệ cho sàn thương mại, bài đăng và Story." />

      <FeatureGuidanceCard
        tag="HƯỚNG DẪN"
        title="Một ảnh gốc → Đủ bộ ảnh cho mọi kênh bán hàng"
        description="Từ 1 ảnh chụp chuẩn, AI sẽ tự động tạo đủ bộ ảnh cho sàn TMĐT (1:1), bài đăng MXH (4:5), Story/Reels (9:16) và ảnh cận cảnh với cam kết 100% cùng một sản phẩm."
        tips={[
          "📸 Khuyên dùng ảnh đã qua xử lý chuẩn từ công cụ Ảnh sản phẩm studio",
          "✨ Mặc định tạo trọn gói 'Bộ Đăng Bán Đa Kênh'",
          "🔒 Tự động kiểm định tính nhất quán cả bộ (Set Consistency)",
        ]}
      />

      {errorMsg && (
        <div className="p-4 rounded-xl bg-danger-bg border border-danger-border text-danger text-caption font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Upload & Configure Flow */}
      {!jobResult && !isProcessing && (
        <div className="space-y-6">
          <PhotoUploadPanel
            onFileSelected={handlePhotoSelected}
            disabled={isUploading || isProcessing}
          />

          {selectedFile && (
            <>
              <BundleSelector
                selectedBundleId={bundleId}
                customNote={customNote}
                onBundleChange={setBundleId}
                onCustomNoteChange={setCustomNote}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  disabled={isUploading || isProcessing}
                  onClick={handleStartGenerateSet}
                  className="px-6 py-3 h-auto rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-body-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Tạo trọn bộ ảnh ngay ✨
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="p-12 rounded-2xl border border-primary/20 bg-primary-subtle/30 text-center space-y-4 max-w-md mx-auto my-6 shadow-xs">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin motion-reduce:animate-none" />
          <div>
            <div className="font-bold text-text text-body">
              AI đang sinh bộ ảnh đa kênh & kiểm định nhất quán...
            </div>
            <div className="text-caption text-text-muted mt-1">
              Đang xuất các tỉ lệ 1:1, 4:5, 9:16 và đối chiếu độ trung thực sản phẩm.
            </div>
          </div>
        </div>
      )}

      {/* Result Display */}
      {jobResult && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setJobResult(null)
                setSelectedFile(null)
                setPreviewUrl(null)
              }}
              className="h-auto p-0 text-caption font-semibold text-text-muted hover:text-text flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tạo bộ ảnh sản phẩm khác
            </Button>
          </div>

          <ImageSetViewer
            originalUrl={jobResult.originalUrl || previewUrl || ""}
            result={jobResult}
            onUseInCatalog={() => {
              toast.success("Đã lưu bộ ảnh vào Thư viện và sẵn sàng gắn vào Catalog!")
            }}
          />
        </div>
      )}
    </div>
  )
}
