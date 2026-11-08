"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { BrandAssetsUploader, type BrandAssetsData } from "@/components/profiles/brand-assets-uploader"
import type { BrandProfileDetail } from "@/modules/profiles/use-cases/get-brand-profile"
import type { UpsertBrandProfileInput } from "@/modules/profiles/domain/repositories/brand-profile-repository.interface"
import { readBrandMaterials, withFeaturedProducts } from "@/modules/brand-kit/domain/brand-assets"
import { FeaturedProductsPicker } from "./featured-products-picker"

interface BrandMaterialsSectionProps {
  brand: BrandProfileDetail | null
  saving: boolean
  onSave: (data: UpsertBrandProfileInput) => Promise<boolean>
}

/** Giữ nguyên mọi trường thương hiệu khác — PUT hồ sơ thương hiệu là thay toàn bộ. */
export function brandPayload(brand: BrandProfileDetail | null, patch: Partial<UpsertBrandProfileInput>): UpsertBrandProfileInput {
  return {
    primary_color: brand?.primary_color ?? null,
    secondary_color: brand?.secondary_color ?? null,
    accent_color: brand?.accent_color ?? null,
    background_color: brand?.background_color ?? null,
    text_color: brand?.text_color ?? null,
    font_heading: brand?.font_heading ?? null,
    font_body: brand?.font_body ?? null,
    logo_asset_id: brand?.logo_asset_id ?? null,
    tone_of_voice: brand?.tone_of_voice ?? null,
    hashtags: brand?.hashtags ?? null,
    cta_templates: brand?.cta_templates ?? null,
    default_offers: brand?.default_offers ?? null,
    forbidden_styles: brand?.forbidden_styles ?? null,
    brand_assets: brand?.brand_assets ?? null,
    ...patch,
  }
}

/**
 * Bước 1 — phần hình ảnh: logo (không bắt buộc — để trống thì Bộ nhận diện tự dựng logo), ảnh cửa hàng,
 * video giới thiệu và sản phẩm chủ đạo. Lưu vào cùng Hồ sơ thương hiệu mà trang Cài đặt dùng.
 */
export function BrandMaterialsSection({ brand, saving, onSave }: BrandMaterialsSectionProps) {
  const [logoAssetId, setLogoAssetId] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [assets, setAssets] = useState<BrandAssetsData>({})
  const [featured, setFeatured] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp lại khi hồ sơ tải xong / vừa lưu ở nơi khác (Cài đặt)
    setLogoAssetId(brand?.logo_asset_id ?? "")
    setLogoUrl(brand?.logo_url ?? "")
    setAssets((brand?.brand_assets as BrandAssetsData | null) ?? {})
    setFeatured([...readBrandMaterials(brand?.brand_assets).featuredProductIds])
  }, [brand])

  const save = async () => {
    const ok = await onSave(brandPayload(brand, {
      logo_asset_id: logoAssetId.trim() || null,
      brand_assets: withFeaturedProducts({ ...(brand?.brand_assets ?? {}), ...assets }, featured),
    }))
    setSaved(ok)
  }

  return (
    <section className="rounded-2xl bg-surface shadow-sm p-5 sm:p-6 space-y-6" aria-labelledby="brand-materials-title">
      <div>
        <h3 id="brand-materials-title" className="text-title-sm font-bold text-text">Hình ảnh và sản phẩm chủ đạo</h3>
        <p className="text-caption text-text-muted mt-1">Chưa có logo cũng được — bước sau hệ thống sẽ dựng logo cho bạn chọn.</p>
      </div>

      <BrandAssetsUploader
        logoAssetId={logoAssetId}
        initialLogoUrl={logoUrl}
        onLogoChange={(id, preview) => { setLogoAssetId(id); if (preview !== undefined) setLogoUrl(preview) }}
        brandAssets={assets}
        onBrandAssetsChange={setAssets}
        disabled={saving}
      />

      <div className="space-y-2">
        <h4 className="text-body font-bold text-text">Sản phẩm chủ đạo</h4>
        <FeaturedProductsPicker selected={featured} onChange={setFeatured} disabled={saving} />
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && <span role="status" className="text-caption text-success-text">Đã lưu hình ảnh và sản phẩm</span>}
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void save()}>
          {saving ? "Đang lưu..." : "Lưu hình ảnh và sản phẩm"}
        </Button>
      </div>
    </section>
  )
}
