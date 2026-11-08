"use client"

import React, { useState, useEffect } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Link2 } from "@/components/ui/icon-set/link2"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Check } from "@/components/ui/icon-set/check"
import { Button } from "@/components/ui/button"
import type { BrandProfileDetail } from "@/modules/profiles/use-cases/get-brand-profile"
import type { UpsertBrandProfileInput } from "@/modules/profiles/domain/repositories/brand-profile-repository.interface"
import {
  BrandAssetsUploader,
  type BrandAssetsData,
} from "./brand-assets-uploader"

export interface BrandAssetsManagerTabProps {
  initialData: BrandProfileDetail | null
  onSave: (data: UpsertBrandProfileInput) => Promise<boolean>
  saving: boolean
}

export function BrandAssetsManagerTab({
  initialData,
  onSave,
  saving,
}: BrandAssetsManagerTabProps) {
  const [logoAssetId, setLogoAssetId] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [brandAssets, setBrandAssets] = useState<BrandAssetsData>({})
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (initialData) {
      setLogoAssetId(initialData.logo_asset_id || "")
      setLogoUrl(initialData.logo_url || "")
      if (initialData.brand_assets) {
        setBrandAssets(initialData.brand_assets as BrandAssetsData)
      }
    }
  }, [initialData])

  const handleLogoChange = (newAssetId: string, previewUrl?: string) => {
    setLogoAssetId(newAssetId)
    if (previewUrl !== undefined) {
      setLogoUrl(previewUrl)
    }
  }

  const handleSave = async () => {
    if (!initialData) return

    const payload: UpsertBrandProfileInput = {
      primary_color: initialData.primary_color,
      secondary_color: initialData.secondary_color,
      accent_color: initialData.accent_color,
      background_color: initialData.background_color,
      text_color: initialData.text_color,
      font_heading: initialData.font_heading,
      font_body: initialData.font_body,
      logo_asset_id: logoAssetId.trim() || null,
      brand_assets: (brandAssets as Record<string, unknown>) ?? null,
      tone_of_voice: initialData.tone_of_voice,
      hashtags: initialData.hashtags,
      cta_templates: initialData.cta_templates,
      default_offers: initialData.default_offers,
      forbidden_styles: initialData.forbidden_styles,
    }

    const ok = await onSave(payload)
    if (ok) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const storefrontCount = brandAssets?.storefront_photos?.length || 0
  const hasLogo = Boolean(logoAssetId)
  const hasVideo = Boolean(brandAssets?.intro_video)
  const hasQr = Boolean(brandAssets?.zalo_qr)

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Giới thiệu Kho tài nguyên */}
      <div className="rounded-2xl border border-primary/20 bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-title-sm font-extrabold text-text">
                Kho Tài nguyên Nhận diện Cấp Tiệm (Brand Master Assets)
              </h3>
              <p className="text-caption text-text-muted mt-1 leading-relaxed max-w-2xl">
                Tải lên một lần duy nhất tại đây. Hệ thống tự động đồng bộ sang tất cả các phân hệ:
                Tự động đóng Watermark bản quyền, dựng Banner Landing Page, chèn Video tiếp thị và in Thiệp mừng.
              </p>
            </div>
          </div>

          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-body-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {saving ? (
              <span>Đang lưu...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-white" />
                <span>Đã lưu thành công!</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Lưu toàn bộ tài nguyên</span>
              </>
            )}
          </Button>
        </div>

        {/* 2. Bảng Trạng thái Kết nối Hệ thống (Connection & Readiness Status) */}
        <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-surface-alt/60 p-3 flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${hasLogo ? "bg-success" : "bg-warning"}`} />
            <div>
              <div className="text-caption font-bold text-text">Logo tiệm</div>
              <div className="text-caption text-text-muted">
                {hasLogo ? "Đã sẵn sàng" : "Chưa tải lên"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt/60 p-3 flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${storefrontCount > 0 ? "bg-success" : "bg-warning"}`} />
            <div>
              <div className="text-caption font-bold text-text">Ảnh không gian ({storefrontCount}/4)</div>
              <div className="text-caption text-text-muted">
                {storefrontCount > 0 ? "Đã kết nối" : "Chưa có ảnh"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt/60 p-3 flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${hasVideo ? "bg-success" : "bg-warning"}`} />
            <div>
              <div className="text-caption font-bold text-text">Video Intro/Outro</div>
              <div className="text-caption text-text-muted">
                {hasVideo ? "Đã sẵn sàng" : "Chưa tải lên"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt/60 p-3 flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${hasQr ? "bg-success" : "bg-warning"}`} />
            <div>
              <div className="text-caption font-bold text-text">Mã QR Zalo</div>
              <div className="text-caption text-text-muted">
                {hasQr ? "Đã kết nối" : "Chưa có ảnh"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Khối Upload Tương tác Trực tiếp */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <BrandAssetsUploader
          logoAssetId={logoAssetId}
          initialLogoUrl={logoUrl}
          onLogoChange={handleLogoChange}
          brandAssets={brandAssets}
          onBrandAssetsChange={setBrandAssets}
          disabled={saving}
        />
      </div>

      {/* 4. Chân trang Cam kết Toàn vẹn Dữ liệu */}
      <div className="rounded-xl border border-border/80 bg-surface-alt/40 p-4 flex items-center gap-3">
        <ShieldCheck size={20} className="text-success shrink-0" />
        <p className="text-caption text-text-muted leading-relaxed">
          Ảnh và video sau khi lưu được{" "}
          <strong className="text-text">giữ riêng cho cửa hàng của bạn</strong> và tự động dùng trong các công cụ tạo
          Landing Page, Video Marketing và Chatbot AI.
        </p>
      </div>
    </div>
  )
}
