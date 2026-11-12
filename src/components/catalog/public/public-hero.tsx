"use client"

import React from "react"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

interface PublicHeroProps {
  headline: string
  subHeadline?: string | null | undefined
  imageUrl: string
  shopName: string
  productCount: number
  customerName?: string | null | undefined
  style: StyleDefinition
  /** id của vùng sản phẩm để nút chính cuộn tới */
  productsAnchorId: string
}

/**
 * Hero tràn màn hình cho trang khách xem (Landing 08 / Catalog 09).
 * Ảnh thật của tiệm làm nền, chữ trắng trên lớp phủ tối để giữ tương phản; màu nút lấy từ phong cách catalog.
 */
export function PublicHero({
  headline,
  subHeadline,
  imageUrl,
  shopName,
  productCount,
  customerName,
  style,
  productsAnchorId,
}: PublicHeroProps) {
  return (
    <section aria-label="Giới thiệu bộ sưu tập" className="relative isolate flex min-h-[78svh] w-full items-end overflow-hidden md:min-h-[70vh]">
      <img
        src={imageUrl}
        alt={headline}
        fetchPriority="high"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        style={style.tokens.photoFilter ? { filter: style.tokens.photoFilter } : undefined}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

      <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-24 sm:pb-14">
        <p className="text-caption font-semibold uppercase tracking-[0.2em] text-white">
          {customerName ? `Dành riêng cho ${customerName}` : shopName}
          <span aria-hidden="true"> · </span>
          {productCount} mẫu
        </p>
        <h1
          className={`mt-3 max-w-2xl text-balance text-[clamp(2.25rem,7vw,4rem)] font-medium leading-[1.05] tracking-tight text-white ${style.typography.fontDisplay}`}
        >
          {headline}
        </h1>
        {subHeadline && (
          <p className="mt-4 max-w-xl text-pretty text-body leading-relaxed text-white">{subHeadline}</p>
        )}
        <a
          href={`#${productsAnchorId}`}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full px-7 text-body-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: style.tokens.ctaBg, color: style.tokens.ctaText }}
        >
          Xem bộ sưu tập
        </a>
      </div>
    </section>
  )
}
