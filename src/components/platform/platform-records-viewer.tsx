"use client"

/**
 * Platform Records Viewer
 *
 * Hiển thị bản ghi thực tế (sản phẩm, đơn hàng, thành viên...)
 * của một tổ chức. Hỗ trợ phân trang và xuất CSV.
 */

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Download } from "@/components/ui/icon-set/download"
import { ChevronLeft } from "@/components/ui/icon-set/chevron-left"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Package } from "@/components/ui/icon-set/package"
import { ShoppingCart } from "@/components/ui/icon-set/shopping-cart"
import { Users } from "@/components/ui/icon-set/users"
import { Building2 } from "@/components/ui/icon-set/building2"
import { UserCircle } from "@/components/ui/icon-set/user-circle"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import { formatDateTime } from "@/lib/i18n/formatters"
import type { PlatformOrgRecordsResult, RecordDomain } from "@/modules/platform/use-cases/get-platform-org-records"
import type { RecordColumn } from "@/modules/platform/use-cases/get-platform-org-records"

const DOMAIN_META: Record<
  RecordDomain,
  { label: string; icon: React.ElementType; color: string }
> = {
  catalog: { label: "Danh mục sản phẩm", icon: Package, color: "text-success" },
  orders: { label: "Đơn hàng", icon: ShoppingCart, color: "text-info" },
  members: { label: "Thành viên", icon: Users, color: "text-accent-text" },
  branches: { label: "Chi nhánh", icon: Building2, color: "text-warning-text" },
  customers: { label: "Khách hàng", icon: UserCircle, color: "text-danger" },
  jobs: { label: "AI Jobs", icon: Cpu, color: "text-primary" },
  spreadsheets: { label: "File Excel / Bảng tính gốc", icon: FileSpreadsheet, color: "text-success" },
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  DRAFT: "bg-warning/15 text-warning-text",
  ARCHIVED: "bg-danger/15 text-danger",
  COMPLETED: "bg-success/15 text-success",
  PROCESSING: "bg-blue-100 text-blue-700",
  FAILED: "bg-danger/15 text-danger",
  PENDING: "bg-surface-alt text-text-muted",
  INVITED: "bg-blue-100 text-blue-700",
  ACTIVE_MEMBER: "bg-success/15 text-success",
  "Hoạt động": "bg-success/15 text-success",
  "Tạm dừng": "bg-danger/15 text-danger",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/15 text-danger",
  MANUAL: "bg-surface-alt text-text-muted",
  BROCHURE: "bg-violet-100 text-violet-700",
  CHAT: "bg-blue-100 text-blue-700",
  WAITING: "bg-warning/15 text-warning-text",
  DONE: "bg-success/15 text-success",
}

function CellValue({
  value,
  col,
}: {
  value: unknown
  col: RecordColumn
}) {
  if (value === null || value === undefined || value === "—") {
    return <span className="text-text-muted/60">—</span>
  }

  if (col.type === "badge") {
    const s = String(value)
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold ${STATUS_COLOR[s] ?? "bg-surface-alt text-text-muted"}`}
      >
        {s}
      </span>
    )
  }

  if (col.type === "money") {
    const n = Number(value)
    if (isNaN(n)) return <span className="text-text-muted/60">—</span>
    return (
      <span className="font-mono font-semibold">
        {n.toLocaleString("vi-VN")}₫
      </span>
    )
  }

  if (col.type === "date") {
    const d = new Date(String(value))
    if (isNaN(d.getTime())) return <span>{String(value)}</span>
    return (
      <span className="text-text-muted">
        {formatDateTime(d)}
      </span>
    )
  }

  if (col.type === "image" || col.key === "image_thumb") {
    const src = String(value)
    if (!src || src === "—") {
      return (
        <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center text-text-muted/40">
          <Package size={16} />
        </div>
      )
    }
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="block group relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-surface-alt shrink-0"
        title="Xem ảnh gốc"
      >
        <img
          src={src}
          alt="Ảnh sản phẩm"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
          loading="lazy"
        />
      </a>
    )
  }

  if (col.key === "image_url") {
    const src = String(value)
    if (!src || src === "—") return <span className="text-text-muted/60">—</span>
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline text-caption font-mono truncate max-w-[180px] inline-block"
      >
        Xem ảnh ↗
      </a>
    )
  }

  if (col.key === "download_url") {
    const src = String(value)
    if (!src || src === "—") return <span className="text-text-muted/60">—</span>
    return (
      <a
        href={src}
        download
        className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-caption bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
      >
        <Download size={12} />
        Tải file (.xlsx)
      </a>
    )
  }

  return <span>{String(value)}</span>
}

interface PlatformRecordsViewerProps {
  readonly orgId: string
  readonly orgName: string
  readonly domain: RecordDomain
}

export function PlatformRecordsViewer({
  orgId,
  orgName,
  domain,
}: PlatformRecordsViewerProps) {
  const [data, setData] = useState<PlatformOrgRecordsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const meta = DOMAIN_META[domain]
  const Icon = meta.icon

  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/v1/platform/orgs-data/${orgId}/records/${domain}?page=${p}`
        )
        if (res.ok) {
          const json = await res.json()
          setData(json.data as PlatformOrgRecordsResult)
          setPage(p)
        }
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    },
    [orgId, domain]
  )

  useEffect(() => {
    void Promise.resolve().then(() => loadPage(1))
  }, [loadPage])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch(
        `/api/v1/platform/orgs-data/${orgId}/records/${domain}?export=csv`
      )
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${domain}-${orgName.replace(/\s+/g, "_")}.csv`
        URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const [exportingZip, setExportingZip] = useState(false)

  const handleExportZip = async () => {
    setExportingZip(true)
    try {
      const res = await fetch(`/api/v1/platform/orgs-data/${orgId}/export?type=full`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${orgName.replace(/\s+/g, "_")}_full_data.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingZip(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon size={20} className={meta.color} />
          <div>
            <h2 className="font-bold text-body-sm text-text">
              {meta.label} — {orgName}
            </h2>
            {data && (
              <p className="text-caption text-text-muted">
                Tổng cộng{" "}
                <strong className="text-text">{data.total.toLocaleString("vi-VN")}</strong>{" "}
                bản ghi · Trang {data.page}/{data.totalPages}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => void handleExportCsv()}
            disabled={exporting || !data}
            className="gap-1.5 font-bold bg-primary hover:bg-primary-dark text-white shrink-0"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Download size={14} />
            )}
            {exporting ? "Đang xuất…" : `Tải CSV (${data?.total ?? "…"} dòng)`}
          </Button>

          <Button
            size="sm"
            onClick={() => void handleExportZip()}
            disabled={exportingZip || !data}
            variant="outline"
            className="gap-1.5 font-bold border-primary/40 text-primary hover:bg-primary/10 shrink-0"
            title="Tải toàn bộ CSV của 6 mảng dữ liệu kèm toàn bộ ảnh sản phẩm dạng .ZIP"
          >
            {exportingZip ? (
              <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Download size={14} />
            )}
            {exportingZip ? "Đang gói ZIP…" : "Tải Trọn Bộ + Ảnh (.ZIP)"}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonBlock lines={8} />
      ) : !data || data.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Icon size={32} className={`mx-auto mb-2 ${meta.color} opacity-40`} />
          <p className="font-bold text-text">Chưa có dữ liệu</p>
          <p className="text-caption text-text-muted mt-1">
            Tổ chức này chưa có bản ghi nào trong mục {meta.label}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-caption min-w-max">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="py-2.5 px-3 font-bold text-text-muted w-8">#</th>
                  {data.columns.map((col) => (
                    <th key={col.key} className="py-2.5 px-3 font-bold text-text-muted whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((row, idx) => (
                  <tr
                    key={String(row.id ?? idx)}
                    className="hover:bg-surface-alt/60 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-text-muted font-mono">
                      {(page - 1) * 100 + idx + 1}
                    </td>
                    {data.columns.map((col) => (
                      <td key={col.key} className="py-2.5 px-3 max-w-[240px] truncate">
                        <CellValue value={row[col.key]} col={col} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between text-caption">
              <span className="text-text-muted">
                Hiển thị{" "}
                <strong>{(page - 1) * 100 + 1}–{Math.min(page * 100, data.total)}</strong>{" "}
                / {data.total.toLocaleString("vi-VN")} bản ghi
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Trang trước"
                  onClick={() => void loadPage(page - 1)}
                  disabled={page <= 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft size={14} />
                </Button>

                {/* Page number pills */}
                {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
                  const p = i + 1
                  return (
                    <Button variant="ghost"
                      type="button"
                      key={p}
                      onClick={() => void loadPage(p)}
                      className={`px-0 py-0 gap-0 cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-lg text-caption font-bold transition-colors ${
                        p === page
                          ? "bg-primary text-white hover:bg-primary"
                          : "hover:bg-surface-alt text-text-muted"
                      }`}
                    >
                      {p}
                    </Button>
                  )
                })}
                {data.totalPages > 7 && (
                  <span className="text-text-muted px-1">…{data.totalPages}</span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Trang tiếp"
                  onClick={() => void loadPage(page + 1)}
                  disabled={page >= data.totalPages || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
