import { jsPDF } from "jspdf"
import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IPrintRenditionRepository } from "../domain/repositories/print-rendition-repository.interface"
import { getPrintRenditionRepository } from "../infra/print-rendition-repository"
import { checkUploadContent } from "@/modules/assets/domain/upload-content-rules"

const DATA_URL_PATTERN = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/

/**
 * Ảnh ấn phẩm gửi kèm dạng data URL: chỉ PNG/JPEG, nội dung khớp định dạng khai báo
 * (magic bytes) và ≤ 20 MB — cùng luật kiểm tệp tải lên của kho tư liệu.
 */
function decodePrintImage(dataUrl: string): { format: "PNG" | "JPEG"; dataUrl: string } {
  const m = DATA_URL_PATTERN.exec(dataUrl)
  if (!m) {
    throw validationFailed({ imageDataUrl: "Ảnh ấn phẩm phải là PNG hoặc JPEG dạng data URL" })
  }
  const ext = m[1] === "png" ? "png" : "jpg"
  const check = checkUploadContent(`print.${ext}`, new Uint8Array(Buffer.from(m[2] ?? "", "base64")))
  if (!check.ok) {
    throw validationFailed({
      imageDataUrl: check.reason === "too_large" ? "Ảnh ấn phẩm vượt quá 20 MB" : "Nội dung ảnh không khớp định dạng PNG/JPEG",
    })
  }
  return { format: ext === "png" ? "PNG" : "JPEG", dataUrl }
}

export interface ExportPrintPdfOptions {
  title?: string | undefined
  subtitle?: string | undefined
  storeName?: string | undefined
  includeBleedMarks?: boolean | undefined
  imageDataUrl?: string | undefined
}

export interface ExportPrintPdfResult {
  fileName: string
  mimeType: string
  base64: string
  widthMm: number
  heightMm: number
}

export async function exportPrintPdfUseCase(
  ctx: TenantContext,
  renditionId: string,
  options?: ExportPrintPdfOptions,
  repo: IPrintRenditionRepository = getPrintRenditionRepository()
): Promise<ExportPrintPdfResult> {
  const rendition = await repo.findById(ctx, renditionId)
  if (!rendition) {
    throw notFound()
  }
  const image = options?.imageDataUrl ? decodePrintImage(options.imageDataUrl) : null

  const bleedMm = rendition.bleedMm
  const includeBleed = options?.includeBleedMarks ?? true

  const totalWidth = rendition.widthMm + (includeBleed ? 2 * bleedMm : 0)
  const totalHeight = rendition.heightMm + (includeBleed ? 2 * bleedMm : 0)
  const orientation = totalWidth > totalHeight ? "landscape" : "portrait"

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: [totalWidth, totalHeight],
  })

  // Nếu có ảnh ấn phẩm
  if (image) {
    doc.addImage(image.dataUrl, image.format, 0, 0, totalWidth, totalHeight)
  } else {
    // Vẽ khung mẫu chuẩn in ấn
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, totalWidth, totalHeight, "F")

    // Vẽ vùng an toàn (Safe Zone)
    const safeX = (includeBleed ? bleedMm : 0) + 3
    const safeY = (includeBleed ? bleedMm : 0) + 3
    const safeW = rendition.widthMm - 6
    const safeH = rendition.heightMm - 6

    doc.setDrawColor(220, 220, 225)
    doc.setLineWidth(0.2)
    doc.rect(safeX, safeY, safeW, safeH)

    // Nội dung demo mẫu
    doc.setTextColor(30, 30, 35)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(options?.title || `Ấn phẩm in chuẩn ${rendition.presetCode}`, safeX + 10, safeY + 15)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 110)
    doc.text(
      options?.subtitle || `Quy cách: ${rendition.widthMm} × ${rendition.heightMm} mm (Bleed: ${bleedMm}mm, 300 DPI)`,
      safeX + 10,
      safeY + 23
    )

    if (options?.storeName) {
      doc.setFontSize(10)
      doc.text(`Cửa hàng: ${options.storeName}`, safeX + 10, safeY + safeH - 10)
    }
  }

  // Vẽ Trim / Crop marks ở 4 góc nếu bật bleed
  if (includeBleed) {
    doc.setDrawColor(50, 50, 50)
    doc.setLineWidth(0.15)
    const markLen = 3

    // Góc trên - trái
    doc.line(bleedMm, 0, bleedMm, markLen)
    doc.line(0, bleedMm, markLen, bleedMm)

    // Góc trên - phải
    doc.line(totalWidth - bleedMm, 0, totalWidth - bleedMm, markLen)
    doc.line(totalWidth, bleedMm, totalWidth - markLen, bleedMm)

    // Góc dưới - trái
    doc.line(bleedMm, totalHeight, bleedMm, totalHeight - markLen)
    doc.line(0, totalHeight - bleedMm, markLen, totalHeight - bleedMm)

    // Góc dưới - phải
    doc.line(totalWidth - bleedMm, totalHeight, totalWidth - bleedMm, totalHeight - markLen)
    doc.line(totalWidth, totalHeight - bleedMm, totalWidth - markLen, totalHeight - bleedMm)
  }

  const base64Data = doc.output("datauristring")

  await repo.update(ctx, renditionId, {
    status: "READY",
  })

  return {
    fileName: `alg_print_${rendition.presetCode.toLowerCase()}_${Date.now()}.pdf`,
    mimeType: "application/pdf",
    base64: base64Data,
    widthMm: totalWidth,
    heightMm: totalHeight,
  }
}

