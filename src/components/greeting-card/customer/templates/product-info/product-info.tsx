"use client"

import type { CSSProperties, ReactNode } from "react"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { toProductDisplay } from "./product-display"
import { useDisplayFields } from "./display-fields-context"

/**
 * Mức chi tiết — mọi mẫu dùng cùng thứ tự trường, chỉ khác số trường hiện:
 * - compact:  tên · giá                          (ô lưới, danh sách, so sánh)
 * - standard: + tóm tắt · nhãn                    (thẻ vuốt, reels, gợi ý)
 * - full:     + lời kể · bảng thông số            (bảng chi tiết, câu chuyện)
 */
export type ProductInfoLevel = "compact" | "standard" | "full"

export type ProductInfoSize = "sm" | "md" | "lg"

interface ProductInfoProps {
  product: GreetingCatalogProduct
  level?: ProductInfoLevel
  size?: ProductInfoSize
  /** Màu giá (theo chủ đề mẫu) */
  accent?: string | undefined
  /** Màu chữ phụ (tóm tắt, nhãn, thông số) */
  muted?: string | undefined
  /** Phông/độ đậm/cỡ tiêu đề theo chủ đề mẫu */
  titleStyle?: CSSProperties | undefined
  titleClassName?: string | undefined
  /** Dòng nhỏ phía trên tên mẫu */
  eyebrow?: string | undefined
  /** Phần tử đặt cạnh tên + giá (ví dụ nút xem chi tiết) */
  trailing?: ReactNode
  /** Số dòng tối đa của tên mẫu */
  titleLines?: 1 | 2
  as?: "h2" | "h3"
  id?: string | undefined
  className?: string | undefined
}

const TITLE_SIZE: Record<ProductInfoSize, string> = { sm: "text-body-sm", md: "text-title-sm", lg: "text-title" }
const PRICE_SIZE: Record<ProductInfoSize, string> = { sm: "text-body-sm", md: "text-title-sm", lg: "text-title-sm" }
export function ProductInfo({
  product,
  level = "standard",
  size = "md",
  accent,
  muted,
  titleStyle,
  titleClassName,
  eyebrow,
  trailing,
  titleLines = 2,
  as: Title = "h3",
  id,
  className,
}: ProductInfoProps) {
  const { industry } = useI18n()
  const d = toProductDisplay(product, useDisplayFields(), industry?.identity?.key)
  const mutedStyle = muted ? { color: muted } : undefined

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 flex items-center gap-2 text-caption font-medium uppercase tracking-[0.18em] opacity-75">
              <span aria-hidden="true" className="h-px w-5 bg-current" />
              {eyebrow}
            </p>
          )}
          <Title
            id={id}
            className={cn(titleLines === 1 ? "truncate" : "line-clamp-2 text-balance", "leading-tight", TITLE_SIZE[size], titleClassName)}
            style={titleStyle}
          >
            {d.title}
          </Title>
          <p className={cn("mt-1 font-bold tabular-nums", PRICE_SIZE[size], !accent && "text-primary")} style={accent ? { color: accent } : undefined}>
            {d.priceLabel}
          </p>
          <p className="mt-0.5 text-caption tabular-nums opacity-70" style={mutedStyle}>
            Mã {d.code}
          </p>
        </div>
        {trailing}
      </div>

      {level !== "compact" && d.summary && (
        <p className="mt-1.5 line-clamp-2 text-body-sm leading-snug opacity-85" style={mutedStyle}>
          {d.summary}
        </p>
      )}
      {level !== "compact" && d.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5" style={mutedStyle}>
          {d.tags.map((t) => (
            <span key={t} className="rounded-full border border-current/25 px-2.5 py-0.5 text-caption">
              {t}
            </span>
          ))}
        </div>
      )}

      {level === "full" && d.story && (
        <blockquote className="mt-4 border-l-2 border-current/40 pl-3 font-serif text-body italic leading-relaxed" style={mutedStyle}>
          {d.story}
        </blockquote>
      )}
      {level === "full" && d.specs.length > 0 && (
        <dl className="mt-4">
          {d.specs.map((s) => (
            <div key={s.label} className="flex gap-4 border-b border-current/10 py-3 last:border-0">
              <dt className="w-24 shrink-0 text-body-sm" style={mutedStyle}>{s.label}</dt>
              <dd className="min-w-0 flex-1 text-body-sm">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
