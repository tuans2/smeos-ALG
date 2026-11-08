"use client"

import { Clock } from "@/components/ui/icon-set/clock"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Phone } from "@/components/ui/icon-set/phone"
import { Globe } from "@/components/ui/icon-set/globe"
import type { PublicOfficialStoreInfo } from "@/modules/catalog-links/use-cases/official-store-info"

interface LandingTemplateStoreInfoProps {
  info: PublicOfficialStoreInfo
  shopName: string
}

/**
 * Khối "Thông tin cửa hàng" của Landing page chính thức (mục Thương hiệu bước 3): địa chỉ, giờ mở cửa,
 * nút liên hệ một chạm và mạng xã hội — đọc sống từ Hồ sơ cửa hàng. Thiếu trường nào thì ẩn dòng đó.
 */
export function LandingTemplateStoreInfo({ info, shopName }: LandingTemplateStoreInfoProps) {
  const hasAny = info.address || info.hours || info.actions.length > 0 || info.socials.length > 0
  if (!hasAny) return null

  return (
    <section id="thong-tin-cua-hang" className="p-6 sm:p-8 rounded-3xl border border-border bg-surface shadow-xs space-y-5 scroll-mt-20">
      <div>
        <span className="text-caption font-bold tracking-widest uppercase text-primary">Ghé thăm cửa hàng</span>
        <h3 className="text-title-sm sm:text-title font-semibold text-text mt-0.5">{shopName}</h3>
        {info.slogan && <p className="text-body-sm text-text-muted italic mt-1">{info.slogan}</p>}
      </div>

      <ul className="space-y-3">
        {info.address && (
          <li className="flex items-start gap-3 text-body-sm text-text">
            <MapPin size={18} aria-hidden className="text-primary mt-0.5 shrink-0" />
            <span>{info.address}</span>
          </li>
        )}
        {info.hours && (
          <li className="flex items-start gap-3 text-body-sm text-text">
            <Clock size={18} aria-hidden className="text-primary mt-0.5 shrink-0" />
            <span>Mở cửa: {info.hours}</span>
          </li>
        )}
      </ul>

      {info.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {info.actions.map((a) => (
            <a
              key={a.kind}
              href={a.href}
              target={a.href.startsWith("http") ? "_blank" : undefined}
              rel={a.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full border border-primary/30 bg-surface text-body-sm font-semibold text-primary hover:bg-primary/10"
            >
              {a.kind === "CALL" ? <Phone size={16} aria-hidden /> : a.kind === "DIRECTIONS" ? <MapPin size={16} aria-hidden /> : <Globe size={16} aria-hidden />}
              {a.label}
            </a>
          ))}
        </div>
      )}

      {info.socials.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {info.socials.map((s) => (
            <a
              key={s.network}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-9 px-3 rounded-full bg-surface-alt text-caption font-semibold text-text hover:text-primary"
            >
              {s.label}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
