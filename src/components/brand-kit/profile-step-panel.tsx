"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Circle } from "@/components/ui/icon-set/circle"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Progress } from "@/components/ui/progress"
import { BusinessProfileForm } from "@/components/profiles/business-profile-form"
import type { TenantProfileState } from "@/lib/hooks/use-tenant-profile"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { BrandMaterialsSection } from "./brand-materials-section"

interface ProfileStepPanelProps {
  view: BrandKitView
  profile: TenantProfileState
  onSaved: () => Promise<void>
  onNext: () => void
}

/**
 * Bước 1 — Hồ sơ cửa hàng: chỗ DUY NHẤT của mục Thương hiệu mà chủ tiệm nhập liệu. Lưu ở đây hay ở
 * Cài đặt đều ghi cùng một hồ sơ, nên hai nơi luôn đồng bộ.
 */
export function ProfileStepPanel({ view, profile, onSaved, onNext }: ProfileStepPanelProps) {
  const items = view.profile.items
  const doneCount = items.filter((i) => i.done).length
  const percent = Math.round((doneCount / items.length) * 100)

  const saveBusiness: TenantProfileState["saveBusiness"] = async (data) => {
    const ok = await profile.saveBusiness(data)
    if (ok) await onSaved()
    return ok
  }
  const saveBrand: TenantProfileState["saveBrand"] = async (data) => {
    const ok = await profile.saveBrand(data)
    if (ok) await onSaved()
    return ok
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-surface shadow-sm p-5 sm:p-6 space-y-4" aria-labelledby="profile-check-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="profile-check-title" className="text-title-sm font-bold text-text">
              {view.profile.done ? "Hồ sơ đã đủ để tạo Bộ nhận diện" : "Hoàn thành hồ sơ để mở bước tiếp theo"}
            </h2>
            <p className="text-caption text-text-muted mt-1">Đã có {doneCount}/{items.length} mục cần thiết</p>
          </div>
          {view.profile.done && (
            <Button type="button" onClick={onNext} className="shrink-0 gap-2">
              Tạo Bộ nhận diện <ArrowRight size={16} aria-hidden />
            </Button>
          )}
        </div>
        <Progress value={percent} className="h-2" barClassName={view.profile.done ? "bg-success" : "bg-primary"} />
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {items.map((i) => {
            const Icon = i.done ? CheckCircle2 : Circle
            return (
              <li key={i.key} className="flex items-start gap-2">
                <Icon size={18} aria-hidden className={i.done ? "text-success-text mt-0.5 shrink-0" : "text-text-muted mt-0.5 shrink-0"} />
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-text">
                    {i.label}
                    {!i.done && <span className="ml-2 text-caption font-semibold text-warning-text">Cần có</span>}
                  </p>
                  {!i.done && <p className="text-caption text-text-muted">{i.hint}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <BusinessProfileForm initialData={profile.business} onSave={saveBusiness} saving={profile.saving} />
      <BrandMaterialsSection brand={profile.brand} saving={profile.saving} onSave={saveBrand} />
    </div>
  )
}
