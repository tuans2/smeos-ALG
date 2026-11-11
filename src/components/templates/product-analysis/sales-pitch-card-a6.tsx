"use client"

import React, { forwardRef } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Tag } from "@/components/ui/icon-set/tag"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SalesPitchData } from "@/modules/products/domain/sales-pitch-template"
import { formatCurrencyVnd } from "@/core/templates/domain/variable-catalog"
import { useI18n } from "@/lib/i18n"

export type SalesPitchCardFormat = "a6" | "square" | "story"
export type SalesPitchCardTheme = "classic" | "minimal" | "festive"

export interface SalesPitchCardA6Props {
  activePitch: SalesPitchData
  status?: "DRAFT" | "FINALIZED"
  cardFormat?: SalesPitchCardFormat
  theme?: SalesPitchCardTheme
  className?: string
}

/**
 * Template Thẻ Chào Khách Đa Kích Thước & Đa Phong Cách (Công cụ 03 - Tạo thẻ chào sản phẩm)
 * Hỗ trợ các tỷ lệ:
 * - A6 (105x148mm ~ 3:4 / bưu thiếp in ấn & gửi chat)
 * - Square (1:1 ~ vuông tối ưu tin nhắn Zalo/Messenger/Instagram)
 * - Story (9:16 ~ dọc tối ưu Story Facebook / Zalo Diary)
 */
export const SalesPitchCardA6 = forwardRef<HTMLDivElement, SalesPitchCardA6Props>(
  function SalesPitchCardA6(
    {
      activePitch,
      status = "DRAFT",
      cardFormat = "a6",
      theme = "classic",
      className,
    },
    ref
  ) {
    const { ti } = useI18n()

    const themeStyles = {
      classic: {
        cardBorder: "border-border/80",
        badgeBg: "bg-primary/10 text-primary",
        priceGradient: "from-black/85 via-black/45 to-transparent",
        accentDot: "bg-primary",
      },
      minimal: {
        cardBorder: "border-border/60 shadow-md",
        badgeBg: "bg-surface-alt text-text",
        priceGradient: "from-stone-950/90 via-stone-900/50 to-transparent",
        accentDot: "bg-text-muted",
      },
      festive: {
        cardBorder: "border-rose-300/80 shadow-rose-100",
        badgeBg: "bg-rose-50 text-rose-700",
        priceGradient: "from-rose-950/90 via-rose-900/40 to-transparent",
        accentDot: "bg-rose-500",
      },
    }[theme]

    const imageAspectClass =
      cardFormat === "square"
        ? "aspect-square max-h-[300px]"
        : cardFormat === "story"
        ? "aspect-[4/3] sm:aspect-[16/11]"
        : "aspect-[4/3]"

    return (
      <Card
        ref={ref}
        data-card-format={cardFormat}
        data-card-theme={theme}
        className={`overflow-hidden rounded-3xl border bg-surface shadow-lg transition-all duration-300 hover:shadow-xl ${themeStyles.cardBorder} ${className ?? ""}`}
      >
        {/* Card Image Cover with Badges */}
        <div className={`relative ${imageAspectClass} w-full overflow-hidden bg-surface-alt`}>
          {activePitch.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activePitch.imageUrl}
              alt={activePitch.productName}
              className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-text-muted gap-2">
              <Sparkles size={32} className="opacity-40" />
              <span className="text-caption">Ảnh sản phẩm chất lượng cao</span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge className="bg-black/65 text-white backdrop-blur-md font-semibold text-caption border-none shadow-sm">
              {activePitch.style}
            </Badge>
            {activePitch.sku && (
              <Badge className="bg-white/85 text-black backdrop-blur-md font-bold text-caption border-none font-mono">
                {activePitch.sku}
              </Badge>
            )}
          </div>

          {/* Status Ribbon */}
          {status === "FINALIZED" && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-secondary-text text-white font-bold text-caption gap-1 shadow-md border-none">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                FINAL
              </Badge>
            </div>
          )}

          {/* Price Banner overlay at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white flex items-end justify-between">
            <div>
              <div className="text-caption text-white/80 font-medium uppercase tracking-wider">Giá</div>
              <div className="text-display font-black tracking-tight text-white flex items-baseline gap-2">
                {activePitch.priceVnd ? formatCurrencyVnd(activePitch.priceVnd) : <span className="text-body font-bold">Liên hệ để báo giá</span>}
                {activePitch.originalPriceVnd && activePitch.priceVnd && activePitch.originalPriceVnd > activePitch.priceVnd && (
                  <span className="text-caption text-white/60 line-through font-normal">
                    {formatCurrencyVnd(activePitch.originalPriceVnd)}
                  </span>
                )}
              </div>
            </div>

            {/* Chỉ hiện kích thước khi tiệm đã nhập — không in "~ × cm" */}
            {activePitch.dimensions.heightCm && activePitch.dimensions.widthCm ? <div className="text-right">
              <div className="text-caption text-white/70 font-mono">Kích thước</div>
              <div className="text-caption font-bold text-white/95">
                ~{activePitch.dimensions.heightCm} × {activePitch.dimensions.widthCm} cm
              </div>
            </div> : null}
          </div>
        </div>

        {/* Card Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Title & Occasions */}
          <div>
            <h3 className="text-title-sm font-extrabold text-text tracking-tight leading-snug">
              {activePitch.productName}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {activePitch.occasions.map((occ, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold ${themeStyles.badgeBg}`}
                >
                  <Tag size={10} />
                  {occ}
                </span>
              ))}
            </div>
          </div>

          {/* Emotional Description */}
          <p className="text-meta text-text-muted italic border-l-2 border-primary/40 pl-3 leading-relaxed">
            &ldquo;{activePitch.description}&rdquo;
          </p>

          {/* Composition / BOM Table */}
          <div className="rounded-xl bg-surface-alt p-3.5 border border-border/60">
            <div className="text-caption font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Cấu phần {ti("rawMaterialItem") || "nguyên vật liệu"}</span>
              <span className="text-caption font-normal text-text-muted">{activePitch.container}</span>
            </div>

            <div className="flex flex-col gap-1.5 divide-y divide-border/40 text-meta">
              {activePitch.mainFlowers.map((flower, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
                  <span className="font-semibold text-text flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${themeStyles.accentDot}`} />
                    {flower.name}
                    {flower.color && (
                      <span className="text-caption font-normal text-text-muted">({flower.color})</span>
                    )}
                  </span>
                  <span className="font-bold text-text font-mono">
                    {flower.quantity ? `${flower.quantity} ${flower.unit}` : "Theo thiết kế"}
                  </span>
                </div>
              ))}

              {activePitch.foliageItems.length > 0 && (
                <div className="pt-1.5 flex items-center justify-between text-caption text-text-muted">
                  <span>Lá đệm phụ:</span>
                  <span className="font-medium text-text">
                    {activePitch.foliageItems.map((f) => f.name).join(", ")}
                  </span>
                </div>
              )}

              {activePitch.wrapping && (
                <div className="pt-1.5 flex items-center justify-between text-caption text-text-muted">
                  <span>Quy cách gói:</span>
                  <span className="font-medium text-text truncate max-w-[200px]">{activePitch.wrapping}</span>
                </div>
              )}
            </div>
          </div>

          {/* Gifts & Guarantees */}
          {(activePitch.freeGifts.length > 0 || activePitch.guarantees.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-caption">
            {activePitch.freeGifts.length > 0 && <div className="rounded-xl bg-primary/[0.04] p-2.5 border border-primary/15">
              <div className="font-bold text-primary flex items-center gap-1 mb-1">
                <Gift size={12} /> Quà tặng đính kèm
              </div>
              <ul className="space-y-0.5 text-text-muted">
                {activePitch.freeGifts.map((g, i) => (
                  <li key={i} className="truncate">• {g}</li>
                ))}
              </ul>
            </div>}

            {activePitch.guarantees.length > 0 && <div className="rounded-xl bg-secondary/[0.08] p-2.5 border border-secondary/20">
              <div className="font-bold text-secondary-text flex items-center gap-1 mb-1">
                <ShieldCheck size={12} /> Cam kết chất lượng
              </div>
              <ul className="space-y-0.5 text-text-muted">
                {activePitch.guarantees.slice(0, 2).map((g, i) => (
                  <li key={i} className="truncate">• {g}</li>
                ))}
              </ul>
            </div>}
          </div>
          )}

          {/* Custom note if present */}
          {activePitch.customNote && (
            <div className="text-caption rounded-lg bg-warning-bg border border-warning/25 p-2 text-warning-text">
              <strong>Ưu đãi riêng:</strong> {activePitch.customNote}
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-caption text-text-muted">
            <span>{activePitch.shopName}</span>
            <span>Hotline: {activePitch.shopHotline}</span>
          </div>
        </div>
      </Card>
    )
  }
)
