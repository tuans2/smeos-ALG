"use client"

import React from "react"
import Link from "next/link"
import { Eye } from "@/components/ui/icon-set/eye"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductThumb } from "@/components/products/product-thumb"
import { PriceLabel, type ProductItem, StatusBadge } from "@/components/products/product-card"
import { useI18n } from "@/lib/i18n"

export interface ProductTableViewProps {
  products: ProductItem[]
  isExecutive?: boolean
  onTrash?: (product: ProductItem) => void
  onImageClick?: (product: ProductItem) => void
  /** Có thì hiện cột chọn để thao tác hàng loạt (chỉ dạng bảng trên máy tính). */
  selectedIds?: ReadonlySet<string> | undefined
  onToggleSelect?: ((ids: string[], selected: boolean) => void) | undefined
}

export function ProductTableView({ products, isExecutive, onTrash, onImageClick, selectedIds, onToggleSelect }: ProductTableViewProps) {
  const { dict } = useI18n()
  const selectable = Boolean(selectedIds && onToggleSelect)
  const allSelected = selectable && products.length > 0 && products.every((p) => selectedIds?.has(p.id))
  return (
    <>
      {/* Mobile view: Card List */}
      <div className="space-y-3 md:hidden">
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 space-y-3"
          >
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onImageClick?.(p)}
                title={`Xem bảng thông số & phân tích AI cho ${p.name}`}
                aria-label={`Xem bảng thông số & phân tích AI cho ${p.name}`}
                className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-surface-alt border border-border p-0 text-left"
              >
                <ProductThumb
                  name={p.name}
                  masterImageUrl={p.masterImageUrl}
                  driveLink={p.driveLink}
                  size="row"
                />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate font-bold text-body text-text">{p.name}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-0.5 text-caption text-text-muted font-mono">#{p.code}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-caption">
                  <span className="rounded-md bg-surface-alt px-2 py-0.5 font-medium text-text-muted">
                    {p.category ?? "Chung"}
                  </span>
                  <PriceLabel price={p.price_vnd} attributes={p.attributes} />
                </div>
              </div>
            </div>

            {/* Mobile Actions: Touch targets ≥ 40px */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <Link
                href={`/san-pham/${p.id}` as never}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-border bg-surface px-3 text-body-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Eye size={15} />
                <span>{dict.products.card.viewDetails}</span>
              </Link>
              <Link
                href={`/san-pham/${p.id}/tinh-nang` as never}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-primary text-white px-3 text-body-sm font-semibold hover:bg-primary-dark transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Sparkles size={15} />
                <span>{dict.products.card.openStudio}</span>
              </Link>
              {isExecutive && onTrash && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onTrash(p)}
                  aria-label={`Xóa ${p.name}`}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-danger/30 text-danger hover:bg-danger-bg hover:text-danger"
                  title="Chuyển vào thùng rác"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view: Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-body-sm">
          <thead className="border-b border-border bg-surface-alt text-caption font-bold text-text-muted">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <Checkbox
                    aria-label="Chọn tất cả sản phẩm đang hiển thị"
                    checked={allSelected}
                    onCheckedChange={(checked) => onToggleSelect?.(products.map((p) => p.id), !!checked)}
                  />
                </th>
              )}
              <th scope="col" className="px-4 py-3">{dict.products.table.product}</th>
              <th scope="col" className="px-4 py-3">{dict.products.table.category}</th>
              <th scope="col" className="px-4 py-3">{dict.products.table.price}</th>
              <th scope="col" className="px-4 py-3">{dict.products.table.status}</th>
              <th scope="col" className="px-4 py-3 text-right">{dict.products.table.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-surface-alt/50">
                {selectable && (
                  <td className="px-4 py-3">
                    <Checkbox
                      aria-label={`Chọn ${p.name}`}
                      checked={selectedIds?.has(p.id) ?? false}
                      onCheckedChange={(checked) => onToggleSelect?.([p.id], !!checked)}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-semibold text-text">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onImageClick?.(p)}
                      title={`Xem bảng thông số & phân tích AI cho ${p.name}`}
                      aria-label={`Xem bảng thông số & phân tích AI cho ${p.name}`}
                      className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-surface-alt border border-border p-0 text-left"
                    >
                      <ProductThumb
                        name={p.name}
                        masterImageUrl={p.masterImageUrl}
                        driveLink={p.driveLink}
                        size="row"
                      />
                    </Button>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-text">{p.name}</div>
                      <div className="text-caption text-text-muted font-mono">#{p.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-caption text-text">{p.category ?? "—"}</td>
                <td className="px-4 py-3">
                  <PriceLabel price={p.price_vnd} attributes={p.attributes} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/san-pham/${p.id}` as never}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-caption font-semibold text-text-muted hover:bg-surface-alt hover:text-text transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                      title={dict.products.card.viewDetails}
                    >
                      <Eye size={13} />
                      <span>{dict.products.card.viewDetails}</span>
                    </Link>
                    <Link
                      href={`/san-pham/${p.id}/tinh-nang` as never}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-caption font-semibold text-text hover:border-primary/40 hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                      title={dict.products.card.openStudio}
                    >
                      <Sparkles size={13} />
                      <span>{dict.products.card.openStudio}</span>
                    </Link>
                    {isExecutive && onTrash && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onTrash(p)}
                        aria-label={`Xóa ${p.name}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-caption font-semibold text-text-muted hover:bg-danger-bg hover:text-danger h-auto"
                        title={dict.products.card.moveToTrashConfirm}
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
