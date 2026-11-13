import { describe, expect, it } from "vitest"
import { isFeatureLockEnabled, isJourneyLocked, isRouteLocked, isUnavailableLockEnabled } from "./feature-lock"
import { STORE_JOURNEYS } from "@/modules/journey/domain/journey-catalog"

describe("feature-lock", () => {
  it("chỉ bật khi NEXT_PUBLIC_APP_ENV=production", () => {
    expect(isFeatureLockEnabled("production")).toBe(true)
    expect(isFeatureLockEnabled("staging")).toBe(false)
    expect(isFeatureLockEnabled(undefined)).toBe(false)
  })

  it("khóa tuyến, tuyến con và tuyến kèm query khi bật", () => {
    expect(isRouteLocked("/creative-studio?tab=area-d", true)).toBe(true)
    expect(isRouteLocked("/hoi-thoai/kenh-tich-hop", true)).toBe(true)
    expect(isRouteLocked("/kho-templates", true)).toBe(true)
  })

  it("production: khóa Tính giá, Tri thức, Chính sách AI, Kết nối kênh, Khách hàng, Bộ máy trên sidebar", () => {
    for (const href of ["/gia", "/tri-thuc", "/cai-dat-ai", "/ket-noi", "/khach-hang", "/bo-may"]) {
      expect(isRouteLocked(href, true)).toBe(true)
    }
    expect(isRouteLocked("/bao-gia", true)).toBe(false)
  })

  it("không khóa tuyến khác hoặc tuyến chỉ trùng tiền tố chữ", () => {
    expect(isRouteLocked("/don-hang", true)).toBe(false)
    expect(isRouteLocked("/videos", true)).toBe(false)
    expect(isRouteLocked("/", true)).toBe(false)
  })

  it("không khóa gì khi tắt (dev/staging)", () => {
    expect(isRouteLocked("/creative-studio", false)).toBe(false)
    expect(isJourneyLocked("manage-customers", false)).toBe(false)
  })

  it("khóa đúng thẻ trang chủ khi bật", () => {
    expect(isJourneyLocked("manage-customers", true)).toBe(true)
    expect(isJourneyLocked("view-store-overview", true)).toBe(true)
  })

  it("production: trang chủ cửa hàng mở các thẻ đã hoạt động", () => {
    const open = STORE_JOURNEYS.filter((j) => !isJourneyLocked(j.id, true)).map((j) => j.id)
    expect(open).toEqual(["greeting-card-hub", "analyze-product-photo", "create-order"])
    expect(isJourneyLocked("view-platform-overview", true)).toBe(false)
  })

  it("production: khóa toàn bộ nhóm Vận hành trên sidebar", () => {
    for (const href of ["/dieu-phoi", "/job", "/duyet/abc", "/so-lieu", "/muc-dung", "/audit"]) {
      expect(isRouteLocked(href, true)).toBe(true)
    }
    expect(isRouteLocked("/the-chao", true)).toBe(false)
  })

  it("bản build production luôn khoá tuyến chưa vận hành được, kể cả khi tắt khoá chung (P0-06)", () => {
    expect(isUnavailableLockEnabled("production")).toBe(true)
    expect(isUnavailableLockEnabled("development")).toBe(false)
    for (const href of ["/market-intelligence", "/lich-dang?tab=queue", "/ket-noi"]) {
      expect(isRouteLocked(href, false, true)).toBe(true)
      expect(isRouteLocked(href, false, false)).toBe(false)
    }
    expect(isRouteLocked("/don-hang", false, true)).toBe(false)
  })
})
