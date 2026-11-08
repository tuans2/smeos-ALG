"use client"

import { useState } from "react"
import Link from "next/link"
import { BadgeCheck } from "@/components/ui/icon-set/badge-check"
import { Lock } from "@/components/ui/icon-set/lock"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { JourneyProgress } from "@/components/journey/journey-progress"
import { PageHeader } from "@/components/ui/page-header"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import type { BrandStep } from "@/modules/brand-kit/domain/brand-journey"
import { useBrandKit } from "./use-brand-kit"
import { ProfileStepPanel } from "./profile-step-panel"
import { IdentityStepPanel } from "./identity-step-panel"
import { LandingStepPanel } from "./landing-step-panel"

const LOCK_HINT: Record<BrandStep, string> = {
  PROFILE: "",
  IDENTITY: "Hoàn thành Hồ sơ cửa hàng để mở Bộ nhận diện thương hiệu.",
  LANDING: "Chọn một Bộ nhận diện thương hiệu để mở Landing page.",
}

/**
 * Mục Thương hiệu (PO 08/11/2026): Hồ sơ cửa hàng → Bộ nhận diện → Landing page. Bước sau chỉ mở khi bước
 * trước xong (máy chủ kiểm lại). Chỉ Bước 1 có nhập liệu; hai bước sau dùng dữ liệu đã có.
 */
export function BrandJourneyWorkspace() {
  const kit = useBrandKit()
  const profile = useTenantProfile()
  const [picked, setPicked] = useState<BrandStep | null>(null)

  if (kit.loading || profile.loading) return <SkeletonBlock lines={6} label="Đang tải mục Thương hiệu" />
  if (kit.error || !kit.view) return <InlineError message={kit.error ?? "Không tải được mục Thương hiệu"} onRetry={() => void kit.reload()} />

  const view = kit.view
  const keys = view.steps.map((s) => s.key)
  const unlocked = (k: BrandStep) => view.steps.find((s) => s.key === k)?.status !== "LOCKED"
  const step: BrandStep = picked && unlocked(picked) ? picked : view.current_step
  const go = (k: BrandStep) => { if (unlocked(k)) { setPicked(k); kit.clearNotice() } }
  const nextLocked = view.steps.find((s) => s.status === "LOCKED")
  // Thao tác ở một bước thì giữ nguyên bước đó (chọn xong bộ nhận diện vẫn thấy xác nhận, không tự nhảy bước)
  const pinned: typeof kit = {
    ...kit,
    generate: (kind, mode) => { setPicked(step); return kit.generate(kind, mode) },
    select: (kind, id) => { setPicked(step); return kit.select(kind, id) },
  }

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
          "Bước 1: điền hồ sơ, ảnh, video và sản phẩm chủ đạo.",
          "Bước 2: chọn 1 trong 3 bộ nhận diện (logo, khẩu hiệu, bộ màu…).",
          "Bước 3: chọn 1 trong 3 giao diện và xuất bản trang chính thức.",
        ]}
      />

      <nav aria-label="Các bước xây thương hiệu">
        <JourneyProgress
          steps={view.steps.map((s) => ({ id: s.key, label: s.label }))}
          currentStepIndex={keys.indexOf(step)}
          stepStatuses={view.steps.map((s) => s.status)}
          onStepClick={(i) => go(keys[i]!)}
        />
        {nextLocked && (
          <p className="mt-2 flex items-center gap-1.5 text-caption text-text-muted">
            <Lock size={14} aria-hidden /> {LOCK_HINT[nextLocked.key]}
          </p>
        )}
      </nav>

      {kit.notice && (
        <div role="alert" className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-body-sm text-warning-text">{kit.notice}</div>
      )}

      {step === "PROFILE" && <ProfileStepPanel view={view} profile={profile} onSaved={async () => { setPicked("PROFILE"); await kit.reload() }} onNext={() => go("IDENTITY")} />}
      {step === "IDENTITY" && <IdentityStepPanel kit={pinned} profile={profile} onNext={() => go("LANDING")} />}
      {step === "LANDING" && <LandingStepPanel kit={pinned} />}

      <p className="text-caption text-text-muted">
        Sửa chi tiết màu, phông chữ, khẩu hiệu ở{" "}
        <Link href="/cai-dat?tab=BRANDING" className="font-semibold text-primary hover:underline">Cài đặt thương hiệu</Link>
        {" "}· Lưu trữ tài liệu ở{" "}
        <Link href="/ho-so/thu-vien-thuong-hieu" className="font-semibold text-primary hover:underline">Thư viện thương hiệu</Link>
      </p>
    </div>
  )
}
