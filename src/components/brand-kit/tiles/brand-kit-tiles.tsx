"use client"

import { Lock } from "@/components/ui/icon-set/lock"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { LOCK_HINT } from "../journey/journey-copy"
import { useBrandJourney } from "../journey/use-brand-journey"
import { IdentityTiles } from "./identity-tiles"
import { LandingTiles } from "./landing-tiles"
import { ProfileTiles } from "./profile-tiles"
import { StepTiles } from "./step-tiles"

/**
 * Nhóm "Hồ sơ & Thương hiệu" trên /cong-cu dạng ô (PO 08/11/2026). Cùng hook điều khiển (`useBrandJourney`),
 * API và luật khoá bước với /ho-so — chỉ khác cách trình bày; làm ở nơi nào thì nơi kia thấy ngay.
 */
export function BrandKitTiles() {
  const j = useBrandJourney()
  const { kit, profile, view, step } = j

  if (kit.loading || profile.loading) return <SkeletonBlock lines={6} label="Đang tải mục Thương hiệu" />
  if (kit.error || !view) return <InlineError message={kit.error ?? "Không tải được mục Thương hiệu"} onRetry={() => void kit.reload()} />

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <StepTiles view={view} current={step} onPick={j.go} />
        {j.nextLocked && (
          <p className="flex items-center gap-1.5 text-caption text-text-muted"><Lock size={14} aria-hidden /> {LOCK_HINT[j.nextLocked.key]}</p>
        )}
      </div>

      {kit.notice && <div role="alert" className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">{kit.notice}</div>}

      {step === "PROFILE" && <ProfileTiles view={view} profile={profile} busy={Boolean(kit.busy)} onSaved={j.onProfileSaved} onConfirm={() => void j.confirmProfile()} />}
      {step === "IDENTITY" && <IdentityTiles kit={kit} profile={profile} onNext={() => void j.proceedToLanding()} />}
      {step === "LANDING" && <LandingTiles kit={kit} />}
    </div>
  )
}
