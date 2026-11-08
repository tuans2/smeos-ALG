"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import type { TenantProfileState } from "@/lib/hooks/use-tenant-profile"
import { safeImageSrc } from "@/lib/safe-image-src"
import { readBrandMaterials } from "@/modules/brand-kit/domain/brand-assets"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { ProfileFieldDialog } from "./profile-field-dialog"
import { OPTIONAL_FIELDS, PROFILE_FIELDS, REQUIRED_FIELDS, type ProfileFieldKey } from "./profile-fields"
import { Tile, TilePill } from "./tile"

function previewOf(field: ProfileFieldKey, view: BrandKitView, profile: TenantProfileState): { text: string; done: boolean; photos?: string[] } {
  const b = profile.business
  const m = readBrandMaterials(profile.brand?.brand_assets)
  const socials = Object.values((b?.social_links ?? {}) as Record<string, unknown>).filter((v) => typeof v === "string" && v.trim()).length
  const hours = (b?.operating_hours ?? {}) as Record<string, unknown>
  switch (field) {
    case "display_name": return { text: b?.display_name || "Chưa nhập", done: Boolean(b?.display_name?.trim()) }
    case "phone": return { text: b?.phone || "Chưa nhập", done: Boolean(b?.phone?.trim()) }
    case "address": return { text: b?.address || "Chưa nhập", done: Boolean(b?.address?.trim()) }
    case "description": return { text: b?.description || "Chưa nhập", done: Boolean(b?.description?.trim()) }
    case "target_customers": return { text: b?.target_customers.length ? b.target_customers.join(" · ") : "Chưa nhập", done: (b?.target_customers.length ?? 0) > 0 }
    case "storefront_photos": return { text: m.storefrontPhotos.length ? `${m.storefrontPhotos.length} ảnh không gian` : "Chưa có ảnh", done: m.storefrontPhotos.length > 0, photos: m.storefrontPhotos.slice(0, 3) }
    case "intro_video": return { text: m.introVideo ? "Đã có video" : "Chưa có video", done: Boolean(m.introVideo) }
    case "featured_products": {
      const names = view.profile.featured_products.map((p) => p.name)
      return { text: names.length ? names.join(" · ") : "Chưa chọn", done: names.length > 0 }
    }
    case "logo": return { text: profile.brand?.logo_asset_id ? "Đã tải logo" : "Chưa có — bước sau hệ thống dựng", done: Boolean(profile.brand?.logo_asset_id) }
    case "operating_hours": return { text: hours.open && hours.close ? `${String(hours.open)} – ${String(hours.close)}` : "Chưa nhập", done: Boolean(hours.open && hours.close) }
    case "social_links": return { text: socials ? `${socials} kênh` : "Chưa nhập", done: socials > 0 }
    case "email": return { text: b?.email || "Chưa nhập", done: Boolean(b?.email?.trim()) }
  }
}

/** Bước 1 trên /cong-cu: mỗi mục hồ sơ là một ô; bấm ô mở khung nhập riêng. */
export function ProfileTiles({ view, profile, busy, onSaved, onConfirm }: {
  view: BrandKitView
  profile: TenantProfileState
  busy: boolean
  onSaved: () => Promise<void>
  /** Xác nhận hồ sơ → hệ thống tạo ngay Bộ nhận diện (useBrandJourney.confirmProfile) */
  onConfirm: () => void
}) {
  const [open, setOpen] = useState<ProfileFieldKey | null>(null)
  const doneCount = view.profile.items.filter((i) => i.done).length

  const required = (field: ProfileFieldKey) => {
    const p = previewOf(field, view, profile)
    // Trạng thái "đủ" lấy từ máy chủ (cùng luật khoá bước), xem trước lấy từ hồ sơ đang tải
    const done = view.profile.items.find((i) => i.key === field)?.done ?? p.done
    const meta = PROFILE_FIELDS[field]
    return (
      <Tile
        key={field}
        title={meta.label}
        icon={meta.icon}
        tone={done ? "default" : "need"}
        pill={<TilePill tone={done ? "ok" : "need"}>{done ? "Đã có" : "Cần có"}</TilePill>}
        preview={<span className="line-clamp-2">{done ? p.text : meta.hint}</span>}
        onOpen={() => setOpen(field)}
        footer={done ? "Bấm để sửa" : "Chưa nhập"}
        footerAction={<span className="font-bold text-primary">{done ? "Sửa" : "Nhập ngay →"}</span>}
      >
        {p.photos && p.photos.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {p.photos.map((src) => safeImageSrc(src) && <img key={src} src={safeImageSrc(src)} alt="" className="h-10 w-10 rounded-lg object-cover" />)}
          </div>
        )}
      </Tile>
    )
  }

  return (
    <div className="space-y-8">
      {view.profile.done && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-body font-bold text-text">Hồ sơ đã đủ 8/8 mục</p>
            <p className="text-caption text-text-muted">Xác nhận để hệ thống phân tích hồ sơ và tạo 3 phương án Bộ nhận diện thương hiệu.</p>
          </div>
          <Button type="button" className="shrink-0 gap-2" disabled={busy} onClick={onConfirm}>
            {busy ? "Đang tạo Bộ nhận diện..." : view.identity.options.length ? "Xem Bộ nhận diện" : "Xác nhận hồ sơ — tạo Bộ nhận diện"} <ArrowRight size={16} aria-hidden />
          </Button>
        </div>
      )}

      <section aria-labelledby="bk-required">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="bk-required" className="text-title font-extrabold text-text">Thông tin cần có</h2>
          <span className="text-caption text-text-muted">Đã có {doneCount}/{view.profile.items.length} · đủ 8 mục để mở Bộ nhận diện · bấm vào ô để nhập</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">{REQUIRED_FIELDS.map(required)}</div>
      </section>

      <section aria-labelledby="bk-optional">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="bk-optional" className="text-title font-extrabold text-text">Thêm nếu có</h2>
          <span className="text-caption text-text-muted">Không bắt buộc</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
          {OPTIONAL_FIELDS.map((field) => {
            const p = previewOf(field, view, profile)
            const meta = PROFILE_FIELDS[field]
            return (
              <Tile
                key={field}
                title={meta.label}
                icon={meta.icon}
                pill={<TilePill tone={p.done ? "ok" : "muted"}>{p.done ? "Đã có" : "Tuỳ chọn"}</TilePill>}
                preview={<span className="line-clamp-2">{p.text}</span>}
                onOpen={() => setOpen(field)}
                footer={p.done ? "Bấm để sửa" : "Không bắt buộc"}
                footerAction={<span className="font-bold text-primary">{p.done ? "Sửa" : "Thêm"}</span>}
              />
            )
          })}
        </div>
      </section>

      {open && <ProfileFieldDialog field={open} profile={profile} onClose={() => setOpen(null)} onSaved={onSaved} />}
    </div>
  )
}
