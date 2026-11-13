/**
 * Trang khách xem của hồ sơ cửa hàng (công cụ 11). Server component, không JS
 * phía khách. Màu thương hiệu chỉ tô dải trang trí — chữ luôn dùng token để
 * giữ tương phản.
 */
import { Phone } from "@/components/ui/icon-set/phone"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Mail } from "@/components/ui/icon-set/mail"
import { Globe } from "@/components/ui/icon-set/globe"
import { Clock } from "@/components/ui/icon-set/clock"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import type { ContactAction, PublicStoreProfile } from "@/modules/profiles/domain/store-share-page"

const ACTION_ICON: Record<ContactAction["kind"], typeof Phone> = {
  CALL: Phone, ZALO: MessageCircle, DIRECTIONS: MapPin, EMAIL: Mail, WEBSITE: Globe,
}

export function PublicStoreProfileView({ profile }: { profile: PublicStoreProfile }) {
  const [primary, ...secondary] = profile.actions
  const external = (href: string) => href.startsWith("http")

  return (
    <main className="min-h-screen bg-bg">
      <div aria-hidden className="h-24 bg-primary" style={profile.primaryColor ? { backgroundColor: profile.primaryColor } : undefined} />
      <div className="max-w-lg mx-auto px-4 -mt-12 pb-10">
        <section className="bg-surface rounded-3xl border border-border p-6 text-center">
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL ký có hạn từ kho lưu trữ, không qua tối ưu ảnh
            <img src={profile.logoUrl} alt={`Logo ${profile.name}`} className="w-20 h-20 mx-auto -mt-16 rounded-full object-cover border-4 border-surface bg-surface" />
          ) : null}
          <h1 className="mt-3 text-title-lg font-bold text-text">{profile.name}</h1>
          {profile.description && <p className="mt-2 text-body-sm text-text-muted whitespace-pre-line">{profile.description}</p>}

          {primary && (
            <a
              href={primary.href}
              {...(external(primary.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="mt-5 flex items-center justify-center gap-2 min-h-12 w-full rounded-2xl bg-primary text-primary-foreground font-semibold"
            >
              {(() => { const Icon = ACTION_ICON[primary.kind]; return <Icon size={18} aria-hidden /> })()}
              {primary.label}
            </a>
          )}
          {secondary.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {secondary.map((a) => {
                const Icon = ACTION_ICON[a.kind]
                return (
                  <a
                    key={a.kind}
                    href={a.href}
                    {...(external(a.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex items-center justify-center gap-2 min-h-11 rounded-2xl border border-border text-body-sm font-semibold text-text hover:border-primary"
                  >
                    <Icon size={16} aria-hidden /> {a.label}
                  </a>
                )
              })}
            </div>
          )}
        </section>

        {(profile.address || profile.phone || profile.hours) && (
          <section aria-label="Thông tin liên hệ" className="mt-4 bg-surface rounded-3xl border border-border p-5">
            <dl className="flex flex-col gap-3 text-body-sm">
              {profile.address && (
                <div className="flex gap-3">
                  <dt className="shrink-0 text-text-muted"><MapPin size={18} aria-hidden /><span className="sr-only">Địa chỉ</span></dt>
                  <dd className="text-text">{profile.address}</dd>
                </div>
              )}
              {profile.phone && (
                <div className="flex gap-3">
                  <dt className="shrink-0 text-text-muted"><Phone size={18} aria-hidden /><span className="sr-only">Điện thoại</span></dt>
                  <dd className="text-text">{profile.phone}</dd>
                </div>
              )}
              {profile.hours && (
                <div className="flex gap-3">
                  <dt className="shrink-0 text-text-muted"><Clock size={18} aria-hidden /><span className="sr-only">Giờ mở cửa</span></dt>
                  <dd className="text-text">{profile.hours}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {profile.socials.length > 0 && (
          <section aria-label="Mạng xã hội" className="mt-4 flex flex-wrap justify-center gap-2">
            {profile.socials.map((s) => (
              <a key={s.network} href={s.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 min-h-10 px-4 rounded-full border border-border bg-surface text-body-sm text-text hover:border-primary">
                {s.label} <ExternalLink size={14} aria-hidden />
              </a>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
