"use client"

import React, { useState, useRef } from "react"
import { Download, FileText, Loader2, Check } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { toPng } from "html-to-image"
import jsPDF from "jspdf"
import type {
  CatalogPageModel,
  StyleDefinition,
  BrandProfile,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { CatalogPageRenderer } from "./catalog-page-renderer"
import { slugifyVietnamese } from "@/modules/catalog-links/domain/catalog-link-rules"

interface CatalogPdfExportButtonProps {
  pages: CatalogPageModel[]
  style: StyleDefinition
  brand: BrandProfile
  catalogTitle: string
  className?: string
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
}

export function CatalogPdfExportButton({
  pages,
  style,
  brand,
  catalogTitle,
  className = "",
  variant = "primary",
  size = "default",
}: CatalogPdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [currentProgress, setCurrentProgress] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const printContainerRef = useRef<HTMLDivElement>(null)

  const handleExportPdf = async () => {
    if (!printContainerRef.current) return
    setIsExporting(true)
    setError(null)
    setSuccess(false)

    try {
      const pageElements = printContainerRef.current.querySelectorAll<HTMLDivElement>(".pdf-page-container")
      if (pageElements.length === 0) throw new Error("Không tìm thấy trang để xuất PDF.")

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i]!
        setCurrentProgress(`Đang tạo trang ${i + 1}/${pageElements.length}...`)

        const dataUrl = await toPng(el, {
          quality: 0.95,
          pixelRatio: 2, // High resolution for A4 print & digital reading
          skipFonts: true,
          fontEmbedCSS: "",
          cacheBust: true,
        })

        if (i > 0) {
          pdf.addPage("a4", "portrait")
        }

        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight)
      }

      const fileName = `${slugifyVietnamese(catalogTitle) || "catalog"}-2026.pdf`
      pdf.save(fileName)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi xuất PDF.")
    } finally {
      setIsExporting(false)
      setCurrentProgress(null)
    }
  }

  return (
    <>
      <div className="inline-flex flex-col items-start gap-1">
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={handleExportPdf}
          disabled={isExporting}
          className={`flex items-center gap-1.5 font-semibold ${className}`}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              <span>{currentProgress || "Đang xuất PDF..."}</span>
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4 text-success" />
              <span>Đã tải PDF thành công</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span className="whitespace-nowrap sm:hidden">Tải PDF</span>
              <span className="hidden whitespace-nowrap sm:inline">Xuất Catalog PDF (A4)</span>
            </>
          )}
        </Button>
        {error && <span className="text-caption text-destructive">{error}</span>}
      </div>

      {/* Off-screen high-res container for rendering clean A4 pages */}
      <div
        ref={printContainerRef}
        aria-hidden="true"
        style={{ position: "fixed", left: "-9999px", top: "-9999px", width: "210mm" }}
      >
        {pages.map((p) => (
          <div key={p.pageNumber} className="pdf-page-container">
            <CatalogPageRenderer
              page={p}
              style={style}
              brand={brand}
              totalPages={pages.length}
              isPrintMode={true}
            />
          </div>
        ))}
      </div>
    </>
  )
}
