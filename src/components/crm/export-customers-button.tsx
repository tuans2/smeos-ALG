"use client"

/**
 * ExportCustomersButton — Nút "Sao lưu / Xuất dữ liệu" khách hàng.
 *
 * Cung cấp 2 lựa chọn xuất:
 *   1. Excel (.xlsx): Xem và lọc thông tin khách hàng, ngày kỷ niệm.
 *   2. JSON (.json): Sao lưu đầy đủ cấu trúc (Full Backup) để lưu trữ dự phòng.
 */

import React, { useState, useRef, useEffect } from "react"
import { Download } from "@/components/ui/icon-set/download"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import { Database } from "@/components/ui/icon-set/database"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { useSession } from "@/lib/session"
import { Button } from "@/components/ui/button"

interface ExportCustomersButtonProps {
  apiPath?: string
  tier?: string
  search?: string
}

/** PO 14/10/2026: xuất Excel chỉ Điều hành (quyền R13); người khác xin Điều hành cấp quyền ở màn phân quyền. */
export function ExportCustomersButton(props: ExportCustomersButtonProps) {
  const { can } = useSession()
  return can("R13") ? <ExportCustomersButtonInner {...props} /> : null
}

function ExportCustomersButtonInner({
  apiPath = "/api/v1/crm/customers/export",
  tier,
  search,
}: ExportCustomersButtonProps) {
  const [open, setOpen] = useState(false)
  const [loadingFormat, setLoadingFormat] = useState<"xlsx" | "json" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  async function handleDownload(format: "xlsx" | "json") {
    setError(null)
    setLoadingFormat(format)
    try {
      const params = new URLSearchParams({
        format,
        ...(tier ? { tier } : {}),
        ...(search ? { search } : {}),
      })

      const res = await fetch(`${apiPath}?${params.toString()}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? `Lỗi tải tệp (${res.status})`)
      }

      // Lấy filename từ Content-Disposition header nếu có
      let filename = format === "json" ? "backup-khach-hang.json" : "danh-sach-khach-hang.xlsx"
      const disposition = res.headers.get("Content-Disposition")
      if (disposition) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải file, vui lòng thử lại.")
    } finally {
      setLoadingFormat(null)
    }
  }

  const isLoading = loadingFormat !== null

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        id="export-customers-btn"
        variant="outline"
        size="sm"
        className="gap-1.5 text-body-sm font-semibold"
        aria-label="Sao lưu & Xuất dữ liệu khách hàng"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-primary" />
        ) : (
          <Download className="h-4 w-4 text-primary" />
        )}
        Sao lưu & Xuất
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Tùy chọn sao lưu và xuất dữ liệu"
          className="absolute right-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-lg p-2 space-y-1"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-body-sm font-semibold text-text">Dữ liệu khách hàng</p>
            <p className="text-caption text-text-muted mt-0.5">
              Chọn định dạng tệp để tải về máy
            </p>
          </div>

          {error && (
            <div className="px-3 py-2">
              <p className="text-caption text-danger font-medium">{error}</p>
            </div>
          )}

          <Button variant="ghost"
            type="button"
            disabled={isLoading}
            role="menuitem"
            className={`text-[length:inherit] h-auto justify-start font-[inherit] w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors text-text ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-surface cursor-pointer"
            }`}
            onClick={() => !isLoading && handleDownload("xlsx")}
          >
            <div className="p-2 rounded-md bg-primary-muted text-primary shrink-0 mt-0.5">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-body-sm font-medium">Xuất Excel (.xlsx)</p>
              <p className="text-caption text-text-muted">
                Bảng tính 2 sheet gồm danh sách khách hàng và lịch kỷ niệm.
              </p>
            </div>
          </Button>

          <Button variant="ghost"
            type="button"
            disabled={isLoading}
            role="menuitem"
            className={`text-[length:inherit] h-auto justify-start font-[inherit] w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors text-text ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-surface cursor-pointer"
            }`}
            onClick={() => !isLoading && handleDownload("json")}
          >
            <div className="p-2 rounded-md bg-info-bg text-info shrink-0 mt-0.5">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="text-body-sm font-medium">Sao lưu toàn bộ (.json)</p>
              <p className="text-caption text-text-muted">
                File backup cấu trúc gốc kèm sở thích, tag, lịch kỷ niệm phục vụ lưu trữ an toàn.
              </p>
            </div>
          </Button>
        </div>
      )}
    </div>
  )
}
