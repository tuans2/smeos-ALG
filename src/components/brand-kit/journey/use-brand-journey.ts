"use client"

import { useState } from "react"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import type { BrandStep } from "@/modules/brand-kit/domain/brand-journey"
import { useBrandKit, type BrandKitState } from "../use-brand-kit"

/**
 * Điều khiển hành trình 3 bước dùng chung cho HAI giao diện (/ho-so dạng tab, /cong-cu dạng ô): bước đang mở,
 * khoá bước, giữ nguyên bước khi thao tác, và hai nút xác nhận chuyển bước có tự tạo phương án.
 */
export function useBrandJourney() {
  const raw = useBrandKit()
  const profile = useTenantProfile()
  const [picked, setPicked] = useState<BrandStep | null>(null)
  const view = raw.view

  const unlocked = (k: BrandStep) => view?.steps.find((s) => s.key === k)?.status !== "LOCKED"
  const step: BrandStep = view ? (picked && unlocked(picked) ? picked : view.current_step) : "PROFILE"
  const nextLocked = view?.steps.find((s) => s.status === "LOCKED") ?? null

  // Thao tác ở bước nào thì giữ bước đó (chọn xong vẫn thấy kết quả, không tự nhảy bước)
  const kit: BrandKitState = {
    ...raw,
    generate: (kind, mode) => { setPicked(step); return raw.generate(kind, mode) },
    select: (kind, id) => { setPicked(step); return raw.select(kind, id) },
  }

  const go = (k: BrandStep) => {
    if (!unlocked(k)) return
    setPicked(k)
    raw.clearNotice()
  }

  /** Hồ sơ đã đủ → chủ tiệm xác nhận → hệ thống tạo ngay 3 phương án Bộ nhận diện và mở Bước 2. */
  const confirmProfile = async () => {
    setPicked("IDENTITY")
    if (view && view.identity.options.length === 0) await raw.generate("identity", "initial")
  }

  /** Đã chọn Bộ nhận diện → hệ thống dựng ngay 3 giao diện Landing page và mở Bước 3. */
  const proceedToLanding = async () => {
    setPicked("LANDING")
    if (view && view.landing.options.length === 0) await raw.generate("landing", "initial")
  }

  const onProfileSaved = async () => {
    setPicked("PROFILE")
    await raw.reload()
  }

  return { kit, profile, view, step, nextLocked, go, confirmProfile, proceedToLanding, onProfileSaved }
}
