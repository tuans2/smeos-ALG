"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Printer } from "@/components/ui/icon-set/printer"
import {
  getPrintPreset,
  type PrintPresetCode,
  type PreflightReport,
} from "@/modules/print/domain/print-preset"
import { PresetSelector, PRINT_MATERIALS } from "./preset-selector"
import { PreflightChecklist } from "./preflight-checklist"
import { PrintPreviewCanvas } from "./print-preview-canvas"
import { PrintExportSuccess, PrintStepper } from "./print-workflow-parts"

export interface PrintWorkflowProps {
  initialPresetCode?: PrintPresetCode | undefined
  initialAssetCode?: string | undefined
  storeName: string
  onSuccessExport?: () => void
}

export function PrintWorkflow({
  initialPresetCode = "A6",
  initialAssetCode,
  storeName,
  onSuccessExport,
}: PrintWorkflowProps) {
  const toast = useToast()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [presetCode, setPresetCode] = useState<PrintPresetCode>(initialPresetCode)
  const [material, setMaterial] = useState<string>("couche-300")
  const [quantity, setQuantity] = useState<number>(50)

  // Thông tin hiển thị trên bản in
  const [title, setTitle] = useState<string>(
    initialAssetCode ? `Ấn phẩm #${initialAssetCode}` : "Ấn phẩm quảng bá cửa hàng"
  )
  const [subtitle, setSubtitle] = useState<string>(
    "Kính chúc quý khách có trải nghiệm mua sắm tuyệt vời!"
  )
  const [qrLink, setQrLink] = useState<string>("https://smeos.vn")

  // Kết quả Preflight
  const [preflightReport, setPreflightReport] = useState<PreflightReport | null>(null)
  const [isPreflightLoading, setIsPreflightLoading] = useState<boolean>(false)

  // Trạng thái xuất PDF
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [lastPdfBase64, setLastPdfBase64] = useState<string | null>(null)

  const preset = getPrintPreset(presetCode)
  const materialObj = PRINT_MATERIALS.find((m) => m.id === material)

  // Chạy preflight mỗi khi preset thay đổi
  const runPreflight = async () => {
    setIsPreflightLoading(true)
    try {
      const res = await fetch("/api/v1/print/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetCode,
          colorMode: "CMYK",
          hasQrCode: true,
          qrSizeMm: preset.minQrSizeMm,
          hasContentOutsideSafeZone: false,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setPreflightReport(json.data)
      }
    } catch {
      // Bỏ qua lỗi mạng preflight
    } finally {
      setIsPreflightLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    runPreflight()
  }, [presetCode])

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      // 1. Tạo bản ghi rendition
      const createRes = await fetch("/api/v1/print/renditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetCode,
          sourceType: initialAssetCode ? "MARKETING_ASSET" : "DIRECT_PRINT",
          sourceId: initialAssetCode ?? undefined,
          widthMm: preset.widthMm,
          heightMm: preset.heightMm,
          bleedMm: preset.bleedMm,
          dpi: preset.minDpi,
          preflight: preflightReport ?? { passed: true, errors: [], warnings: [] },
        }),
      })

      if (!createRes.ok) {
        throw new Error("Không thể khởi tạo bản ghi in ấn")
      }
      const createJson = await createRes.json()
      const renditionId = createJson.data.id

      // 2. Xuất file PDF chất lượng cao
      const exportRes = await fetch(`/api/v1/print/renditions/${renditionId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          storeName,
          includeBleedMarks: true,
        }),
      })

      if (!exportRes.ok) {
        throw new Error("Lỗi xử lý file PDF chuẩn in ấn")
      }

      const exportJson = await exportRes.json()
      const pdfBase64 = exportJson.data?.pdfBase64

      if (!pdfBase64) {
        throw new Error("Không nhận được dữ liệu PDF từ máy chủ")
      }

      setLastPdfBase64(pdfBase64)
      setCurrentStep(4)

      // Tự động tải xuống
      downloadPdf(pdfBase64)

      if (onSuccessExport) {
        onSuccessExport()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Đã có lỗi khi xuất bản in")
    } finally {
      setIsExporting(false)
    }
  }

  const downloadPdf = (base64String: string) => {
    const link = document.createElement("a")
    link.href = `data:application/pdf;base64,${base64String}`
    link.download = `smeos-ban-in-${presetCode.toLowerCase()}-${Date.now()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* 4-Step Stepper Progress Bar */}
      <PrintStepper
        currentStep={currentStep}
        onSelect={setCurrentStep}
        steps={[
            { step: 1, label: "Khổ in & Chất liệu", sub: preset.name },
            { step: 2, label: "Nội dung ấn phẩm", sub: title.slice(0, 18) + "..." },
            { step: 3, label: "Kiểm tra quy cách", sub: preflightReport?.passed ? "Đạt chuẩn" : "Preflight" },
            { step: 4, label: "Xuất file in PDF", sub: "300 DPI kèm lề xén" },
          ]}
      />

      {/* Bước 1: Khổ in & Chất liệu */}
      {currentStep === 1 && (
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-6">
          <PresetSelector
            selectedPresetCode={presetCode}
            onSelectPreset={setPresetCode}
            selectedMaterial={material}
            onSelectMaterial={setMaterial}
            quantity={quantity}
            onChangeQuantity={setQuantity}
          />

          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
            >
              <span>Tiếp tục: Soạn nội dung</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bước 2: Nội dung & Mã QR */}
      {currentStep === 2 && (
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-6">
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-title-sm font-bold text-text">
              Nội dung hiển thị trên ấn phẩm
            </h3>

            <div className="space-y-1.5">
              <label className="text-caption font-bold text-text">Tiêu đề chính</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Ví dụ: Bảng menu món nổi bật / Thiệp tri ấn khách hàng"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-bold text-text">Thông điệp phụ / Lời chúc</label>
              <Textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Lời cảm ơn, hướng dẫn nhận ưu đãi..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-caption font-bold text-text">Liên kết mã QR</label>
              <Input
                type="url"
                value={qrLink}
                onChange={(e) => setQrLink(e.target.value)}
                placeholder="https://smeos.vn/shop-cua-ban"
              />
              <p className="text-caption text-text-muted">
                Khách hàng quét mã này để đặt lại món, xem bảng giá hoặc đánh giá cửa hàng.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                runPreflight()
                setCurrentStep(3)
              }}
              className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
            >
              <span>Tiếp tục: Kiểm tra quy cách</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bước 3: Kiểm tra quy cách & Xem trước */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cột trái: Preflight checklist */}
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-title-sm font-bold text-text">
                  Kiểm tra quy cách nhà in (Preflight)
                </h3>
                <Badge tone="accent">Khổ {preset.name}</Badge>
              </div>

              <PreflightChecklist
                report={preflightReport}
                isLoading={isPreflightLoading}
              />
            </div>

            {/* Cột phải: Visual Canvas */}
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
              <h3 className="text-title-sm font-bold text-text">
                Xem trước tràn lề & đường xén
              </h3>
              <PrintPreviewCanvas
                preset={preset}
                title={title}
                subtitle={subtitle}
                storeName={storeName}
                qrLink={qrLink}
                materialName={materialObj?.name}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sửa nội dung</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isExporting ? "Đang tạo bản in PDF..." : "Xuất file PDF nhà in (300 DPI)"}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Bước 4: Thành công & Tải về */}
      {currentStep === 4 && (
        <PrintExportSuccess
          preset={preset}
          materialName={materialObj?.name}
          quantity={quantity}
          onDownloadAgain={lastPdfBase64 ? () => downloadPdf(lastPdfBase64) : undefined}
          onStartOver={() => setCurrentStep(1)}
        />
      )}
    </div>
  )
}
