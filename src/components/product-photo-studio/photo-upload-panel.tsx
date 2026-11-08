"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { IconTile } from "@/components/ui/app-icon"
import { safeImageSrc } from "@/lib/safe-image-src"
import React, { useRef, useState } from "react"
import { CheckCircle } from "@/components/ui/icon-set/check-circle"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { XCircle } from "@/components/ui/icon-set/x-circle"

interface PhotoUploadPanelProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function PhotoUploadPanel({ onFileSelected, disabled }: PhotoUploadPanelProps) {
  const toast = useToast()
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileDetails, setFileDetails] = useState<{
    name: string
    size: string
    resolution?: string
    status: "pass" | "warn" | "fail"
    statusText: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng tải lên định dạng hình ảnh hợp lệ (JPG, PNG, WEBP).")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const img = new Image()
    img.src = objectUrl
    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      const resText = `${width} × ${height} px`
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB"

      let status: "pass" | "warn" | "fail" = "pass"
      let statusText = "Độ phân giải & chất lượng đạt chuẩn"

      if (width < 800 || height < 800) {
        status = "warn"
        statusText = "Ảnh nhỏ, hệ thống sẽ tự làm nét thêm"
      } else if (file.size > 15 * 1024 * 1024) {
        status = "fail"
        statusText = "Ảnh vượt quá 15MB, vui lòng nén bớt"
      }

      setFileDetails({
        name: file.name,
        size: sizeMb,
        resolution: resText,
        status,
        statusText,
      })

      onFileSelected(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      <Button variant="ghost"
        type="button"
        disabled={disabled}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`h-auto text-[length:inherit] font-[inherit] gap-0 block w-full relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01] hover:bg-primary/10"
            : "border-border hover:border-primary/50 bg-surface shadow-sm hover:bg-surface"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
      >

        {preview ? (
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-border shadow-xs bg-surface shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeImageSrc(preview)} alt="Ảnh sản phẩm gốc" className="w-full h-full object-contain" />
            </div>
            <div className="text-left space-y-1.5">
              <div className="font-semibold text-text text-body-sm">{fileDetails?.name}</div>
              <div className="text-caption text-text-muted">
                Kích thước: {fileDetails?.size} • Độ phân giải: {fileDetails?.resolution}
              </div>
              <div className="flex items-center gap-1.5 text-caption font-medium pt-1">
                {fileDetails?.status === "pass" && (
                  <span className="text-success-text flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {fileDetails.statusText}
                  </span>
                )}
                {fileDetails?.status === "warn" && (
                  <span className="text-warning-text flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {fileDetails.statusText}
                  </span>
                )}
                {fileDetails?.status === "fail" && (
                  <span className="text-danger-text flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> {fileDetails.statusText}
                  </span>
                )}
              </div>
              <div className="pt-2 text-caption text-primary font-medium hover:underline">
                Nhấp để chọn ảnh khác ↺
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <IconTile name="Upload" tone="rose" className="mx-auto w-20 h-20 sm:w-20 sm:h-20 [&>svg]:w-10 [&>svg]:h-10" />
            <div>
              <span className="block text-title-sm font-bold text-text">
                Kéo thả hoặc <span className="text-primary underline">chọn ảnh</span>
              </span>
              <span className="block text-caption text-text-muted mt-1">JPG, PNG, WEBP · tối đa 15MB</span>
            </div>
          </div>
        )}
      </Button>
    </div>
  )
}
