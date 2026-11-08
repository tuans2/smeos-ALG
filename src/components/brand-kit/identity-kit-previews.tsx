"use client"

/**
 * Xem trước trọn Bộ nhận diện của một phương án: logo, danh thiếp, trang hồ sơ chia sẻ, ảnh bìa mạng xã hội.
 * Màu lấy từ CHÍNH bảng màu của phương án (đây là bản xem trước thương hiệu của cửa hàng, không phải màu
 * giao diện ứng dụng). SVG do hệ thống tự dựng và đã thoát ký tự, hiện qua `<img>`.
 */
import { buildLogoSvg, fontStack } from "@/modules/brand-kit/domain/logo-svg"
import { buildSocialCoverSvg } from "@/modules/brand-kit/domain/social-cover-svg"
import { contrastRatio, readableTextOn } from "@/modules/brand-kit/domain/color-math"
import type { IdentityOptionContent } from "@/modules/brand-kit/domain/identity-option"
import { safeImageSrc } from "@/lib/safe-image-src"
import { svgDataUrl } from "./svg-file"

export interface ShopFacts {
  name: string
  phone: string | null
  address: string | null
  email: string | null
  /** Logo chủ tiệm tự tải lên — có thì dùng thay logo hệ thống dựng */
  logoUrl: string | null
}

export function logoSvgFor(c: IdentityOptionContent, shopName: string): string {
  return buildLogoSvg({ name: shopName, initials: c.initials, palette: c.palette, fontHeading: c.font_heading, layout: c.logo_layout })
}

export function coverSvgFor(c: IdentityOptionContent, shop: ShopFacts): string {
  const contact = [shop.phone, shop.address].filter(Boolean).join(" · ") || null
  return buildSocialCoverSvg({
    name: shop.name, initials: c.initials, slogan: c.slogan, palette: c.palette,
    fontHeading: c.font_heading, fontBody: c.font_body, layout: c.logo_layout, contactLine: contact,
  })
}

function LogoImage({ c, shop, className }: { c: IdentityOptionContent; shop: ShopFacts; className: string }) {
  const uploaded = safeImageSrc(shop.logoUrl)
  return <img src={uploaded || svgDataUrl(logoSvgFor(c, shop.name))} alt={`Logo ${shop.name}`} className={className} />
}

export function LogoPreview({ c, shop }: { c: IdentityOptionContent; shop: ShopFacts }) {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-xl p-3" style={{ backgroundColor: c.palette.background }}>
      <LogoImage c={c} shop={shop} className="h-full w-full object-contain" />
    </div>
  )
}

export function MiniBusinessCard({ c, shop }: { c: IdentityOptionContent; shop: ShopFacts }) {
  // Tên dùng màu chính khi đủ tương phản trên nền thẻ, không thì dùng màu chữ của bộ màu
  const nameColor = contrastRatio(c.palette.primary, c.palette.background) >= 4.5 ? c.palette.primary : c.palette.text
  return (
    <div
      className="relative flex aspect-[90/54] w-full overflow-hidden rounded-lg shadow-xs"
      style={{ backgroundColor: c.palette.background, color: c.palette.text, fontFamily: fontStack(c.font_body) }}
      aria-label="Xem trước danh thiếp"
      role="img"
    >
      <div className="w-2 shrink-0" style={{ backgroundColor: c.palette.primary }} />
      <div className="flex flex-1 items-center gap-2 p-2.5 min-w-0">
        <LogoImage c={c} shop={shop} className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-caption font-bold" style={{ fontFamily: fontStack(c.font_heading), color: nameColor }}>{shop.name}</p>
          <p className="truncate text-caption italic">{c.slogan}</p>
          {shop.phone && <p className="truncate text-caption">{shop.phone}</p>}
          {shop.address && <p className="truncate text-caption">{shop.address}</p>}
        </div>
      </div>
    </div>
  )
}

export function MiniSharePage({ c, shop }: { c: IdentityOptionContent; shop: ShopFacts }) {
  const ink = readableTextOn(c.palette.primary)
  return (
    <div
      className="mx-auto w-full max-w-[150px] overflow-hidden rounded-2xl border border-border shadow-xs"
      style={{ backgroundColor: c.palette.background, color: c.palette.text, fontFamily: fontStack(c.font_body) }}
      aria-label="Xem trước trang hồ sơ chia sẻ"
      role="img"
    >
      <div className="flex flex-col items-center gap-1 px-2 pb-3 pt-4" style={{ backgroundColor: c.palette.primary, color: ink }}>
        <div className="h-10 w-10 overflow-hidden rounded-full bg-surface p-0.5">
          <LogoImage c={c} shop={shop} className="h-full w-full object-contain" />
        </div>
        <p className="w-full truncate text-center text-caption font-bold" style={{ fontFamily: fontStack(c.font_heading) }}>{shop.name}</p>
        <p className="w-full truncate text-center text-caption italic">{c.slogan}</p>
      </div>
      <div className="space-y-1.5 p-2">
        {["Gọi điện", "Nhắn Zalo", "Chỉ đường"].map((label) => (
          <div key={label} className="rounded-full py-1 text-center text-caption font-semibold" style={{ backgroundColor: c.palette.secondary, color: readableTextOn(c.palette.secondary) }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CoverPreview({ c, shop }: { c: IdentityOptionContent; shop: ShopFacts }) {
  return <img src={svgDataUrl(coverSvgFor(c, shop))} alt="Xem trước ảnh bìa mạng xã hội" className="aspect-[1640/624] w-full rounded-lg object-cover" />
}

export function PaletteSwatches({ c }: { c: IdentityOptionContent }) {
  const entries: Array<[string, string]> = [
    ["Màu chính", c.palette.primary], ["Màu phụ", c.palette.secondary], ["Màu nhấn", c.palette.accent],
    ["Màu nền", c.palette.background], ["Màu chữ", c.palette.text],
  ]
  return (
    <ul className="flex gap-1.5" aria-label="Bộ màu">
      {entries.map(([label, hex]) => (
        <li key={label} title={`${label} ${hex}`} className="h-7 w-7 rounded-full border border-border" style={{ backgroundColor: hex }}>
          <span className="sr-only">{`${label} ${hex}`}</span>
        </li>
      ))}
    </ul>
  )
}
