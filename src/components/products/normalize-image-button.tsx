"use client"

import React from "react"
import { Wand2 } from "@/components/ui/icon-set/wand2"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"
import { useNormalizeImage } from "./use-normalize-image"

interface NormalizeImageButtonProps {
  /** File ảnh đang có trong form (chưa upload) */
  imageFile?: File | null | undefined
  /** Asset ID đã có (trang chi tiết sản phẩm) */
  existingAssetId?: string | null | undefined
  /** URL ảnh sẵn có (trang chi tiết) — hook tự fetch & upload */
  imageUrl?: string | null | undefined
  industry: IndustryPluginContract
  /** Callback khi user chọn dùng ảnh đã chuẩn hóa thay thế ảnh gốc */
  onAccept?: (resultUrl: string) => void
  className?: string
}

/**
 * Nút "Chuẩn hóa ảnh sản phẩm" — gọi pipeline background OpenAI studio
 * và hiển thị preview để user xem trước trước khi chấp nhận thay thế ảnh gốc.
 *
 * Điều kiện hiển thị: phải có `imageFile` hoặc `existingAssetId`.
 */
export function NormalizeImageButton({
  imageFile,
  existingAssetId,
  imageUrl,
  industry,
  onAccept,
  className,
}: NormalizeImageButtonProps) {
  const { normalize, reset, status, resultUrl, errorMsg, isLoading } = useNormalizeImage({
    imageFile,
    existingAssetId,
    imageUrl,
    industry,
  })

  const hasSource = !!imageFile || !!existingAssetId || !!imageUrl

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {/* Nút chính */}
      {status !== "succeeded" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void normalize()}
          disabled={isLoading || !hasSource}
          className="flex items-center gap-1.5 text-body-sm font-semibold border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            !hasSource
              ? "Hãy chọn ảnh sản phẩm trước"
              : `Chuẩn hóa thành ảnh studio: ${industry.aiConfig.studioBackgroundStyles[0] ?? "phong cách chuyên nghiệp"}`
          }
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
              {status === "uploading" ? "Đang tải ảnh..." : "Đang xử lý..."}
            </>
          ) : (
            <>
              <Wand2 size={14} />
              Chuẩn hóa ảnh sản phẩm
            </>
          )}
        </Button>
      )}

      {/* Trạng thái lỗi */}
      {status === "error" && errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-caption text-danger">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={reset}
            aria-label="Thử lại"
            className="h-6 w-6 flex-shrink-0 hover:text-danger/80 transition-colors"
          >
            <RefreshCw size={12} />
          </Button>
        </div>
      )}

      {/* Preview ảnh kết quả — so sánh & chọn */}
      {status === "succeeded" && resultUrl && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-caption font-semibold text-success">
            <CheckCircle2 size={13} />
            <span>Ảnh đã được chuẩn hóa thành công!</span>
          </div>

          <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border border-border shadow-sm">
            <img
              src={resultUrl}
              alt="Ảnh sản phẩm sau khi chuẩn hóa studio"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onAccept?.(resultUrl)}
              className="flex-1 flex items-center justify-center gap-1.5 text-caption font-bold"
            >
              <CheckCircle2 size={13} />
              Dùng ảnh này
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={reset}
              aria-label="Bỏ qua ảnh đã chuẩn hóa"
              className="h-9 w-9 rounded-lg"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
