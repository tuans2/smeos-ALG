"use client"

import React, { forwardRef } from "react"
import { Phone } from "@/components/ui/icon-set/phone"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import type {
  BannerAspectRatio,
  BannerCopyPayload,
  BannerBrandInfo,
} from "@/modules/ad-banner-poster/domain/banner-types"
import type { BannerStylePreset } from "@/modules/ad-banner-poster/domain/banner-presets"

export interface BannerPreviewCardProps {
  readonly format: BannerAspectRatio
  readonly copy: BannerCopyPayload
  readonly brandInfo: BannerBrandInfo
  readonly preset: BannerStylePreset
  readonly productImageUrl?: string | undefined
  readonly className?: string | undefined
  readonly isWatermarked?: boolean | undefined
}

export const BannerPreviewCard = forwardRef<HTMLDivElement, BannerPreviewCardProps>(
  function BannerPreviewCard(
    {
      format,
      copy,
      brandInfo,
      preset,
      productImageUrl,
      className = "",
      isWatermarked = false,
    },
    ref
  ) {
    const aspectStyle: Record<BannerAspectRatio, string> = {
      "1:1": "aspect-square",
      "4:5": "aspect-[4/5]",
      "9:16": "aspect-[9/16]",
      "16:9": "aspect-[16/9]",
      A4: "aspect-[1/1.414]",
    }

    const isLandscape = format === "16:9"
    const isVerticalStory = format === "9:16"
    const isSquare = format === "1:1"

    // Tiêu chuẩn Story bar theo phong cách Greeting Card Swipe
    const storyBarsCount = isVerticalStory ? 4 : 3

    return (
      <div
        ref={ref}
        data-banner-format={format}
        className={`relative overflow-hidden rounded-2xl border ${preset.borderClass} ${preset.backgroundClass} ${aspectStyle[format]} flex flex-col justify-between p-3.5 sm:p-4 select-none shadow-2xl transition-all duration-300 ${className}`}
        style={{
          boxShadow: "0 20px 50px -10px rgba(0,0,0,0.35), 0 10px 20px -5px rgba(0,0,0,0.2)",
        }}
      >
        {/* ── AMBIENT BACKGROUND GLOW & TEXTURE (Từ Greeting Card) ──── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-radial from-white/10 via-transparent to-black/30"
        />
        <div
          aria-hidden="true"
          className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${preset.decorativeAccent} opacity-25 blur-3xl pointer-events-none`}
        />
        <div
          aria-hidden="true"
          className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-tr ${preset.decorativeAccent} opacity-20 blur-3xl pointer-events-none`}
        />

        {/* ── TOP HEADER: Progress Bars + Shop Identity + Badge ────── */}
        <div className="relative z-20 flex flex-col gap-1.5 shrink-0">
          {/* Progress Bars */}
          <div className="flex gap-1 px-0.5" aria-hidden="true">
            {Array.from({ length: storyBarsCount }, (_, i) => (
              <span
                key={i}
                className={`h-0.5 flex-1 rounded-full ${
                  i === 0 ? "bg-white/90 shadow-sm" : "bg-white/25"
                }`}
              />
            ))}
          </div>

          {/* Shop brand & Promotion Badge */}
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <div className="flex items-center gap-1.5 max-w-[65%]">
              {brandInfo.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandInfo.logoUrl}
                  alt={brandInfo.shopName}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-white/50 shadow-sm shrink-0"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-caption font-black ring-1 ring-white/40 shadow-sm shrink-0 text-white">
                  {brandInfo.shopName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-caption font-semibold tracking-wider uppercase line-clamp-2 text-white/90 drop-shadow-sm">
                {brandInfo.shopName || "Thương hiệu"}
              </span>
            </div>

            {copy.promotionBadge && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-black uppercase tracking-wider shrink-0 shadow-md ring-1 ring-white/30 backdrop-blur-md ${preset.badgeBgClass} ${preset.badgeTextClass}`}
              >
                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-[90px]">{copy.promotionBadge}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── MIDDLE HERO BODY: Tự co dãn thông minh theo flex-1 min-h-0 ── */}
        {isLandscape ? (
          /* BẢN NGANG 16:9: TÁCH 2 CỘT HOÀN TOÀN (NÚT CTA NẰM LUÔN BÊN CỘT TRÁI) */
          <div className="relative z-20 flex-1 min-h-0 my-1 flex flex-row items-center justify-between gap-3 overflow-hidden">
            <div className="flex flex-col justify-center w-3/5 text-left pr-1">
              <h3 className={`font-serif uppercase tracking-tight font-black text-caption leading-tight line-clamp-2 mt-0.5 ${preset.textPrimaryClass}`}>
                {copy.headline || "TIÊU ĐỀ QUẢNG CÁO BÙNG NỔ"}
              </h3>
              <p className={`text-caption mt-0.5 line-clamp-1 font-normal ${preset.textMutedClass}`}>
                {copy.subHeadline}
              </p>

              {/* Nút CTA tích hợp trong cột trái cho 16:9 */}
              {copy.ctaText && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-black uppercase tracking-wider shadow-sm ring-1 ring-white/30 ${preset.ctaBgClass} ${preset.ctaTextClass}`}
                  >
                    <span>{copy.ctaText}</span>
                    <ArrowRight className="h-2 w-2 shrink-0" />
                  </div>
                  {brandInfo.hotline && (
                    <span className="shrink-0 whitespace-nowrap text-caption text-white/80 font-medium">
                      ĐT {brandInfo.hotline}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="w-2/5 h-full max-h-20 flex items-center justify-center">
              {productImageUrl ? (
                <div className="relative h-full w-full overflow-hidden rounded-lg shadow-md ring-1 ring-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl} alt={copy.headline} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="flex items-center justify-center p-2 rounded-lg bg-white/10 h-full w-full text-title-sm">💐</div>
              )}
            </div>
          </div>
        ) : (
          /* BẢN DỌC (1:1, 4:5, 9:16, A4): ẢNH THU GỌN VỪA VẶN + TYPOGRAPHY ĐẦY ĐỦ */
          <div className="relative z-20 flex-1 min-h-0 my-1 flex flex-col items-center justify-center gap-1 overflow-hidden">
            {/* Ảnh sản phẩm: dùng flex-1 min-h-0 để tự động co dãn không đè vỡ layout */}
            <div
              className={`relative flex items-center justify-center w-full min-h-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20 ${
                isVerticalStory
                  ? "flex-1 max-h-48 my-auto"
                  : isSquare
                  ? "h-20 w-20 shrink-0 mx-auto"
                  : "flex-1 max-h-36 my-auto"
              }`}
            >
              {productImageUrl ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl} alt={copy.headline} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center rounded-xl bg-white/10 h-full w-full">
                  <span className="text-display mb-0.5">💐</span>
                  <span className="text-caption text-white/90 font-bold uppercase tracking-wider">Mẫu thực tế</span>
                </div>
              )}
            </div>

            {/* Typography */}
            <div className="text-center w-full px-1 flex flex-col justify-center shrink-0">
              <h3 className={`font-serif uppercase tracking-tight font-black text-caption leading-tight line-clamp-2 mt-0.5 ${preset.textPrimaryClass}`}>
                {copy.headline || "TIÊU ĐỀ QUẢNG CÁO BÙNG NỔ"}
              </h3>
              <p className={`text-caption line-clamp-1 mt-0.5 leading-tight font-normal ${preset.textMutedClass}`}>
                {copy.subHeadline || "Ưu đãi đặc biệt áp dụng cho sản phẩm chất lượng cao."}
              </p>
            </div>
          </div>
        )}

        {/* ── BOTTOM FOOTER: Chỉ hiện ở các bản dọc (1:1, 4:5, 9:16, A4) ── */}
        {!isLandscape && (
          <div className="relative z-20 pt-1.5 border-t border-white/20 flex flex-col gap-1 shrink-0">
            {/* CTA Action Button */}
            {copy.ctaText && (
              <div className="flex justify-center">
                <div
                  className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-caption font-black uppercase tracking-wider shadow-md w-full sm:w-auto text-center ring-1 ring-white/30 ${preset.ctaBgClass} ${preset.ctaTextClass}`}
                >
                  <span className="truncate max-w-[140px]">{copy.ctaText}</span>
                  <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                </div>
              </div>
            )}

            {/* Contact Hotline & Address */}
            {/* Hotline không bao giờ bị cắt — ảnh tải về chụp đúng khung này */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 text-caption text-white/80 px-0.5 font-medium">
              {brandInfo.hotline && (
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  <Phone className="h-2 w-2 shrink-0 text-warning-text" />
                  <span className="tracking-wider">{brandInfo.hotline}</span>
                </span>
              )}
              {brandInfo.address && (
                <span className="inline-flex min-w-0 items-center gap-0.5">
                  <MapPin className="h-2 w-2 shrink-0 text-warning-text" />
                  <span className="line-clamp-2">{brandInfo.address}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Watermark nếu có */}
        {isWatermarked && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 rotate-12">
            <span className="text-display font-black uppercase tracking-widest text-white">
              ALG Banner
            </span>
          </div>
        )}
      </div>
    )
  }
)
BannerPreviewCard.displayName = "BannerPreviewCard"
