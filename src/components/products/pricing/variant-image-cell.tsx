"use client"

import React, { useRef, useState } from "react"
import { ImagePlus } from "@/components/ui/icon-set/image-plus"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import { uploadImageFile } from "../ai-product-helpers"

interface Props {
  label: string
  assetId: string | null
  onChange: (assetId: string | null) => void
}

/** Ảnh riêng của một phiên bản: tải lên kho ảnh, lưu mã ảnh (máy chủ ký đường dẫn khi khách xem). */
export function VariantImageCell({ label, assetId, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const uploaded = await uploadImageFile(file)
      onChange(uploaded.assetId)
    } catch {
      setError("Tải ảnh lỗi")
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-1">
      {assetId ? (
        <>
          {/* Không dựng ảnh từ file vừa chọn trên máy (CodeQL: DOM text → HTML); khách thấy ảnh đã ký từ kho */}
          <span className="text-caption font-semibold text-success">Đã có ảnh</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Bỏ ảnh ${label}`}
            onClick={() => onChange(null)}
            className="h-6 w-6 rounded-full p-1 text-text-muted hover:text-danger hover:bg-transparent"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => ref.current?.click()}
          aria-label={`Thêm ảnh ${label}`}
          className="inline-flex h-9 items-center gap-1 px-2 text-caption font-semibold"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {busy ? "Đang tải…" : "Ảnh"}
        </Button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      {error && <span className="text-caption text-danger">{error}</span>}
    </div>
  )
}
