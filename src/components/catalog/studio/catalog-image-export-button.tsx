"use client"

import React, { useState, useRef } from "react"
import { ImageDown, Loader2, Check } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { toPng } from "html-to-image"
import type {
  CatalogProductItem,
  StyleDefinition,
  BrandProfile,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { CatalogCoverPoster } from "./catalog-cover-poster"
import { slugifyVietnamese } from "@/modules/catalog-links/domain/catalog-link-rules"

interface CatalogImageExportButtonProps {
  products: CatalogProductItem[]
  style: StyleDefinition
  brand: BrandProfile
  catalogTitle: string
  catalogUrl?: string
  className?: string
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
}

/**
 * Xuất ảnh PNG dạng Poster 1080×1080 (Square) từ CatalogCoverPoster.
 * Ảnh này có thể gửi trực tiếp qua Zalo, Facebook, Instagram.
 */
export function CatalogImageExportButton({
  products,
  style,
  brand,
  catalogTitle,
  catalogUrl,
  className = "",
  variant = "outline",
  size = "default",
}: CatalogImageExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const posterContainerRef = useRef<HTMLDivElement>(null)

  const handleExportImage = async () => {
    if (!posterContainerRef.current) return
    setIsExporting(true)
    setError(null)
    setSuccess(false)

    try {
      // Find the actual 1080px poster element inside the off-screen container
      const posterEl = posterContainerRef.current.querySelector<HTMLDivElement>(
        "[data-poster-root]"
      )
      if (!posterEl) throw new Error("Không tìm thấy poster để xuất ảnh.")

      const dataUrl = await toPng(posterEl, {
        quality: 0.96,
        pixelRatio: 1, // Already 1080px — no scaling needed
        skipFonts: true,
        fontEmbedCSS: "",
        cacheBust: true,
      })

      // Trigger file download
      const link = document.createElement("a")
      link.download = `catalog-poster-${slugifyVietnamese(catalogTitle) || "smeos"}-2026.png`
      link.href = dataUrl
      link.click()

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi xuất ảnh.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <div className="inline-flex flex-col items-start gap-1">
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={handleExportImage}
          disabled={isExporting}
          className={`flex items-center gap-1.5 font-semibold ${className}`}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              <span>Đang tạo ảnh...</span>
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4 text-success" />
              <span>Đã tải ảnh thành công</span>
            </>
          ) : (
            <>
              <ImageDown className="h-4 w-4" />
              <span>Tải ảnh Poster (PNG)</span>
            </>
          )}
        </Button>
        {error && <span className="text-caption text-destructive">{error}</span>}
      </div>

      {/* Off-screen 1080px poster — fixed outside viewport for clean rendering */}
      <div
        ref={posterContainerRef}
        aria-hidden="true"
        style={{ position: "fixed", left: "-1200px", top: "-1200px", width: "1080px" }}
      >
        <CatalogCoverPoster
          products={products}
          style={style}
          brand={brand}
          catalogTitle={catalogTitle}
          {...(catalogUrl !== undefined ? { catalogUrl } : {})}
          productCount={products.length}
        />
      </div>
    </>
  )
}
