"use client"

import React from "react"
import { Flower2 } from "@/components/ui/icons"
import type { CatalogPageModel, StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { formatCurrency } from "@/lib/i18n/formatters"

interface ExtraLayoutProps {
  page: CatalogPageModel
  style: StyleDefinition
}

/** L03 — trang phân chương theo nhóm mẫu: ảnh đại diện nhóm, tên nhóm, số mẫu. */
export function CollectionDividerLayout({ page, style }: ExtraLayoutProps) {
  const { tokens, typography, imageRules } = style
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-6 text-center">
      <div className="space-y-2">
        <span className="text-caption font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
          {page.subtitle}
        </span>
        <h2 className={`${typography.scale.cover} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>
          {page.title}
        </h2>
      </div>
      {page.heroImage && (
        <div className={`h-80 w-full overflow-hidden ${imageRules.borderRadius} ${imageRules.shadow}`}>
          <img src={page.heroImage} alt={page.title ?? ""} className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  )
}

/** L06 — trang chi tiết một mẫu: ảnh lớn, mã, giá, mô tả và thông tin thật của mẫu (không bịa thông số). */
export function ProductDetailLayout({ page, style }: ExtraLayoutProps) {
  const { tokens, typography, imageRules } = style
  const p = page.products[0]
  if (!p) return null
  const stems = typeof p.attributes?.stemCount === "number" ? p.attributes.stemCount : null
  const body = p.description || p.shortDescription
  return (
    <div className="flex h-full flex-col gap-4">
      <div className={`h-96 w-full overflow-hidden ${imageRules.borderRadius} ${imageRules.shadow}`} style={{ backgroundColor: tokens.surface }}>
        {p.primaryImage ? (
          <img src={p.primaryImage} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted"><Flower2 className="h-12 w-12 stroke-[1.5]" /></div>
        )}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className={`${typography.scale.title} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>{p.name}</h2>
          <div className="text-caption font-mono text-text-muted">Mã: {p.code}</div>
        </div>
        <div className="shrink-0 text-title font-bold" style={{ color: tokens.price }}>
          {p.price ? formatCurrency(p.price) : "Liên hệ"}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-body-sm">
        {p.category && (<><dt className="text-text-muted">Nhóm</dt><dd className="text-text">{p.category}</dd></>)}
        {stems && (<><dt className="text-text-muted">Số cành</dt><dd className="text-text">{stems}</dd></>)}
        {p.variants && p.variants.length > 0 && (<><dt className="text-text-muted">Lựa chọn</dt><dd className="text-text">{p.variants.map((v) => v.name).join(", ")}</dd></>)}
      </dl>
      {body && <p className={typography.scale.body} style={{ color: tokens.textSecondary }}>{body}</p>}
    </div>
  )
}
