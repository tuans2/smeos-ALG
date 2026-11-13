"use client"

import { useI18n } from "@/lib/i18n"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/session"
import { isChainOrganizationType } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { BulkImportHeader } from "@/components/products/bulk-import/bulk-import-header"
import { ImportDropzones } from "@/components/products/bulk-import/import-dropzones"
import { ImportPreview, importStats } from "@/components/products/bulk-import/import-preview"
import { ImportResultPanel } from "@/components/products/bulk-import/import-result-panel"
import { clearImportSession, loadImportSession, saveImportSession } from "@/components/products/bulk-import/import-session-storage"
import { parseProductWorkbook } from "@/components/products/bulk-import/parse-product-sheet"
import { runBulkImport } from "@/components/products/bulk-import/run-bulk-import"
import { useDriveThumbs } from "@/components/products/bulk-import/use-drive-thumbs"
import type { ImportProgress, ImportResult, ParsedProductRow } from "@/components/products/bulk-import/types"
import { BranchImportPanel } from "@/components/products/bulk-import/branch-import-panel"
import { validateSpreadsheetSecurity } from "@/modules/platform/domain/spreadsheet-security"

type ActiveTab = "products" | "branches"

const TEMPLATE_PATH = "/templates/ALG_Template_Master_Kho_San_Pham.xlsx"

/** Đối chiếu ảnh: ưu tiên tên file ghi trong Excel, sau đó mã SKU trùng tên ảnh. */
function matchImages(rows: ParsedProductRow[], images: Map<string, File>): ParsedProductRow[] {
  return rows.map((row) => {
    if (row.status === "ERROR") return row
    const imgKey = row.imageFileName.trim().toLowerCase()
    const imgBase = imgKey.substring(0, imgKey.lastIndexOf(".")) || imgKey
    const matched = images.get(imgKey) || images.get(imgBase) || images.get(row.code.trim().toLowerCase())
    if (matched) return { ...row, matchedFile: matched, previewUrl: URL.createObjectURL(matched), status: "MATCHED" as const }
    return { ...row, matchedFile: null, previewUrl: null, status: row.driveLink ? ("DRIVE_SYNC" as const) : ("NO_IMAGE" as const) }
  })
}

export default function BulkImportProductsPage() {
  const { t } = useI18n()
  const router = useRouter()
  const session = useSession()
  const orgId = session.organization?.id
  const isChain = isChainOrganizationType(session.organizationType)
  const [activeTab, setActiveTab] = useState<ActiveTab>("products")

  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelFileName, setExcelFileName] = useState("")
  const [imageFiles, setImageFiles] = useState<Map<string, File>>(new Map())
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([])
  const [parsingError, setParsingError] = useState<string | null>(null)
  const [restoredFromSession, setRestoredFromSession] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0, phase: "" })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const driveThumbs = useDriveThumbs(parsedRows)
  const stats = useMemo(() => importStats(parsedRows), [parsedRows])

  // Biết orgId (hoặc đổi tổ chức) → khôi phục đúng phiên của tổ chức đó. sessionStorage chỉ đọc được
  // phía client sau khi hydrate nên phải ở effect (đọc khi render sẽ lệch HTML với server).
  useEffect(() => {
    if (!orgId) return
    const saved = loadImportSession(orgId)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- khôi phục dữ liệu chỉ có ở trình duyệt, theo orgId
    setParsedRows(saved?.rows ?? [])
    setExcelFileName(saved?.excelFileName ?? "")
    setRestoredFromSession(Boolean(saved))
  }, [orgId])

  useEffect(() => {
    if (orgId && parsedRows.length > 0) saveImportSession(parsedRows, excelFileName, orgId)
  }, [parsedRows, excelFileName, orgId])

  // Thu hồi blob URL của bộ dòng cũ khi bộ dòng đổi / rời trang
  useEffect(() => () => {
    parsedRows.forEach((r) => r.previewUrl?.startsWith("blob:") && URL.revokeObjectURL(r.previewUrl))
  }, [parsedRows])

  function resetAll() {
    setImportResult(null)
    setParsedRows([])
    setExcelFile(null)
    setExcelFileName("")
    setRestoredFromSession(false)
    if (orgId) clearImportSession(orgId)
  }

  function downloadTemplate() {
    const link = document.createElement("a")
    link.href = TEMPLATE_PATH
    link.download = TEMPLATE_PATH.split("/").pop()!
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExcelFile(file)
    setExcelFileName(file.name)
    setRestoredFromSession(false)
    setParsingError(null)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const buffer = evt.target?.result as ArrayBuffer
      if (!buffer) return

      // 1. Kiểm tra an ninh & chống virus/macro/phishing
      const sec = validateSpreadsheetSecurity(buffer, file.name)
      if (!sec.isValid) {
        setParsingError(sec.error ?? "Tệp tải lên không an toàn")
        setParsedRows([])
        setExcelFile(null)
        return
      }

      // 2. Parse workbook an toàn
      try {
        const rows = parseProductWorkbook(buffer, file.name)
        setParsedRows(matchImages(rows, imageFiles))
      } catch (err) {
        setParsingError(err instanceof Error ? err.message : "Lỗi đọc file Excel")
        setParsedRows([])
        return
      }

      // 3. Tự động lưu trữ bản gốc vào kho asset của tổ chức để có thể xem lại/tải về từ SaaS Admin
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
                  source: "bulk_import",
                },
              }),
            })
          }
        }
      } catch {
        // Lưu trữ ngầm — không chặn luồng import nếu lưu tệp gặp sự cố mạng
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleImagesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const images = new Map<string, File>()
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue
      // Khớp theo tên file chữ thường, có và không có đuôi ("fl-1001.jpg" / "fl-1001")
      const name = file.name.trim().toLowerCase()
      images.set(name, file)
      images.set(name.substring(0, name.lastIndexOf(".")) || name, file)
    }
    setImageFiles(images)
    if (parsedRows.length > 0) setParsedRows(matchImages(parsedRows, images))
  }

  async function handleExecuteImport() {
    if (stats.total - stats.errors === 0) return
    setIsImporting(true)
    setImportResult(null)
    try {
      setImportResult(await runBulkImport(parsedRows, setImportProgress))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <BulkImportHeader
        restoredCount={restoredFromSession ? parsedRows.length : 0}
        validCount={stats.total - stats.errors}
        isImporting={isImporting}
        onBack={() => router.push("/san-pham" as never)}
        onClearRestored={resetAll}
        onDownloadTemplate={downloadTemplate}
        onImport={() => void handleExecuteImport()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showBranchesTab={isChain}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
        {activeTab === "branches" && isChain ? (
          <BranchImportPanel />
        ) : (
          <>
            {importResult && (
              <ImportResultPanel result={importResult} onBack={() => router.push("/san-pham" as never)} onReset={resetAll} />
            )}
            {parsingError && (
              <div role="alert" className="rounded-xl border border-danger/30 bg-danger-bg/40 p-3 text-body-sm text-danger">
                {parsingError}
              </div>
            )}
            <ImportDropzones
              excelFile={excelFile}
              excelFileName={excelFileName}
              imageCount={imageFiles.size}
              isImporting={isImporting}
              onDownloadTemplate={downloadTemplate}
              onExcelChange={handleExcelUpload}
              onImagesChange={handleImagesUpload}
            />
            <ImportPreview
              rows={parsedRows}
              stats={stats}
              isImporting={isImporting}
              progressPhase={importProgress.phase}
              driveThumbs={driveThumbs}
            />
          </>
        )}
      </div>
    </div>
  )
}
