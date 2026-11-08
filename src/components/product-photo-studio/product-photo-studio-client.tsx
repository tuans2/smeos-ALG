"use client"

import React, { useState } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { PhotoUploadPanel } from "@/components/product-photo-studio/photo-upload-panel"
import { PresetSelector } from "@/components/product-photo-studio/preset-selector"
import { EnhanceResultViewer } from "@/components/product-photo-studio/enhance-result-viewer"
import { useI18n } from "@/lib/i18n"
import { parseCreatedJob, parsePolledJob } from "@/components/generation-job/generation-job-logic"
import type { ProductPhotoResult } from "@/modules/product-photo-studio/use-cases/get-product-photo-result"
import { ToolHero } from "@/components/ui/tool-hero"

export function ProductPhotoStudioClient() {
  const { t, dict } = useI18n()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const toast = useToast()
  const [presetId, setPresetId] = useState("auto")
  const [ratioId, setRatioId] = useState("auto")
  const [customNote, setCustomNote] = useState("")

  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<ProductPhotoResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePhotoSelected = (file: File) => {
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setJobResult(null)
    setErrorMsg(null)
  }

  const handleStartEnhance = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setErrorMsg(null)

    try {
      // 1. Tải ảnh lên kho theo chuẩn hệ thống: upload-url -> PUT -> POST /api/v1/assets
      const { uploadBrandAsset } = await import("@/components/profiles/upload-brand-asset")
      const { assetId } = await uploadBrandAsset(selectedFile)

      // 2. Tạo job xử lý ảnh với provider single-call
      setIsUploading(false)
      setIsProcessing(true)

      const enhanceRes = await fetch("/api/v1/product-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `photo-enhance-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        },
        body: JSON.stringify({
          asset_id: assetId,
          preset_id: presetId,
          aspect_ratio: ratioId,
          custom_note: customNote,
        }),
      })

      if (!enhanceRes.ok) {
        const err = await enhanceRes.json().catch(() => ({}))
        throw new Error(err.message || "Không thể khởi tạo tiến trình xử lý ảnh.")
      }

      // API trả `{ job_id, … }` (không bọc `data`) — đọc lệch khiến công cụ không bao giờ ra kết quả (audit pilot).
      const created = parseCreatedJob(await enhanceRes.json().catch(() => null))
      if (!created) throw new Error("Hệ thống chưa xác nhận đã nhận yêu cầu. Hãy thử lại sau ít phút.")
      const data = { jobId: created.jobId }
      setJobId(data.jobId)

      // Polling job status
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/v1/product-photo/${data.jobId}`)
          if (pollRes.ok) {
            const polled = parsePolledJob<ProductPhotoResult>(await pollRes.json())
            if (polled.state === "succeeded" && polled.result) {
              clearInterval(pollInterval)
              setIsProcessing(false)
              setJobResult(polled.result)
            } else if (polled.state === "failed") {
              clearInterval(pollInterval)
              setIsProcessing(false)
              setErrorMsg(polled.error || "Xử lý ảnh thất bại. Vui lòng thử lại.")
            }
          }
        } catch {
          // Poll retry silently
        }
      }, 2000)
    } catch (err: unknown) {
      setIsUploading(false)
      setIsProcessing(false)
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra trong quá trình xử lý.")
    }
  }

  const handleRetry = async (retryHint?: string) => {
    if (retryHint) {
      setCustomNote((prev) => (prev ? `${prev}. ${retryHint}` : retryHint))
    }
    await handleStartEnhance()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToolHero icon="Camera" tone="rose" title="Ảnh sản phẩm studio" detail="Biến ảnh chụp bằng điện thoại thành ảnh studio đạt chuẩn sàn thương mại." />

      <FeatureGuidanceCard
        tag="HƯỚNG DẪN"
        title="Chụp ảnh thô → Tải lên → Nhận ảnh studio hoàn chỉnh"
        description="Chỉ cần tải ảnh lên, hệ thống sẽ tự động tối ưu ánh sáng, xóa bỏ phông nền lộn xộn và đổ bóng studio mà vẫn giữ nguyên 100% hình thái sản phẩm."
        tips={[
          "📸 Chụp sản phẩm rõ nét, đủ sáng, tránh bị che khuất",
          "🎯 Sản phẩm nằm trọn trong khung hình (chiếm 60-80%)",
          "✨ Mặc định tự động chọn phông nền & tỉ lệ tối ưu",
        ]}
      />

      {errorMsg && (
        <div className="p-4 rounded-xl bg-danger-bg border border-danger-border text-danger text-caption font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Main Flow: Upload & Configure */}
      {!jobResult && !isProcessing && (
        <div className="space-y-6">
          <PhotoUploadPanel
            onFileSelected={handlePhotoSelected}
            disabled={isUploading || isProcessing}
          />

          {selectedFile && (
            <>
              <PresetSelector
                selectedPreset={presetId}
                selectedRatio={ratioId}
                customNote={customNote}
                onPresetChange={setPresetId}
                onRatioChange={setRatioId}
                onCustomNoteChange={setCustomNote}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  disabled={isUploading || isProcessing}
                  onClick={handleStartEnhance}
                  className="px-6 py-3 h-auto rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-body-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Tạo ảnh chuyên nghiệp ✨
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
              AI đang hoàn thiện ảnh sản phẩm studio...
            </div>
            <div className="text-caption text-text-muted mt-1">
              Đang tối ưu ánh sáng, xóa phông nền và đối chiếu chuẩn kiểm định QC.
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
              <RefreshCw className="w-3.5 h-3.5" /> Tạo ảnh sản phẩm khác
            </Button>
          </div>

          <EnhanceResultViewer
            originalUrl={jobResult.originalUrl || previewUrl || ""}
            masterUrl={jobResult.masterUrl || previewUrl || ""}
            qcEvaluation={jobResult.qcEvaluation}
            onRetry={handleRetry}
            onApprove={() => {
              toast.success("Ảnh đã được lưu và sẵn sàng sử dụng cho catalog & bài viết bán hàng!")
            }}
            isRetrying={isProcessing}
          />
        </div>
      )}
    </div>
  )
}
