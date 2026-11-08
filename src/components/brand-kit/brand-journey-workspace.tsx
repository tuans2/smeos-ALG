"use client"

import { BadgeCheck } from "@/components/ui/icon-set/badge-check"
import { Lock } from "@/components/ui/icon-set/lock"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { JourneyProgress } from "@/components/journey/journey-progress"
import { PageHeader } from "@/components/ui/page-header"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { LOCK_HINT } from "./journey/journey-copy"
import { useBrandJourney } from "./journey/use-brand-journey"
import { ProfileStepPanel } from "./profile-step-panel"
import { IdentityStepPanel } from "./identity-step-panel"
import { LandingStepPanel } from "./landing-step-panel"

/**
 * Mục Thương hiệu tại /ho-so (dạng tab): Hồ sơ cửa hàng → Bộ nhận diện → Landing page. Cùng hook điều khiển
 * (`useBrandJourney`) với giao diện ô ở /cong-cu — chỉ khác cách trình bày.
 */
export function BrandJourneyWorkspace() {
  const j = useBrandJourney()
  const { kit, profile, view, step } = j

  if (kit.loading || profile.loading) return <SkeletonBlock lines={6} label="Đang tải mục Thương hiệu" />
  if (kit.error || !view) return <InlineError message={kit.error ?? "Không tải được mục Thương hiệu"} onRetry={() => void kit.reload()} />

  const keys = view.steps.map((s) => s.key)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Thương hiệu" description="Nhập hồ sơ một lần — hệ thống dựng bộ nhận diện và trang chính thức cho cửa hàng." />

      <FeatureGuidanceCard
        guidanceId="thuong-hieu-3-buoc"
        badgeLabel="3 bước"
        badgeIcon={BadgeCheck}
        title="Xây thương hiệu cho cửa hàng"
        description="Bạn chỉ nhập thông tin ở Hồ sơ cửa hàng. Bộ nhận diện và Landing page được tạo tự động, mỗi bước có 3 phong cách để chọn."
        tips={[
          "Bước 1: điền hồ sơ, ảnh, video và sản phẩm chủ đạo rồi bấm xác nhận.",
          "Bước 2: chọn 1 trong 3 bộ nhận diện (logo, khẩu hiệu, bộ màu…).",
          "Bước 3: chọn 1 trong 3 giao diện và xuất bản trang chính thức.",
        ]}
      />

      <nav aria-label="Các bước xây thương hiệu">
        <JourneyProgress
          steps={view.steps.map((s) => ({ id: s.key, label: s.label }))}
          currentStepIndex={keys.indexOf(step)}
          stepStatuses={view.steps.map((s) => s.status)}
          onStepClick={(i) => j.go(keys[i]!)}
        />
        {j.nextLocked && (
          <p className="mt-2 flex items-center gap-1.5 text-caption text-text-muted">
            <Lock size={14} aria-hidden /> {LOCK_HINT[j.nextLocked.key]}
          </p>
        )}
      </nav>

      {kit.notice && (
        <div role="alert" className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">{kit.notice}</div>
      )}

      {step === "PROFILE" && <ProfileStepPanel view={view} profile={profile} busy={Boolean(kit.busy)} onSaved={j.onProfileSaved} onConfirm={() => void j.confirmProfile()} />}
      {step === "IDENTITY" && <IdentityStepPanel kit={kit} profile={profile} onNext={() => void j.proceedToLanding()} />}
      {step === "LANDING" && <LandingStepPanel kit={kit} />}
    </div>
  )
}
