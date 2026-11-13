"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState, useRef } from "react"
import {
  UploadCloud,
  Video,
  FileText,
  Sparkles,
  Loader2,
  X,
  Image as ImageIcon,
  Store,
  Layers,
  CheckCircle2,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CatalogProduct } from "./catalog-management-tab"
import { ProductLibraryModal } from "./product-library-modal"
import { SmartInputStyleSelector, type PreferredStyleChoice } from "./smart-input-style-selector"
import { SmartInputStorePicker } from "./smart-input-store-picker"
import { SmartInputFileUploader } from "./smart-input-file-uploader"

export interface SmartInputData {
  imageFiles: File[]
  imagePreviewUrls: string[]
  videoUrl: string
  userDirectives: string
  selectedProducts?: CatalogProduct[]
  preferredStyle?: PreferredStyleChoice
}

interface SmartInputDropzoneProps {
  onAnalyze: (data: SmartInputData) => Promise<void>
  onSwitchToManual?: () => void
  isAnalyzing?: boolean
  availableProducts?: CatalogProduct[]
}

export function SmartInputDropzone({
  onAnalyze,
  onSwitchToManual,
  isAnalyzing = false,
  availableProducts = [],
}: SmartInputDropzoneProps) {
  // Input Source Mode: "upload" | "store"
  const [inputSource, setInputSource] = useState<"upload" | "store">("store")
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)

  // Upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [saveToStore, setSaveToStore] = useState(true)

  // Store Selected Products state
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([])

  // Video & Directives
  const [videoUrl, setVideoUrl] = useState("")
  const [userDirectives, setUserDirectives] = useState("")
  const [preferredStyle, setPreferredStyle] = useState<PreferredStyleChoice>("auto")
  const addFiles = (files: File[]) => {
    const validImages = files.filter((f) => f.type.startsWith("image/"))
    if (validImages.length === 0) return

    const newUrls = validImages.map((f) => URL.createObjectURL(f))
    setImageFiles((prev) => [...prev, ...validImages])
    setImagePreviewUrls((prev) => [...prev, ...newUrls])
  }

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index] || "")
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Hợp nhất URL ảnh từ upload và ảnh từ kho sản phẩm
    const storeImageUrls = selectedProducts
      .map((p) => p.imageUrl)
      .filter((url): url is string => Boolean(url))

    const allPreviewUrls = [...imagePreviewUrls, ...storeImageUrls]

    // Gợi ý ghi chú nếu có sản phẩm từ kho được chọn
    let combinedDirectives = userDirectives.trim()
    if (selectedProducts.length > 0 && !combinedDirectives.includes("Sản phẩm từ kho:")) {
      const productNames = selectedProducts.map((p) => p.name).join(", ")
      combinedDirectives = combinedDirectives
        ? `${combinedDirectives} (Mẫu kho: ${productNames})`
        : `Mẫu kho: ${productNames}`
    }

    await onAnalyze({
      imageFiles,
      imagePreviewUrls: allPreviewUrls,
      videoUrl: videoUrl.trim(),
      userDirectives: combinedDirectives,
      selectedProducts,
      preferredStyle,
    })
  }

  const hasAnyInput =
    imageFiles.length > 0 ||
    selectedProducts.length > 0 ||
    videoUrl.trim().length > 0 ||
    userDirectives.trim().length > 0

  return (
    <div className="rounded-2xl border border-primary-border bg-surface p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-title-sm font-bold text-text">Đầu vào cho AI</h3>
          <p className="text-body-sm text-text-muted mt-1 max-w-2xl">
            Chọn sản phẩm có sẵn hoặc tải ảnh mới — AI chuẩn bị các bước, bạn xem lại trước khi xuất bản.
          </p>
        </div>
        {onSwitchToManual && (
          <Button
            type="button"
            variant="outline"
            onClick={onSwitchToManual}
            className="shrink-0 text-caption font-medium border-border hover:bg-surface-alt"
          >
            Chuyển sang Tự thiết kế từng bước →
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Khối Lựa chọn Nguồn Đầu Vào Kép (Dual-Source Selector) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-bold text-text flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span>1. Hình ảnh sản phẩm (Chọn từ kho hoặc tải từ máy)</span>
            </label>
            <span className="text-caption text-text-muted">
              Hỗ trợ kết hợp cả 2 nguồn
            </span>
          </div>

          {/* Toggle 2 nguồn */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-surface-alt border border-border">
            <Button variant="ghost"
              type="button"
              onClick={() => setInputSource("store")}
              className={`h-auto flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-body-sm font-bold transition-all cursor-pointer ${
                inputSource === "store"
                  ? "bg-surface text-primary shadow-xs border border-primary/20 hover:bg-surface"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Chọn từ kho tiệm ({selectedProducts.length > 0 ? `Đã chọn ${selectedProducts.length}` : `${availableProducts.length} mẫu`})</span>
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => setInputSource("upload")}
              className={`h-auto flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-body-sm font-bold transition-all cursor-pointer ${
                inputSource === "upload"
                  ? "bg-surface text-primary shadow-xs border border-primary/20 hover:bg-surface"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Tải từ máy ({imageFiles.length > 0 ? `${imageFiles.length} ảnh` : "Kéo thả"})</span>
            </Button>
          </div>

          {/* Nguồn 1: Chọn từ Kho sản phẩm */}
          {inputSource === "store" && (
            <SmartInputStorePicker
              availableProducts={availableProducts}
              selectedProducts={selectedProducts}
              onOpenLibrary={() => setIsLibraryOpen(true)}
              onToggleProduct={(p) => {
                const isSelected = selectedProducts.some((sp) => sp.id === p.id)
                if (isSelected) {
                  handleRemoveProduct(p.id)
                } else {
                  setSelectedProducts((prev) => [...prev, p])
                }
              }}
            />
          )}

          {/* Nguồn 2: Tải lên từ máy */}
          {inputSource === "upload" && (
            <SmartInputFileUploader
              imageFiles={imageFiles}
              imagePreviewUrls={imagePreviewUrls}
              saveToStore={saveToStore}
              onAddFiles={addFiles}
              onRemoveImage={handleRemoveImage}
              onToggleSaveToStore={setSaveToStore}
            />
          )}
        </div>

        {/* Khối Link Video */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <Video className="h-4 w-4 text-primary" />
            <span>2. Video giới thiệu sản phẩm (Tùy chọn)</span>
          </label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Dán link video TikTok, YouTube hoặc file MP4 trực tiếp..."
            className="text-body-sm"
          />
          <p className="text-caption text-text-muted">
            Video giữ nguyên chất lượng gốc, tự động nhúng vào khu vực video nổi bật của trang.
          </p>
        </div>

        {/* Khối Ghi chú / Văn bản */}
        <div className="space-y-1.5">
          <label className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            <span>3. Ghi chú yêu cầu / Định hướng nội dung (Tùy chọn)</span>
          </label>
          <Textarea
            value={userDirectives}
            onChange={(e) => setUserDirectives(e.target.value)}
            rows={2}
            placeholder="VD: Hoa hồng đỏ 20/10 tặng mẹ hoặc vợ, tầm giá 800k - 1.2 triệu, lời văn ấm áp tri ân..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-caption text-text-muted">
            AI sẽ lồng ghép yêu cầu này vào tiêu đề, câu chuyện thương hiệu và bảng giá sản phẩm.
          </p>
        </div>

        {/* Khối 4: Phong cách thiết kế Catalog */}
        <SmartInputStyleSelector
          selectedChoice={preferredStyle}
          onSelectChoice={setPreferredStyle}
        />

        {/* Nút hành động chính */}
        <div className="flex flex-col-reverse gap-3 pt-3 border-t border-border sm:flex-row sm:items-center sm:justify-between">
          <span className="text-caption text-text-muted">
            Sau khi AI phân tích, bạn sẽ được xem và chỉnh sửa toàn bộ các bước trước khi xuất bản.
          </span>
          <Button
            type="submit"
            disabled={!hasAnyInput || isAnalyzing}
            className="w-full shrink-0 bg-primary text-surface hover:bg-primary-dark flex items-center justify-center gap-2 px-6 sm:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Phân tích và thiết lập</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Modal Kho Sản Phẩm */}
      {isLibraryOpen && (
        <ProductLibraryModal
          open={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          products={availableProducts}
          selectedIds={selectedProducts.map((p) => p.id)}
          onSelectProducts={(chosen: CatalogProduct[]) => setSelectedProducts(chosen)}
        />
      )}
    </div>
  )
}
