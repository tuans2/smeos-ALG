"use client"

import React, { useState, useRef } from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { PhotoUploadGuidance, STOREFRONT_GUIDANCE } from "./photo-upload-guidance"
import { uploadBrandAsset } from "./upload-brand-asset"

export interface BrandStorefrontSectionProps {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  disabled?: boolean
  onError: (msg: string) => void
}

export function BrandStorefrontSection({
  photos,
  onPhotosChange,
  disabled = false,
  onError,
}: BrandStorefrontSectionProps) {
  const [photoUploading, setPhotoUploading] = useState(false)
  const storefrontInputRef = useRef<HTMLInputElement>(null)

  const handleStorefrontFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setPhotoUploading(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        if (photos.length + newUrls.length >= 8) break
        const f = files[i]
        if (!f) continue
        const { viewUrl } = await uploadBrandAsset(f)
        newUrls.push(viewUrl)
      }
      onPhotosChange([...photos, ...newUrls])
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Tải ảnh không gian thất bại")
    } finally {
      setPhotoUploading(false)
      if (storefrontInputRef.current) storefrontInputRef.current.value = ""
    }
  }

  const handleRemovePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, idx) => idx !== index))
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-body font-bold text-text flex items-center gap-2">
            <span>Ảnh Không gian tiệm & Nghệ nhân</span>
            <span className="text-caption px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
              {photos.length}/8 ảnh
            </span>
          </h4>
          <p className="text-caption text-text-muted mt-0.5">
            Dùng làm banner trang giới thiệu, album Showroom và tăng uy tín thương hiệu
          </p>
        </div>

        {photos.length < 8 && (
          <div>
            <input
              ref={storefrontInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleStorefrontFiles}
              className="hidden"
              disabled={disabled || photoUploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || photoUploading}
              onClick={() => storefrontInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-body-sm font-semibold text-text hover:border-primary transition-colors disabled:opacity-50"
            >
              {photoUploading ? <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> : <Plus size={14} />}
              <span>Thêm ảnh</span>
            </Button>
          </div>
        )}
      </div>

      <PhotoUploadGuidance
        currentCount={photos.length}
        tier={STOREFRONT_GUIDANCE.tier}
        categoryLabel={STOREFRONT_GUIDANCE.categoryLabel}
        benefits={STOREFRONT_GUIDANCE.benefits}
        tips={STOREFRONT_GUIDANCE.tips}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((url, idx) => (
          <div
            key={idx}
            className="group relative aspect-4/3 rounded-xl border border-border overflow-hidden bg-surface"
          >
            <img src={url} alt={`Không gian ${idx + 1}`} className="h-full w-full object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemovePhoto(idx)}
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-lg bg-surface/80 p-1 text-text-muted hover:text-danger hover:bg-surface transition-colors"
              title="Xóa ảnh"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}

        {photos.length === 0 && (
          <div className="col-span-2 sm:col-span-4 py-6 border border-dashed border-border rounded-xl text-center">
            <p className="text-caption text-text-muted">Chưa có ảnh không gian nào — Bấm &quot;Thêm ảnh&quot; để tải lên 2-4 ảnh</p>
          </div>
        )}
      </div>
    </div>
  )
}
