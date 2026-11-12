"use client"

import { parsePricing, priceLabel, summarizePricing } from "@/modules/products/domain/product-pricing"
import React from "react"
import Link from "next/link"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { ProductThumb } from "@/components/products/product-thumb"
import { readProposal, type ProposalStatus } from "@/modules/products/domain/product-proposal"
import { formatCurrency } from "@/lib/i18n/formatters"

export type ProductItem = {
  id: string
  name: string
  code: string
  category: string | null
  shape: string | null
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
  masterImageUrl?: string | undefined
  driveLink?: string | undefined
  price_vnd: number | null
  attributes?: Record<string, unknown> | null | undefined
}

export function StatusBadge({ status }: { status: ProductItem["status"] }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-caption font-bold text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        Đang bán
      </span>
    )
  }
  if (status === "PAUSED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-caption font-bold text-warning-text">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        Tạm ngưng
      </span>
    )
  }
  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-caption font-bold text-warning-text">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        Đã lưu trữ
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-caption font-bold text-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-text-muted" aria-hidden="true" />
      Bản nháp
    </span>
  )
}

const PROPOSAL_LABEL: Partial<Record<ProposalStatus, string>> = {
  pending: "Đề xuất · chờ duyệt",
  rejected: "Đề xuất bị từ chối",
  expired: "Đề xuất hết hạn",
}

/** Nhãn mẫu nhân viên đề xuất: chờ duyệt (đang dùng được), bị từ chối hoặc hết hạn (đã tạm ẩn). */
export function ProposalBadge({ attributes }: { attributes?: Record<string, unknown> | null | undefined }) {
  const status = readProposal(attributes)?.status
  const label = status ? PROPOSAL_LABEL[status] : undefined
  if (!label) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-bold ${status === "pending" ? "bg-warning-bg text-warning-text" : "bg-danger-bg text-danger"}`}>
      {label}
    </span>
  )
}

export function PriceLabel({ price, attributes }: { price: number | null; attributes?: Record<string, unknown> | null | undefined }) {
  // Sản phẩm đã khai kiểu giá (khoảng giá / liên hệ) → nhãn theo kiểu giá
  if (attributes?.pricing) {
    const summary = summarizePricing(parsePricing(attributes))
    if (summary.mode !== "FIXED" || summary.minVnd !== summary.maxVnd) {
      return <span className="text-caption font-semibold text-primary">{priceLabel(summary)}</span>
    }
  }
  if (price === null) {
    return <span className="text-caption text-text-muted italic">Liên hệ báo giá</span>
  }
  return (
    <span className="text-caption font-semibold text-primary">
      {formatCurrency(price)}
    </span>
  )
}

export interface ProductCardProps {
  product: ProductItem
  isExecutive?: boolean
  onTrash?: (product: ProductItem) => void
  onImageClick?: (product: ProductItem) => void
  /** Thẻ nằm trong khung nhìn đầu tiên: ảnh tải ưu tiên. */
  priority?: boolean | undefined
  /** Nhãn tiếng Việt của danh mục (thay cho mã trong dữ liệu) */
  categoryLabel?: string | null | undefined
}

export function ProductCard({ product, isExecutive, onTrash, onImageClick, priority = false, categoryLabel }: ProductCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      {/* Vùng ảnh sản phẩm: Bấm để mở Bảng thông số sản phẩm & Phân tích AI */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onImageClick?.(product)}
        className="relative aspect-square w-full h-auto p-0 rounded-none bg-surface-alt overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-primary cursor-pointer group/img block"
      >
        <ProductThumb
          name={product.name}
          masterImageUrl={product.masterImageUrl}
          driveLink={product.driveLink}
          size="card"
          priority={priority}
        />
        {/* Tên nút bằng chữ ẩn thay aria-label: ô "Chưa có ảnh" là chữ nhìn thấy, aria-label sẽ lệch (WCAG 2.5.3) */}
        <span className="sr-only">Xem bảng thông số và phân tích AI cho {product.name}</span>
      </Button>
      {/* Nhãn trạng thái nằm ngoài nút ảnh để tên nút khớp chữ hiển thị (WCAG 2.5.3, Đợt 4 D4-10); vị trí giữ nguyên */}
      <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none">
        <StatusBadge status={product.status} />
        <ProposalBadge attributes={product.attributes} />
      </div>

      {/* Thông tin sản phẩm: Bấm vào tên để chuyển sang trang chi tiết */}
      <Link
        href={`/san-pham/${product.id}` as never}
        className="flex flex-col flex-1 p-3 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="truncate text-body-sm font-bold text-text group-hover:text-primary transition-colors">
          {product.name}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="truncate text-caption text-text-muted">
            {categoryLabel ?? product.category ?? "Chưa phân loại"}
          </span>
          <PriceLabel price={product.price_vnd} attributes={product.attributes} />
        </div>
        <div className="mt-1 text-caption text-text-muted font-mono">#{product.code}</div>
      </Link>

      {/* Nút xóa – chỉ Điều hành */}
      {isExecutive && onTrash && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault()
            onTrash(product)
          }}
          aria-label={`Chuyển "${product.name}" vào thùng rác`}
          className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/55 text-white hover:bg-danger hover:text-white p-0"
          title="Chuyển vào thùng rác"
        >
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  )
}
