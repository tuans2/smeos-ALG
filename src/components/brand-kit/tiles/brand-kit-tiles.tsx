"use client"

import { useState } from "react"
import { Lock } from "@/components/ui/icon-set/lock"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import type { BrandStep } from "@/modules/brand-kit/domain/brand-journey"
import { useBrandKit } from "../use-brand-kit"
import { IdentityTiles } from "./identity-tiles"
import { LandingTiles } from "./landing-tiles"
import { ProfileTiles } from "./profile-tiles"
import { StepTiles } from "./step-tiles"

const LOCK_HINT: Record<BrandStep, string> = {
  PROFILE: "",
  IDENTITY: "Hoàn thành Hồ sơ cửa hàng để mở Bộ nhận diện thương hiệu.",
  LANDING: "Chọn một Bộ nhận diện thương hiệu để mở Landing page.",
}

/**
 * Nhóm "Hồ sơ & Thương hiệu" trên /cong-cu dạng ô (PO 08/11/2026). Cùng hook, API và luật khoá bước với
 * màn /ho-so — chỉ khác cách trình bày; làm ở nơi nào thì nơi kia thấy ngay.
 */
export function BrandKitTiles() {
  const kit = useBrandKit()
  const profile = useTenantProfile()
  const [picked, setPicked] = useState<BrandStep | null>(null)

  if (kit.loading || profile.loading) return <SkeletonBlock lines={6} label="Đang tải mục Thương hiệu" />
  if (kit.error || !kit.view) return <InlineError message={kit.error ?? "Không tải được mục Thương hiệu"} onRetry={() => void kit.reload()} />

  const view = kit.view
  const unlocked = (k: BrandStep) => view.steps.find((s) => s.key === k)?.status !== "LOCKED"
  const step: BrandStep = picked && unlocked(picked) ? picked : view.current_step
  const nextLocked = view.steps.find((s) => s.status === "LOCKED")
  // Thao tác ở bước nào thì giữ bước đó (chọn xong vẫn thấy kết quả, không tự nhảy bước)
  const pinned: typeof kit = {
    ...kit,
    generate: (kind, mode) => { setPicked(step); return kit.generate(kind, mode) },
    select: (kind, id) => { setPicked(step); return kit.select(kind, id) },
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <StepTiles view={view} current={step} onPick={(k) => { setPicked(k); kit.clearNotice() }} />
        {nextLocked && (
          <p className="flex items-center gap-1.5 text-caption text-text-muted"><Lock size={14} aria-hidden /> {LOCK_HINT[nextLocked.key]}</p>
        )}
      </div>

      {kit.notice && <div role="alert" className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">{kit.notice}</div>}

      {step === "PROFILE" && <ProfileTiles view={view} profile={profile} onSaved={async () => { setPicked("PROFILE"); await kit.reload() }} />}
      {step === "IDENTITY" && <IdentityTiles kit={pinned} profile={profile} />}
      {step === "LANDING" && <LandingTiles kit={pinned} />}
    </div>
  )
}
