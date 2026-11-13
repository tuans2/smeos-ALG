"use client"

import React from "react"
import { Upload } from "@/components/ui/icon-set/upload"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { X } from "@/components/ui/icon-set/x"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { safeImageSrc } from "@/lib/safe-image-src"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"
import type { TerminologyGetter } from "./create-product-types"
import { SingleSelectCustom } from "./single-select-custom"
import { NormalizeImageButton } from "./normalize-image-button"
import type { ProductPricing } from "@/modules/products/domain/product-pricing"
import { ProductPricingEditor } from "./pricing/product-pricing-editor"

interface CreateGeneralCardProps {
  ti: TerminologyGetter
  industry: IndustryPluginContract
  name: string
  setName: (v: string) => void
  code: string
  setCode: (v: string) => void
  priceVnd: string
  setPriceVnd: (v: string) => void
  pricing: ProductPricing
  setPricing: (v: ProductPricing) => void
  category: string
  setCategory: (v: string) => void
  categories: string[]
  status: "ACTIVE" | "DRAFT"
  setStatus: (v: "ACTIVE" | "DRAFT") => void
  imagePreview: string | null
  imageFile?: File | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onAcceptNormalizedImage?: (url: string) => void
  fileInputRef?: React.RefObject<HTMLInputElement | null>
  industryPrefix?: string
  driveLink?: string | null | undefined
}

export function CreateGeneralCard({
  ti,
  industry,
  name,
  setName,
  code,
  setCode,
  priceVnd,
  setPriceVnd,
  pricing,
  setPricing,
  category,
  setCategory,
  categories,
  status,
  setStatus,
  imagePreview,
  imageFile,
  onFileChange,
  onRemoveImage,
  onAcceptNormalizedImage,
  fileInputRef,
  industryPrefix,
  driveLink,
}: CreateGeneralCardProps) {
  const localInputRef = React.useRef<HTMLInputElement>(null)
  const effectiveRef = fileInputRef ?? localInputRef
  const sampleName = industry.aiConfig.sampleProductNames[0] || "Sản phẩm mới"

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-border">
        <div className="flex items-center gap-2 text-title-sm font-bold text-text">
          <ImageIcon size={18} className="text-primary" />
          <span>Ảnh đại diện & Thông tin cam kết niêm yết</span>
        </div>
        <span className="inline-flex items-center gap-1 self-start sm:self-auto px-2 py-0.5 rounded-full text-caption font-bold bg-danger-bg text-danger-text border border-danger/30">
          Cam kết giao kèo bắt buộc *
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload ảnh */}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-text">
            Ảnh {ti("sampleProduct").toLowerCase()}
          </span>
          {imagePreview ? (
            <div className="relative aspect-square w-full rounded-2xl border border-border bg-surface-alt overflow-hidden group">
              <img
                src={safeImageSrc(imagePreview)}
                alt={`Preview ${ti("sampleProduct").toLowerCase()}`}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemoveImage}
                aria-label="Xoá ảnh đã chọn"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white p-0"
              >
                <X size={16} />
              </Button>
            </div>
          ) : driveLink ? (
            <div className="relative aspect-square w-full rounded-2xl border border-border bg-surface-alt overflow-hidden group">
              <img
                src={safeImageSrc(driveLink)}
                alt={`Preview ${ti("sampleProduct").toLowerCase()}`}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemoveImage}
                aria-label="Xoá ảnh đã chọn"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white p-0"
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => effectiveRef.current?.click()}
              className="flex aspect-square w-full h-auto cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-alt/50 p-4 text-center hover:border-primary/50 hover:bg-surface-alt font-normal"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload size={20} />
              </div>
              <div className="text-body-sm font-medium text-text">
                Kéo thả ảnh vào đây hoặc bấm để chọn file
              </div>
              <div className="text-caption text-text-muted">
                Hỗ trợ JPG, PNG, WebP, tối đa 15 MB
              </div>
            </Button>
          )}
          <input
            ref={effectiveRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          {/* Nút chuẩn hóa ảnh — luôn hiển thị, disabled khi chưa có ảnh */}
          <NormalizeImageButton
            {...(imageFile != null ? { imageFile } : {})}
            industry={industry}
            {...(onAcceptNormalizedImage != null ? { onAccept: onAcceptNormalizedImage } : {})}
          />
        </div>

        {/* Các trường cơ bản */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-caption font-semibold text-text mb-1">
              Tên {ti("sampleProduct").toLowerCase()} <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Ví dụ: ${sampleName}`}
              required
              className="h-10 text-body-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-text mb-1">
                Mã {ti("sampleProduct").toLowerCase()} (SKU)
              </label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`Để trống để hệ thống tự tạo (hoặc nhập ${industryPrefix}-001)`}
                className="h-10 text-body-sm uppercase"
              />
            </div>

          </div>

          <ProductPricingEditor industry={industry} priceVnd={priceVnd} setPriceVnd={setPriceVnd} pricing={pricing} setPricing={setPricing} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-text mb-1">
                Danh mục
              </label>
              <SingleSelectCustom
                ariaLabel="Danh mục"
                options={categories}
                value={category}
                onChange={setCategory}
                placeholder="Chọn danh mục..."
                customPlaceholder="Nhập danh mục mới..."
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-text mb-1">
                Trạng thái bán
              </label>
              <NativeSelect
                aria-label="Trạng thái bán"
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "DRAFT")}
                className="h-10 text-body-sm"
              >
                <option value="ACTIVE">Đang bán</option>
                <option value="DRAFT">Bản nháp</option>
              </NativeSelect>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
