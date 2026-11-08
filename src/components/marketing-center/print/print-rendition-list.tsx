"use client"

import React, { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { FileDown } from "@/components/ui/icon-set/file-down"
import { Printer } from "@/components/ui/icon-set/printer"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import type { PrintRendition } from "@/modules/print/domain/print-rendition"
import { getPrintPreset } from "@/modules/print/domain/print-preset"
import { formatDateTime } from "@/lib/i18n/formatters"

export function PrintRenditionList() {
  const toast = useToast()
  const [renditions, setRenditions] = useState<PrintRendition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRenditions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/print/renditions?limit=20")
      if (!res.ok) {
        throw new Error("Không thể tải danh sách bản in")
      }
      const data = await res.json()
      setRenditions(data.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    fetchRenditions()
  }, [])

  const handleDownload = async (rendition: PrintRendition) => {
    setDownloadingId(rendition.id)
    try {
      const res = await fetch(`/api/v1/print/renditions/${rendition.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Bản in ${rendition.presetCode}`,
          includeBleedMarks: true,
        }),
      })

      if (!res.ok) {
        throw new Error("Lỗi khi xuất file in PDF")
      }

      const json = await res.json()
      const pdfBase64 = json.data?.pdfBase64
      if (!pdfBase64) {
        throw new Error("Không nhận được dữ liệu file PDF")
      }

      // Tải file PDF về máy người dùng
      const link = document.createElement("a")
      link.href = `data:application/pdf;base64,${pdfBase64}`
      link.download = `smeos-ban-in-${rendition.presetCode.toLowerCase()}-${rendition.id.slice(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không tải được tệp PDF")
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-caption text-text-muted">
        <Printer className="w-8 h-8 mx-auto mb-2 text-primary/40 animate-pulse motion-reduce:animate-none" />
        <p>Đang tải lịch sử các bản in...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-danger/20 bg-danger/5 text-center text-caption text-danger space-y-2">
        <p>{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchRenditions}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (renditions.length === 0) {
    return (
      <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-surface-alt/30 space-y-3">
        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-text-muted">
          <Printer className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-body-sm font-bold text-text">
            Chưa có bản in nào được xuất
          </h4>
          <p className="text-caption text-text-muted max-w-sm mx-auto">
            Hãy bắt đầu bằng cách chọn một khổ in thành phẩm và xuất file PDF chất lượng cao có tràn lề.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {renditions.map((r) => {
        const preset = getPrintPreset(r.presetCode)
        const isDownloading = downloadingId === r.id
        const dateStr = formatDateTime(r.createdAt)

        return (
          <div
            key={r.id}
            className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-sm font-bold text-text">
                  {preset.name}
                </span>
                <Badge tone="accent">{r.presetCode}</Badge>
                <Badge tone="success">
                  <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                  Quy cách {r.dpi} DPI
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-caption text-text-muted">
                <span>
                  Kích thước: {r.widthMm} × {r.heightMm} mm (+{r.bleedMm}mm lề xén)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{dateStr}</span>
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload(r)}
                disabled={isDownloading}
                className="flex items-center gap-1.5"
                title="Tải lại file PDF chuẩn nhà in"
              >
                <FileDown className="w-4 h-4 text-primary" />
                <span>{isDownloading ? "Đang tạo PDF..." : "Tải file PDF"}</span>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
