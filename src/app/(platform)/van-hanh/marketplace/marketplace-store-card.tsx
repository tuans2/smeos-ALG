import React, { useState } from "react"
import { Store } from "@/components/ui/icon-set/store"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Phone } from "@/components/ui/icon-set/phone"
import { User } from "@/components/ui/icon-set/user"
import { Award } from "@/components/ui/icon-set/award"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Package } from "@/components/ui/icon-set/package"
import { Camera } from "@/components/ui/icon-set/camera"
import { Check } from "@/components/ui/icon-set/check"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PartnerStoreMarketplaceEntity } from "@/modules/platform/domain/partner-marketplace.types"

interface MarketplaceStoreCardProps {
  store: PartnerStoreMarketplaceEntity
  onQuickView: (store: PartnerStoreMarketplaceEntity) => void
  /** Chế độ chọn để xoá: bấm cả thẻ để chọn/bỏ chọn thay vì mở hồ sơ. */
  selection?: { selected: boolean; onToggle: () => void }
}

export function MarketplaceStoreCard({ store, onQuickView, selection }: MarketplaceStoreCardProps) {
  const { identity, contact, business, production, scoreAndTier, media } = store
  // Ảnh lỗi (vd. Drive chưa chia sẻ công khai) → thử ảnh kế tiếp của cửa hàng
  const [photoIndex, setPhotoIndex] = useState(0)

  const tier = scoreAndTier.suggestedTier || "Hạng Tiêu Chuẩn"
  const isCertified = tier.toLowerCase().includes("chứng nhận")
  // Chỉ hiện ảnh khảo sát thật (kho hoặc Drive công khai) — không thay bằng ảnh mẫu
  const photos = media.photoGalleryUrls ?? []
  const coverUrl = photos[photoIndex]
  const allFailed = photos.length > 0 && photoIndex >= photos.length

  return (
    <Card
      variant="interactive"
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
    >
      {selection && (
        <Button
          type="button"
          variant="ghost"
          aria-pressed={selection.selected}
          aria-label={`${selection.selected ? "Bỏ chọn" : "Chọn"} ${identity.shopName}`}
          onClick={selection.onToggle}
          className={`absolute inset-0 z-30 h-auto w-auto rounded-2xl p-0 ${selection.selected ? "bg-danger-bg/40 ring-2 ring-inset ring-danger" : "hover:bg-surface-alt/30"}`}
        >
          <span
            className={`absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-lg border-2 ${
              selection.selected ? "border-danger bg-danger text-white" : "border-border bg-surface"
            }`}
          >
            {selection.selected && <Check className="h-5 w-5" aria-hidden />}
          </span>
        </Button>
      )}
      <div className="relative h-40 w-full overflow-hidden bg-surface-alt">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Cửa hàng ${identity.shopName}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setPhotoIndex((i) => i + 1)}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-text-muted">
            <Store className="h-12 w-12 opacity-40" />
            <span className="text-caption">{allFailed ? "Không xem được ảnh — kiểm tra quyền chia sẻ Drive" : "Chưa có ảnh khảo sát"}</span>
          </div>
        )}

        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-semibold ${
              isCertified ? "border-warning-border bg-warning-bg text-warning-text" : "border-border bg-surface text-text"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            {tier}
          </span>
          <div className="flex items-center gap-1.5">
            {media.driveImageIds.length > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-caption text-text">
                <Camera className="h-3 w-3 text-success" />
                {media.driveImageIds.length} ảnh
              </span>
            )}
            {scoreAndTier.totalScore && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-caption font-bold text-text">
                <Sparkles className="h-3 w-3 text-warning-text" />
                {scoreAndTier.totalScore}
              </span>
            )}
          </div>
        </div>

        {/* Shop Avatar / Badge */}
        <div className="absolute -bottom-5 left-4 z-20 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-surface bg-surface text-primary shadow-md">
          <Store className="h-7 w-7 text-primary" />
        </div>
      </div>

      {/* Body Information */}
      <div className="flex flex-1 flex-col p-4 pt-7">
        {/* Name & Owner */}
        <div className="mb-2">
          <h3 className="line-clamp-1 text-body font-bold text-text group-hover:text-primary transition-colors">
            {identity.shopName}
          </h3>
          <div className="flex items-center gap-2 text-caption text-text-muted">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {identity.ownerName || "Chưa cập nhật"}
            </span>
            {identity.operatingYears && (
              <span>• {identity.operatingYears}</span>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="mb-3 flex items-start gap-1.5 text-caption text-text-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted/80" />
          <span className="line-clamp-2 leading-relaxed">{contact.address || "Chưa có địa chỉ"}</span>
        </div>

        {/* Highlight Tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {production.mainProductLine && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-subtle px-2 py-0.5 text-caption font-medium text-primary">
              <Package className="h-3 w-3" />
              {production.mainProductLine}
            </span>
          )}
          {business.monthlyRevenue && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-caption text-text-muted">
              <TrendingUp className="h-3 w-3 text-success" />
              {business.monthlyRevenue}
            </span>
          )}
          {production.floristCount && (
            <span className="rounded-md bg-surface-alt px-2 py-0.5 text-caption text-text-muted">
              {production.floristCount} thợ cắm
            </span>
          )}
        </div>

        {/* Contact Hotline & Phone */}
        <div className="mt-auto border-t border-border/60 pt-3">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="flex items-center gap-1 font-mono font-medium text-text">
              <Phone className="h-3.5 w-3.5 text-primary" />
              {contact.phone || "---"}
            </span>
            <span className="text-caption text-text-muted">
              {identity.scale || "1 cửa hàng"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 border-t border-border/60 bg-surface-alt/40 p-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-caption font-semibold"
          onClick={() => onQuickView(store)}
        >
          Hồ sơ chi tiết
        </Button>
        <Button
          size="sm"
          className="px-2.5 text-caption"
          onClick={() => onQuickView(store)}
          title="Xem hồ sơ chi tiết"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
