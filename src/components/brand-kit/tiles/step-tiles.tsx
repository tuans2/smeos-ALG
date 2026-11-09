"use client"

import { JourneyStepTiles } from "@/components/journey/journey-step-tiles"
import type { BrandStep } from "@/modules/brand-kit/domain/brand-journey"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import { LOCK_SHORT } from "../journey/journey-copy"


function stepSummary(view: BrandKitView, key: BrandStep): { text: string; percent: number } {
  if (key === "PROFILE") {
    const done = view.profile.items.filter((i) => i.done).length
    return { text: `Đã có ${done}/${view.profile.items.length} mục cần thiết`, percent: Math.round((done / view.profile.items.length) * 100) }
  }
  if (key === "IDENTITY") {
    const chosen = view.identity.options.find((o) => o.selected)
    if (chosen) return { text: `Đang dùng: ${chosen.style_label}`, percent: 100 }
    return { text: view.identity.options.length ? "Chọn 1 trong các phong cách" : "Chưa tạo phương án", percent: view.identity.options.length ? 50 : 0 }
  }
  if (view.landing.published_path) return { text: "Đã xuất bản", percent: 100 }
  return { text: view.landing.options.length ? "Chọn giao diện và xuất bản" : "Chưa tạo phương án", percent: view.landing.options.length ? 50 : 0 }
}

/** Hàng 3 ô bước của mục Thương hiệu — dùng ô bước chung của các hành trình trên /cong-cu. */
export function StepTiles({ view, current, onPick }: { view: BrandKitView; current: BrandStep; onPick: (k: BrandStep) => void }) {
  const steps = view.steps.map((s) => {
    const sum = stepSummary(view, s.key)
    return { key: s.key, label: s.label, status: s.status, summary: s.status === "LOCKED" ? LOCK_SHORT[s.key] : sum.text, percent: sum.percent }
  })
  return <JourneyStepTiles steps={steps} current={current} onPick={onPick} label="Các bước xây thương hiệu" />
}
