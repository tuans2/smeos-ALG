"use client"

import React, { useState } from "react"
import { Store, Download, Upload, CheckCircle2, AlertCircle, Loader2, Bot, Phone, MapPin, Star, RotateCcw } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { generateBranchTemplateBuffer, parseBranchWorkbook, type ParsedBranchRow } from "./parse-branch-sheet"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { validateSpreadsheetSecurity } from "@/modules/platform/domain/spreadsheet-security"
import { mutate } from "swr"
import { BRANCH_LIST_URL, BranchPartnerList } from "./branch-partner-list"

interface ImportBranchResult {
  created: number
  updated: number
  errors: string[]
  geocoded?: number
  geocodeNotFound?: number
  geocodeSkipped?: number
}

export function BranchImportPanel() {
  const [parsedRows, setParsedRows] = useState<ParsedBranchRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportBranchResult | null>(null)

  const validRows = parsedRows.filter((r) => r.status === "VALID")
  const errorRows = parsedRows.filter((r) => r.status === "ERROR")

  function handleDownloadTemplate() {
    const buf = generateBranchTemplateBuffer()
    const blob = new Blob([buf.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ALG_Template_DanhSach_CuaHang_Chuoi.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    setParsedRows([])
    setResult(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const buffer = evt.target?.result as ArrayBuffer
      if (!buffer) return

      // 1. Kiểm tra an ninh & chống virus/macro/phishing
      const sec = validateSpreadsheetSecurity(buffer, file.name)
      if (!sec.isValid) {
        setParseError(sec.error ?? "Tệp tải lên không an toàn")
        setParsedRows([])
        setFileName("")
        return
      }

      // 2. Parse workbook an toàn
      try {
        const rows = parseBranchWorkbook(buffer)
        setParsedRows(rows)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Lỗi đọc file Excel")
        setParsedRows([])
        return
      }

      // 3. Tự động lưu trữ bản gốc vào kho asset của tổ chức
      try {
        const urlRes = await fetch("/api/v1/assets/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: null, mimeType: sec.sanitizedMimeType }),
        })
        if (urlRes.ok) {
          const { asset_id, storage_key, upload_url } = (await urlRes.json()) as {
            asset_id: string
            storage_key: string
            upload_url: string
          }
          const putRes = await fetch(upload_url, {
            method: "PUT",
            headers: { "Content-Type": sec.sanitizedMimeType },
            body: file,
          })
          if (putRes.ok) {
            await fetch("/api/v1/assets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                asset_id,
                product_id: null,
                kind: "ORIGINAL",
                storage_key,
                mime_type: sec.sanitizedMimeType,
                file_size: file.size,
                parameters: {
                  original_filename: file.name,
                  uploaded_at: new Date().toISOString(),
                  source: "branch_import",
                },
              }),
            })
          }
        }
      } catch {
        // Lưu trữ ngầm
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setIsImporting(true)
    setResult(null)
    try {
      const res = await apiSend<{ data: ImportBranchResult }>(
        "/api/v1/greeting-card/chain-branches/bulk-import",
        "POST",
        { branches: validRows },
        "Không nhập được danh sách cửa hàng chuỗi"
      )
      setResult(res.data)
      void mutate(BRANCH_LIST_URL)
      setParsedRows([])
      setFileName("")
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Lỗi nhập dữ liệu")
    } finally {
      setIsImporting(false)
    }
  }

  function handleReset() {
    setParsedRows([])
    setFileName("")
    setParseError(null)
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hướng dẫn + Tải Template */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-body font-extrabold text-text flex items-center gap-2">
            <Store size={18} className="text-primary" />
            Nhập Danh Sách Cửa Hàng Chuỗi từ Excel
          </h3>
          <p className="text-caption text-text-muted mt-1 max-w-xl leading-relaxed">
            Tải file Excel mẫu, điền đầy đủ thông tin từng cửa hàng (địa chỉ, toạ độ, số điện thoại, Telegram ID cá nhân).
            Hệ thống sẽ tự động tính khoảng cách và xếp hạng khi có đơn gia công mới.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Download size={14} />
          Tải file Excel mẫu
        </Button>
      </div>

      {/* Lưu ý quan trọng về Telegram DM */}
      <div className="p-4 rounded-xl border border-warning-border bg-warning-bg/40 flex items-start gap-3">
        <Bot size={18} className="text-warning-text shrink-0 mt-0.5" />
        <div className="text-caption text-text leading-relaxed">
          <strong className="block text-body-sm font-bold mb-1 text-warning-text">
            📱 Về cột "Telegram ID riêng / Nhóm"
          </strong>
          <ul className="space-y-1 text-text-muted">
            <li>
              <strong>Liên kết trước:</strong> chi nhánh nhắn <strong>mã liên kết của cửa hàng</strong> (xem ở Cài đặt → Kết nối Telegram) cho bot điều phối, hoặc thêm bot vào nhóm của chi nhánh rồi nhắn mã đó trong nhóm.
            </li>
            <li>
              <strong>Rồi mới điền ID:</strong> chép Chat ID hiện trong danh sách nhóm đã liên kết vào cột này. ID nhóm bắt đầu bằng dấu trừ.
            </li>
            <li>
              Chat chưa liên kết sẽ không nhận được tin giao việc — hệ thống báo “chưa gửi được” để bạn kiểm tra lại.
            </li>
          </ul>
        </div>
      </div>

      {/* Khu vực Upload */}
      <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-surface-alt/50 transition-colors hover:border-primary/40">
        <label
          htmlFor="branch-excel-upload"
          className="flex flex-col items-center gap-2 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload size={24} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="text-body-sm font-bold text-text">
              {fileName || "Kéo thả hoặc bấm để chọn file Excel"}
            </p>
            <p className="text-caption text-text-muted">
              {fileName ? `✓ Đã chọn: ${fileName}` : "Hỗ trợ .xlsx, .xls — tối đa 500 cửa hàng"}
            </p>
          </div>
        </label>
        <input
          id="branch-excel-upload"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        {!fileName && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("branch-excel-upload")?.click()}
            className="mt-1"
          >
            Chọn file Excel
          </Button>
        )}
      </div>

      {/* Lỗi parse */}
      {parseError && (
        <div className="p-3 rounded-xl border border-danger-border bg-danger-bg/50 flex items-center gap-2 text-danger text-caption">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-medium">{parseError}</span>
        </div>
      )}

      {/* Kết quả sau import */}
      {result && (
        <div className="p-4 rounded-xl border border-success-border bg-success-bg/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-success font-bold text-body-sm">
            <CheckCircle2 size={18} />
            Đã nhập thành công!
          </div>
          <div className="text-caption text-text-muted grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-surface border border-border text-center">
              <div className="text-body font-black text-primary">{result.created}</div>
              <div className="text-caption-sm text-text-muted">Cửa hàng mới</div>
            </div>
            <div className="p-2 rounded-lg bg-surface border border-border text-center">
              <div className="text-body font-black text-text">{result.updated}</div>
              <div className="text-caption-sm text-text-muted">Cập nhật</div>
            </div>
            <div className="p-2 rounded-lg bg-surface border border-border text-center">
              <div className="text-body font-black text-danger">{result.errors.length}</div>
              <div className="text-caption-sm text-text-muted">Lỗi bỏ qua</div>
            </div>
          </div>
          {(result.geocoded ?? 0) + (result.geocodeNotFound ?? 0) + (result.geocodeSkipped ?? 0) > 0 && (
            <p className="text-caption text-text-muted">
              Tự xác định vị trí từ địa chỉ: {result.geocoded ?? 0} cửa hàng.
              {(result.geocodeNotFound ?? 0) + (result.geocodeSkipped ?? 0) > 0 &&
                ` ${(result.geocodeNotFound ?? 0) + (result.geocodeSkipped ?? 0)} cửa hàng chưa có vị trí — hãy điền vĩ độ, kinh độ trong file để được phân đơn theo khoảng cách.`}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleReset} className="self-start gap-1.5 mt-1">
            <RotateCcw size={13} /> Nhập thêm file khác
          </Button>
        </div>
      )}

      {/* Bảng xem trước dữ liệu */}
      {parsedRows.length > 0 && !result && (
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-bold text-text">
                Xem trước: {parsedRows.length} cửa hàng
              </span>
              <span className="px-2 py-0.5 rounded-full text-caption-sm font-bold bg-success-bg text-success border border-success-border">
                ✓ {validRows.length} hợp lệ
              </span>
              {errorRows.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-caption-sm font-bold bg-danger-bg text-danger border border-danger-border">
                  ✗ {errorRows.length} lỗi
                </span>
              )}
            </div>
            <Button
              type="button"
              onClick={() => void handleImport()}
              disabled={isImporting || validRows.length === 0}
              className="flex items-center gap-1.5 h-9"
            >
              {isImporting ? (
                <><Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> Đang lưu...</>
              ) : (
                <><Store size={14} /> Lưu {validRows.length} cửa hàng vào hệ thống</>
              )}
            </Button>
          </div>

          {/* Danh sách xem trước */}
          <div className="flex flex-col gap-2">
            {parsedRows.map((row) => (
              <div
                key={`${row.branchId}-${row.rawRowNumber}`}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  row.status === "ERROR"
                    ? "border-danger-border bg-danger-bg/30"
                    : "border-border bg-surface"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  row.status === "ERROR" ? "bg-danger-bg text-danger" : "bg-primary/10 text-primary"
                }`}>
                  <Store size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body-sm font-bold text-text">{row.branchName}</span>
                    <code className="text-caption-sm font-mono text-text-muted">[{row.branchId}]</code>
                    {row.status === "ERROR" && (
                      <span className="text-caption-sm text-danger font-semibold">⚠ {row.errorMessage}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {row.channels?.phone && (
                      <span className="text-caption text-text-muted flex items-center gap-1">
                        <Phone size={11} /> {row.channels.phone}
                      </span>
                    )}
                    {row.channels?.telegramChatId && (
                      <span className="text-caption text-primary flex items-center gap-1">
                        <Bot size={11} /> {row.channels.telegramChatId}
                      </span>
                    )}
                    <span className="text-caption text-text-muted flex items-center gap-1">
                      <MapPin size={11} /> R={row.maxDeliveryRadiusKm}km
                    </span>
                    <span className="text-caption text-text-muted flex items-center gap-1">
                      <Star size={11} /> KPI: {row.qualityScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BranchPartnerList />
    </div>
  )
}
