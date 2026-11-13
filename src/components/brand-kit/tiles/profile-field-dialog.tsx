"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BrandStorefrontSection } from "@/components/profiles/brand-storefront-section"
import { BrandVideoQrSection } from "@/components/profiles/brand-video-qr-section"
import { uploadBrandAsset } from "@/components/profiles/upload-brand-asset"
import type { TenantProfileState } from "@/lib/hooks/use-tenant-profile"
import { safeImageSrc } from "@/lib/safe-image-src"
import { readBrandMaterials, withFeaturedProducts } from "@/modules/brand-kit/domain/brand-assets"
import type { BusinessProfileDetail } from "@/modules/profiles/use-cases/get-business-profile"
import type { UpsertBusinessProfileInput } from "@/modules/profiles/domain/repositories/business-profile-repository.interface"
import { brandPayload } from "../brand-materials-section"
import { FeaturedProductsPicker } from "../featured-products-picker"
import { PROFILE_FIELDS, type ProfileFieldKey } from "./profile-fields"

/** PUT hồ sơ kinh doanh thay toàn bộ — giữ mọi trường khác, chỉ đổi phần của ô đang sửa. */
function businessPayload(b: BusinessProfileDetail | null, patch: Partial<UpsertBusinessProfileInput>): UpsertBusinessProfileInput {
  return {
    display_name: b?.display_name ?? "",
    legal_name: b?.legal_name ?? null,
    phone: b?.phone ?? null,
    email: b?.email ?? null,
    address: b?.address ?? null,
    website: b?.website ?? null,
    social_links: b?.social_links ?? null,
    tax_code: b?.tax_code ?? null,
    description: b?.description ?? null,
    operating_hours: b?.operating_hours ?? null,
    brand_message: b?.brand_message ?? null,
    target_customers: b?.target_customers ?? [],
    ...patch,
  }
}

const str = (v: unknown) => (typeof v === "string" ? v : "")

function initialDraft(field: ProfileFieldKey, profile: TenantProfileState): Record<string, string> {
  const b = profile.business
  const hours = (b?.operating_hours ?? {}) as Record<string, unknown>
  const socials = (b?.social_links ?? {}) as Record<string, unknown>
  switch (field) {
    case "target_customers": return { value: (b?.target_customers ?? []).join(", ") }
    case "operating_hours": return { open: str(hours.open), close: str(hours.close) }
    case "social_links": return { facebook: str(socials.facebook), zalo: str(socials.zalo), instagram: str(socials.instagram) }
    case "display_name": case "phone": case "address": case "description": case "email":
      return { value: str(b?.[field]) }
    default: return {}
  }
}

interface ProfileFieldDialogProps {
  field: ProfileFieldKey
  profile: TenantProfileState
  onClose: () => void
  onSaved: () => Promise<void>
}

/** Khung nhập riêng cho một ô của Bước 1 — lưu vào cùng Hồ sơ mà /ho-so và Cài đặt dùng. */
export function ProfileFieldDialog({ field, profile, onClose, onSaved }: ProfileFieldDialogProps) {
  const meta = PROFILE_FIELDS[field]
  const brand = profile.brand
  const materials = readBrandMaterials(brand?.brand_assets)
  const assets = (brand?.brand_assets ?? {}) as Record<string, unknown>
  const [draft, setDraft] = useState<Record<string, string>>(() => initialDraft(field, profile))
  const [photos, setPhotos] = useState<string[]>([...materials.storefrontPhotos])
  const [video, setVideo] = useState(materials.introVideo ?? "")
  const [qr, setQr] = useState(str(assets.zalo_qr))
  const [featured, setFeatured] = useState<string[]>([...materials.featuredProductIds])
  const [logo, setLogo] = useState<{ id: string; url: string }>({ id: brand?.logo_asset_id ?? "", url: brand?.logo_url ?? "" })
  const [error, setError] = useState<string | null>(null)
  const set = (k: string) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    setError(null)
    let ok: boolean
    if (meta.target === "BRAND") {
      const nextAssets =
        field === "storefront_photos" ? { ...assets, storefront_photos: photos }
          : field === "intro_video" ? { ...assets, intro_video: video, zalo_qr: qr }
            : field === "featured_products" ? withFeaturedProducts(assets, featured)
              : assets
      ok = await profile.saveBrand(brandPayload(brand, { brand_assets: nextAssets, ...(field === "logo" ? { logo_asset_id: logo.id || null } : {}) }))
    } else {
      if (field === "display_name" && !draft.value?.trim()) return setError("Tên cửa hàng không được để trống")
      const patch: Partial<UpsertBusinessProfileInput> =
        field === "target_customers" ? { target_customers: (draft.value ?? "").split(/[,\n]+/).map((t) => t.trim()).filter(Boolean).slice(0, 10) }
          : field === "operating_hours" ? { operating_hours: { open: draft.open ?? "", close: draft.close ?? "" } }
            : field === "social_links" ? { social_links: { ...(profile.business?.social_links ?? {}), facebook: draft.facebook?.trim() || null, zalo: draft.zalo?.trim() || null, instagram: draft.instagram?.trim() || null } }
              : { [field]: draft.value?.trim() || (field === "display_name" ? "" : null) }
      ok = await profile.saveBusiness(businessPayload(profile.business, patch))
    }
    if (!ok) return setError(profile.error ?? "Chưa lưu được, vui lòng thử lại")
    await onSaved()
    onClose()
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    try {
      const up = await uploadBrandAsset(file)
      setLogo({ id: up.assetId, url: up.viewUrl })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải logo thất bại")
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={meta.label}
      description={meta.hint}
      size={field === "featured_products" || field === "storefront_photos" ? "lg" : "md"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button type="button" disabled={profile.saving} onClick={() => void save()}>{profile.saving ? "Đang lưu..." : "Lưu"}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {(field === "display_name" || field === "phone" || field === "address" || field === "email" || field === "target_customers") && (
          <Input aria-label={meta.label} value={draft.value ?? ""} onChange={(e) => set("value")(e.target.value)} placeholder={meta.placeholder} className="h-11" />
        )}
        {field === "description" && (
          <Textarea aria-label={meta.label} value={draft.value ?? ""} onChange={(e) => set("value")(e.target.value)} placeholder={meta.placeholder} rows={5} />
        )}
        {field === "operating_hours" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-caption font-semibold text-text">Mở cửa<Input type="time" value={draft.open ?? ""} onChange={(e) => set("open")(e.target.value)} className="mt-1 h-11" /></label>
            <label className="text-caption font-semibold text-text">Đóng cửa<Input type="time" value={draft.close ?? ""} onChange={(e) => set("close")(e.target.value)} className="mt-1 h-11" /></label>
          </div>
        )}
        {field === "social_links" && (["facebook", "zalo", "instagram"] as const).map((k) => (
          <label key={k} className="block text-caption font-semibold text-text">{k === "facebook" ? "Facebook" : k === "zalo" ? "Zalo" : "Instagram"}
            <Input value={draft[k] ?? ""} onChange={(e) => set(k)(e.target.value)} placeholder="https://..." className="mt-1 h-11" />
          </label>
        ))}
        {field === "storefront_photos" && <BrandStorefrontSection photos={photos} onPhotosChange={setPhotos} onError={setError} disabled={profile.saving} />}
        {field === "intro_video" && <BrandVideoQrSection introVideo={video} qrCode={qr} onVideoChange={setVideo} onQrChange={setQr} onError={setError} disabled={profile.saving} />}
        {field === "featured_products" && <FeaturedProductsPicker selected={featured} onChange={setFeatured} disabled={profile.saving} />}
        {field === "logo" && (
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-surface-alt">
              {safeImageSrc(logo.url) ? <img src={safeImageSrc(logo.url)} alt="Logo hiện tại" className="h-full w-full object-contain" /> : <span className="text-caption text-text-muted">Chưa có</span>}
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4 text-body-sm font-semibold text-primary hover:bg-surface-alt">
              Chọn ảnh logo
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadLogo(e.target.files?.[0])} />
            </label>
          </div>
        )}
        {error && <p role="alert" className="text-body-sm text-danger-text">{error}</p>}
      </div>
    </Dialog>
  )
}
