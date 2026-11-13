"use client"

import React from "react"
import { Layers } from "@/components/ui/icon-set/layers"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FlowerPlaceholder } from "@/components/ui/flower-placeholder"
import { formatCurrency } from "@/lib/i18n/formatters"

export function ProductStatusBadge({ status }: { status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT" }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-caption font-bold text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        Đang bán
      </span>
    )
  }
  if (status === "PAUSED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-0.5 text-caption font-bold text-warning-text">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        Tạm ngưng
      </span>
    )
  }
  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-caption font-bold text-warning-text">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
        Lưu trữ
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-0.5 text-caption font-bold text-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-text-muted" aria-hidden="true" />
      Nháp
    </span>
  )
}

export function ProductOverviewCard({
  name,
  code,
  status,
  priceVnd,
  primaryColor,
  displayImageUrl,
}: {
  name: string
  code: string
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DRAFT"
  priceVnd: number | null
  primaryColor: string | null
  displayImageUrl: string | null
}) {
  return (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-alt text-secondary overflow-hidden border border-border">
          {displayImageUrl ? (
            <img src={displayImageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <FlowerPlaceholder size={36} />
          )}
        </div>
        <div>
          <h2 className="text-title font-bold text-text">{name}</h2>
          <div className="mt-0.5 text-body-sm text-text-muted">Mã định danh: {code}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-body-sm font-bold text-primary">
              {priceVnd ? formatCurrency(priceVnd) : "Liên hệ báo giá"}
            </span>
            {primaryColor && (
              <span className="rounded-md bg-surface-alt px-2 py-0.5 text-caption font-semibold text-text">
                Tông màu: {primaryColor}
              </span>
            )}
          </div>
        </div>
      </div>
      <ProductStatusBadge status={status} />
    </Card>
  )
}

export function ProductDesignCard({
  shape,
  facing,
  container,
}: {
  shape: string | null
  facing: string | null
  container: string | null
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-text-muted">
        <Layers size={14} aria-hidden="true" />
        Định dạng thiết kế
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="rounded-xl bg-surface-alt p-3">
          <div className="text-caption text-text-muted">Hình dáng thiết kế</div>
          <div className="text-body-sm font-semibold text-text mt-0.5">{shape ?? "—"}</div>
        </div>
        <div className="rounded-xl bg-surface-alt p-3">
          <div className="text-caption text-text-muted">Mặt nhìn / Hướng nhìn</div>
          <div className="text-body-sm font-semibold text-text mt-0.5">{facing ?? "—"}</div>
        </div>
        <div className="rounded-xl bg-surface-alt p-3">
          <div className="text-caption text-text-muted">Vật chứa / Giá đỡ</div>
          <div className="text-body-sm font-semibold text-text mt-0.5">{container ?? "—"}</div>
        </div>
      </div>
    </Card>
  )
}

/** Một dòng thành phần hoa đọc từ `attributes.bom.flowers` (JSON tự do, mọi trường có thể thiếu). */
export interface BomFlowerView {
  name?: string
  role?: string
  color?: string
  quantity?: number | string
  unit?: string
}

export function ProductBomCard({
  flowers,
  onOpenModal,
}: {
  flowers: BomFlowerView[]
  onOpenModal: () => void
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-text-muted">
          <Flower2 size={14} aria-hidden="true" />
          Định mức vật tư & Thành phần cấu thành
        </div>
        {flowers.length === 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenModal}
            className="text-caption font-bold text-primary hover:underline flex items-center gap-1 h-auto p-0 hover:bg-transparent"
          >
            <Sparkles size={12} />
            Dùng AI nhận diện
          </Button>
        )}
      </div>

      {flowers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {flowers.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-alt/50 p-2.5"
            >
              <div>
                <div className="text-body-sm font-bold text-text">{item.name}</div>
                <div className="text-caption text-text-muted">
                  {item.role || "Chủ đạo"} · {item.color || "Tiêu chuẩn"}
                </div>
              </div>
              <span className="rounded-lg bg-surface px-2 py-1 text-caption font-bold text-primary border border-border">
                {item.quantity} {item.unit || "cái"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface-alt/30 p-4 text-center">
          <p className="text-body-sm text-text-muted">Sản phẩm chưa có dữ liệu định mức vật tư chi tiết.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenModal}
            className="mt-2.5 text-primary border-primary/30 gap-1.5"
          >
            <Sparkles size={14} />
            Phân tích AI để bổ sung thành phần
          </Button>
        </div>
      )}
    </Card>
  )
}

export function ProductStoryCard({
  description,
  onOpenModal,
}: {
  description: string | null
  onOpenModal: () => void
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-text-muted">
          <FileText size={14} aria-hidden="true" />
          Câu chuyện và thông điệp sản phẩm
        </div>
        {!description && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenModal}
            className="text-caption font-bold text-primary hover:underline flex items-center gap-1 h-auto p-0 hover:bg-transparent"
          >
            <Sparkles size={12} />
            Viết bằng Content Engine
          </Button>
        )}
      </div>

      {description ? (
        <div className="rounded-xl bg-surface-alt p-3.5 text-body-sm text-text leading-relaxed">
          {description}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface-alt/30 p-4 text-center">
          <p className="text-body-sm text-text-muted">
            Chưa có câu chuyện và thông điệp tiếp thị cho sản phẩm này.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenModal}
            className="mt-2.5 text-primary border-primary/30 gap-1.5"
          >
            <Sparkles size={14} />
            Trau chuốt bằng Content Engine
          </Button>
        </div>
      )}
    </Card>
  )
}
