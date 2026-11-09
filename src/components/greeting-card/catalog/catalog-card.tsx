"use client"

import React from "react"
import { Check, ChevronRight, Copy, Download, Edit2, Eye, Loader2, Package, RotateCcw, Trash2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

export type CatalogItem = {
  id: string
  code: string
  name: string
  type: "STANDARD" | "CLIENT"
  description: string | null
  is_active: boolean
  created_by: string
  created_at: string
  _count: { items: number; sessions: number }
}

type Props = {
  catalog: CatalogItem
  /** Người tạo hoặc người có L4 — server kiểm lại, đây chỉ để ẩn nút. */
  canManageState: boolean
  copied: boolean
  deleting: boolean
  restoring: boolean
  onSelect: () => void
  onPreview: () => void
  onCopy: () => void
  onDelete: () => void
  onRestore: () => void
}

/** Thẻ một bộ sưu tập trong lưới danh sách. */
export function CatalogCard({
  catalog, canManageState, copied, deleting, restoring, onSelect, onPreview, onCopy, onDelete, onRestore,
}: Props) {
  const { ti } = useI18n()
  const itemLabel = (ti("sampleProduct") || "sản phẩm").replace(/ chuẩn$/i, "").toLowerCase()

  return (
    <div
      className="bg-surface rounded-2xl border border-border p-5 flex flex-col gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-caption font-bold uppercase">
              {catalog.type === "STANDARD" ? "Tiêu chuẩn" : "Riêng khách"}
            </span>
            {!catalog.is_active && (
              <span className="px-2 py-0.5 rounded-full bg-danger-bg text-danger text-caption font-bold">
                Đã ẩn
              </span>
            )}
          </div>
          <h3 className="text-body font-extrabold text-text truncate">{catalog.name}</h3>
          <p className="text-caption text-text-muted font-mono mt-0.5">
            <span>{catalog.code}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-caption text-text-muted">
          <Package size={13} />
          <span>
            <strong className="text-text">{catalog._count.items}</strong> {itemLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-caption text-text-muted">
          <Eye size={13} />
          <span>
            <strong className="text-text">{catalog._count.sessions}</strong> link đã gửi
          </span>
        </div>
      </div>

      {catalog.description && (
        <p className="text-caption text-text-muted line-clamp-2 border-t border-border pt-3">
          {catalog.description}
        </p>
      )}

      {/* Nút chính một hàng riêng — không bị ép chữ khi vai có thêm nút (xoá) */}
      <div className="flex flex-wrap items-center gap-2 mt-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelect}
          className="basis-full whitespace-nowrap text-caption gap-1.5 h-8"
        >
          <Edit2 size={12} />
          <span>Quản lý {itemLabel}</span>
        </Button>
        <Button variant="outline"
          type="button"
          onClick={onPreview}
          title="Xem trước giao diện khách sẽ thấy"
          aria-label={`Xem trước link công khai của ${catalog.name}`}
          className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1.5 rounded-lg border border-border hover:bg-surface-muted transition-colors text-text-muted hover:text-text inline-flex items-center"
        >
          <Eye size={14} />
        </Button>
        <Button variant="outline"
          type="button"
          onClick={onCopy}
          title="Sao chép link mang tên bạn — khách mở link này được tính cho bạn"
          aria-label={`Sao chép link bộ sưu tập ${catalog.name} mang tên bạn`}
          className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1.5 rounded-lg border border-border hover:bg-surface-muted transition-colors text-text-muted hover:text-text"
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </Button>
        <a
          href={`/api/v1/greeting-card/catalogs/${catalog.id}/collage`}
          download
          title="Tải ảnh catalog để đăng lên Zalo/Facebook"
          aria-label={`Tải ảnh catalog ${catalog.name}`}
          className="p-1.5 rounded-lg border border-border hover:bg-surface-muted transition-colors text-text-muted hover:text-text inline-flex items-center"
        >
          <Download size={14} />
        </a>
        {catalog.is_active ? (
          canManageState && (
            <Button variant="outline"
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Xóa bộ sưu tập ${catalog.name}`}
              title="Ẩn bộ sưu tập (có thể khôi phục)"
              className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1.5 rounded-lg border border-border hover:bg-danger-bg hover:border-danger/40 hover:text-danger transition-colors text-text-muted"
            >
              {deleting ? (
                <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Trash2 size={14} />
              )}
            </Button>
          )
        ) : (
          canManageState && (
            <Button variant="outline"
              type="button"
              onClick={onRestore}
              disabled={restoring}
              aria-label={`Khôi phục bộ sưu tập ${catalog.name}`}
              title="Khôi phục bộ sưu tập này"
              className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1.5 rounded-lg border border-success/40 bg-success-bg text-success hover:bg-success hover:text-white transition-colors"
            >
              {restoring ? (
                <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <RotateCcw size={14} />
              )}
            </Button>
          )
        )}
        <Button variant="outline"
          type="button"
          onClick={onSelect}
          aria-label={`Mở chi tiết catalog ${catalog.name}`}
          className="text-[length:inherit] h-auto font-[inherit] gap-0 p-1.5 rounded-lg border border-border hover:bg-surface-muted transition-colors text-text-muted"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
