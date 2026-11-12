"use client"

import React from "react"
import Link from "next/link"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/select"
import type {
  BannerCopyPayload,
  BannerBrandInfo,
} from "@/modules/ad-banner-poster/domain/banner-types"

export interface ManualEditPanelProps {
  readonly copy: BannerCopyPayload
  readonly onCopyChange: (field: keyof BannerCopyPayload, value: string) => void
  readonly brandInfo: BannerBrandInfo
  readonly onBrandInfoChange: (field: keyof BannerBrandInfo, value: string) => void
  readonly onTriggerAiCopy: () => Promise<void>
  readonly isAiLoading: boolean
  /** Ưu đãi tiệm đang bật trong Hồ sơ tiệm — chỉ được chọn trong danh sách này */
  readonly shopPromotions: readonly string[]
}

export function ManualEditPanel({
  copy,
  onCopyChange,
  brandInfo,
  onBrandInfoChange,
  onTriggerAiCopy,
  isAiLoading,
  shopPromotions,
}: ManualEditPanelProps) {
  return (
    <div className="space-y-4">
      {/* ── NỘI DUNG CHỮ (HEADLINE / SUBHEADLINE) ──────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-caption font-bold text-text">
            Chỉnh sửa nội dung thông điệp
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isAiLoading}
            onClick={onTriggerAiCopy}
            className="gap-1 text-caption font-semibold text-primary h-auto p-0 hover:bg-transparent hover:underline disabled:opacity-50"
          >
            {isAiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
            ) : (
              <Sparkles className="h-3 w-3 text-warning-text" />
            )}
            <span>AI viết lại</span>
          </Button>
        </div>

        <div>
          <label className="text-caption text-text-muted block mb-1">
            Tiêu đề chính
          </label>
          <Input
            type="text"
            value={copy.headline}
            onChange={(e) => onCopyChange("headline", e.target.value)}
            placeholder="VD: BÙNG NỔ ƯU ĐÃI THÁNG 10"
            className="w-full text-caption font-semibold"
          />
        </div>

        <div>
          <label className="text-caption text-text-muted block mb-1">
            Thông điệp phụ
          </label>
          <Textarea
            rows={2}
            value={copy.subHeadline}
            onChange={(e) => onCopyChange("subHeadline", e.target.value)}
            placeholder="VD: Tuyển chọn sản phẩm chất lượng cao với mức giá ưu đãi đặc biệt..."
            className="w-full text-caption resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="poster-promotion" className="text-caption text-text-muted block mb-1">
              Ưu đãi của tiệm
            </label>
            <NativeSelect
              id="poster-promotion"
              value={copy.promotionBadge}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onCopyChange("promotionBadge", e.target.value)}
              className="w-full text-caption font-bold"
            >
              <option value="">Không in ưu đãi</option>
              {shopPromotions.map((t) => <option key={t} value={t.toUpperCase()}>{t}</option>)}
            </NativeSelect>
            <Link href={{ pathname: "/cai-dat", query: { tab: "PROMOTIONS" } }} className="mt-1 inline-block text-caption text-primary underline">
              {shopPromotions.length ? "Sửa ưu đãi trong Cài đặt" : "Chưa bật ưu đãi nào — bật trong Cài đặt"}
            </Link>
          </div>

          <div>
            <label className="text-caption text-text-muted block mb-1">
              Thời gian áp dụng
            </label>
            <Input
              type="text"
              value={copy.validityText || ""}
              onChange={(e) => onCopyChange("validityText", e.target.value)}
              placeholder="VD: Duy nhất từ 20/10 - 25/10"
              className="w-full text-caption"
            />
          </div>
        </div>

        <div>
          <label className="text-caption text-text-muted block mb-1">
            Lời kêu gọi trên nút
          </label>
          <Input
            type="text"
            value={copy.ctaText}
            onChange={(e) => onCopyChange("ctaText", e.target.value)}
            placeholder="VD: ĐẶT HÀNG NGAY / NHẮN TIN TƯ VẤN"
            className="w-full text-caption font-bold"
          />
        </div>
      </div>

      {/* ── THÔNG TIN CỬA HÀNG (BRAND CONTACTS) ───────────────────────── */}
      <div className="space-y-3 pt-3 border-t border-border">
        <label className="text-caption font-bold text-text block">
          Thông tin nhận diện trên poster
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-caption text-text-muted block mb-1">
              Tên cửa hàng
            </label>
            <Input
              type="text"
              value={brandInfo.shopName}
              onChange={(e) => onBrandInfoChange("shopName", e.target.value)}
              placeholder="VD: Cửa hàng Tiện Lợi"
              className="w-full text-caption"
            />
          </div>

          <div>
            <label className="text-caption text-text-muted block mb-1">
              Hotline liên hệ
            </label>
            <Input
              type="text"
              value={brandInfo.hotline || ""}
              onChange={(e) => onBrandInfoChange("hotline", e.target.value)}
              placeholder="VD: 0901 234 567"
              className="w-full text-caption"
            />
          </div>
        </div>

        <div>
          <label className="text-caption text-text-muted block mb-1">
            Địa chỉ hiển thị
          </label>
          <Input
            type="text"
            value={brandInfo.address || ""}
            onChange={(e) => onBrandInfoChange("address", e.target.value)}
            placeholder="VD: 123 Đường Lê Lợi, Quận 1"
            className="w-full text-caption"
          />
        </div>
      </div>
    </div>
  )
}
