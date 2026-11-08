"use client"

import { JourneyStepTiles } from "@/components/journey/journey-step-tiles"
import { Button } from "@/components/ui/button"
import { Lock } from "@/components/ui/icon-set/lock"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { evaluateStoreProfile } from "@/modules/profiles/domain/store-profile-completeness"
import { contentStepTiles, lockHint } from "./content-copy"
import { ChannelPostsStep } from "./channel-posts-step"
import { AutoPublishStep } from "./later-steps"
import { ProductCardStep } from "./product-card-step"
import { SalesPitchStep } from "./sales-pitch-step"
import { useContentJourney } from "./use-content-journey"

/**
 * Nhóm "Tạo nội dung" trên /cong-cu dạng ô 4 bước (PO 08/11/2026) — cùng ngôn ngữ ô với "Hồ sơ & Thương hiệu":
 * Thẻ sản phẩm → Thẻ chào sản phẩm → Bài đăng đa kênh → Đăng tự động. Hồ sơ cửa hàng chưa đủ chỉ nhắc nhẹ, không khoá.
 */
export function ContentStudioTiles() {
  const j = useContentJourney()
  const profile = useTenantProfile()
  const steps = contentStepTiles(j.statuses, j.flags)
  const profileMissing = !profile.loading && !evaluateStoreProfile({ business: profile.business, brand: profile.brand }).readyToShare

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <JourneyStepTiles steps={steps} current={j.step} onPick={j.go} label="Các bước tạo nội dung" cols={4} />
        {j.nextLocked && lockHint(j.nextLocked, j.flags) && (
          <p className="flex items-center gap-1.5 text-caption text-text-muted"><Lock size={14} aria-hidden /> {lockHint(j.nextLocked, j.flags)}</p>
        )}
      </div>

      {profileMissing && (
        <p className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-body-sm text-text-muted">
          Hồ sơ cửa hàng chưa đủ — Thẻ chào và bài đăng sẽ thiếu tên, số điện thoại hoặc giọng văn riêng.{" "}
          <a href="/ho-so" className="font-semibold text-primary hover:underline">Hoàn thiện hồ sơ</a>
        </p>
      )}

      {j.productId && j.loading && <SkeletonBlock lines={4} label="Đang tải sản phẩm đang làm" />}
      {j.error && (
        <div className="space-y-2">
          <InlineError message={j.error} onRetry={() => void j.reload()} />
          <Button type="button" size="sm" variant="secondary" onClick={() => j.setProduct(null)}>Bỏ chọn sản phẩm này</Button>
        </div>
      )}

      {!j.loading && !j.error && (
        <>
          {j.step === "PRODUCT_CARD" && <ProductCardStep journey={j} />}
          {j.step === "SALES_PITCH" && <SalesPitchStep journey={j} />}
          {j.step === "CHANNEL_POSTS" && <ChannelPostsStep journey={j} />}
          {j.step === "AUTO_PUBLISH" && <AutoPublishStep />}
        </>
      )}
    </div>
  )
}
