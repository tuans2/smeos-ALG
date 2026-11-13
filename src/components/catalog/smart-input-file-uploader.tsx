"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { safeImageSrc } from "@/lib/safe-image-src"
import React, { useRef } from "react"
import { UploadCloud, X } from "@/components/ui/icons"

interface SmartInputFileUploaderProps {
  imageFiles: File[]
  imagePreviewUrls: string[]
  saveToStore: boolean
  onAddFiles: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onToggleSaveToStore: (value: boolean) => void
}

export function SmartInputFileUploader({
  imagePreviewUrls,
  saveToStore,
  onAddFiles,
  onRemoveImage,
  onToggleSaveToStore,
}: SmartInputFileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    onAddFiles(files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      onAddFiles(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="h-auto w-full flex-col gap-0 font-[inherit] text-[length:inherit] border-2 border-dashed border-border hover:border-primary-border rounded-xl p-6 text-center bg-surface-alt/50 hover:bg-primary-muted/20 cursor-pointer transition-colors"
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary-muted flex items-center justify-center text-primary">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="text-body-sm font-semibold text-text">
            Kéo thả ảnh sản phẩm từ máy vào đây, hoặc{" "}
            <span className="text-primary underline">nhấp để chọn</span>
          </div>
          <p className="text-caption text-text-muted">
            Hỗ trợ PNG, JPG, WEBP. AI tự động tối ưu và căn chỉnh khổ đẹp chuẩn 2026.
          </p>
        </div>
      </Button>

      <label className="flex items-center gap-2 text-caption text-text-muted cursor-pointer hover:text-text">
        <Checkbox
          checked={saveToStore}
          onCheckedChange={(checked) => onToggleSaveToStore((checked === true))}
          className="rounded border-border text-primary focus:ring-primary"
        />
        <span>Tự động lưu các ảnh mới này vào Kho sản phẩm tiệm để tái sử dụng</span>
      </label>

      {imagePreviewUrls.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1">
          {imagePreviewUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative h-20 w-20 rounded-lg overflow-hidden border border-border group bg-surface"
            >
              <img
                src={safeImageSrc(url)}
                alt={`Ảnh sản phẩm ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <Button variant="ghost"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveImage(idx)
                }}
                className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 absolute top-1 right-1 h-5 w-5 rounded-full bg-danger text-surface flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity hover:bg-danger"
                aria-label="Xóa ảnh này"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
