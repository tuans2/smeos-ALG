/**
 * Hành trình 3 bước của mục Thương hiệu (PO 08/11/2026):
 *   1. Hồ sơ cửa hàng — chỗ DUY NHẤT chủ tiệm nhập liệu.
 *   2. Bộ nhận diện thương hiệu — hệ thống sinh từ Hồ sơ.
 *   3. Landing page chính thức — hệ thống dựng từ Hồ sơ + Bộ nhận diện đã chọn.
 * Bước sau chỉ mở khi bước trước hoàn thành; máy chủ kiểm lại bằng `lockedReason` (không tin giao diện).
 * Thuần — không import hạ tầng.
 */
import type { JourneyStepStatus } from "@/modules/journey/domain/journey-model"
import { isPlausiblePhone } from "@/modules/profiles/domain/store-profile-completeness"
import { readBrandMaterials } from "./brand-assets"

export const BRAND_STEPS = ["PROFILE", "IDENTITY", "LANDING"] as const
export type BrandStep = (typeof BRAND_STEPS)[number]

export const BRAND_STEP_LABELS: Readonly<Record<BrandStep, string>> = {
  PROFILE: "Hồ sơ cửa hàng",
  IDENTITY: "Bộ nhận diện thương hiệu",
  LANDING: "Landing page",
}

export interface ProfileStepSnapshot {
  readonly business: {
    readonly display_name: string
    readonly phone: string | null
    readonly address: string | null
    readonly description: string | null
    readonly target_customers: readonly string[]
  } | null
  readonly brand: { readonly brand_assets: unknown } | null
}

export interface ProfileStepItem {
  readonly key: string
  readonly label: string
  readonly hint: string
  readonly done: boolean
}

export interface ProfileStepResult {
  readonly done: boolean
  readonly items: readonly ProfileStepItem[]
  readonly missing: readonly ProfileStepItem[]
}

const filled = (v: string | null | undefined) => Boolean(v && v.trim())

/** Tiêu chí hoàn thành Bước 1 (PO chốt 08/11/2026: các mục "Cần có" + ảnh, video cửa hàng và sản phẩm chủ đạo). */
export function evaluateProfileStep(s: ProfileStepSnapshot): ProfileStepResult {
  const b = s.business
  const m = readBrandMaterials(s.brand?.brand_assets)
  const items: ProfileStepItem[] = [
    { key: "display_name", label: "Tên cửa hàng", hint: "Dùng cho logo, danh thiếp và trang landing", done: filled(b?.display_name) },
    {
      key: "phone", label: "Số điện thoại liên hệ", hint: "Khách gọi hoặc nhắn Zalo từ danh thiếp và trang landing",
      done: filled(b?.phone) && isPlausiblePhone(b?.phone ?? ""),
    },
    { key: "address", label: "Địa chỉ cửa hàng", hint: "Khách tìm đường đến cửa hàng", done: filled(b?.address) },
    { key: "description", label: "Giới thiệu ngắn", hint: "Hệ thống dựa vào đây để viết khẩu hiệu và câu chuyện cửa hàng", done: filled(b?.description) },
    {
      key: "target_customers", label: "Khách hàng mục tiêu", hint: "Giúp chọn phong cách và giọng văn phù hợp",
      done: (b?.target_customers ?? []).some((t) => t.trim().length > 0),
    },
    { key: "storefront_photos", label: "Ảnh cửa hàng", hint: "Ít nhất 1 ảnh không gian cửa hàng cho trang landing", done: m.storefrontPhotos.length > 0 },
    { key: "intro_video", label: "Video giới thiệu cửa hàng", hint: "Video ngắn hiện trên trang landing", done: m.introVideo !== null },
    { key: "featured_products", label: "Sản phẩm chủ đạo", hint: "Chọn ít nhất 1 sản phẩm tiêu biểu từ kho sản phẩm", done: m.featuredProductIds.length > 0 },
  ]
  const missing = items.filter((i) => !i.done)
  return { done: missing.length === 0, items, missing }
}

export interface BrandJourneyFlags {
  readonly profileDone: boolean
  readonly identityDone: boolean
  readonly landingDone: boolean
}

/** Trạng thái hiển thị của 3 tab theo đúng thứ tự `BRAND_STEPS`. */
export function brandStepStatuses(f: BrandJourneyFlags): JourneyStepStatus[] {
  const profile: JourneyStepStatus = f.profileDone ? "COMPLETED" : "INPUT_REQUIRED"
  const identity: JourneyStepStatus = !f.profileDone ? "LOCKED" : f.identityDone ? "COMPLETED" : "AVAILABLE"
  const landing: JourneyStepStatus = !f.profileDone || !f.identityDone ? "LOCKED" : f.landingDone ? "COMPLETED" : "AVAILABLE"
  return [profile, identity, landing]
}

/** Bước nên mở khi vào trang: bước đầu tiên chưa hoàn thành, hết thì bước cuối. */
export function currentBrandStep(f: BrandJourneyFlags): BrandStep {
  if (!f.profileDone) return "PROFILE"
  if (!f.identityDone) return "IDENTITY"
  return "LANDING"
}

/** Lý do bước còn khoá (để máy chủ từ chối); `null` = được làm. */
export function lockedReason(step: BrandStep, f: BrandJourneyFlags): string | null {
  if (step === "PROFILE") return null
  if (!f.profileDone) return "Hoàn thành Hồ sơ cửa hàng trước"
  if (step === "LANDING" && !f.identityDone) return "Chọn Bộ nhận diện thương hiệu trước"
  return null
}
