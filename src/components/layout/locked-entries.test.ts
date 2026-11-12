import { afterEach, describe, expect, it, vi } from "vitest"

import { mobileSecondSlot } from "@/components/layout/nav-model"
import { buildOverflowActions } from "@/components/storage/storage-hub-tabs"
import { filterOpenHrefs } from "@/lib/feature-lock"
import { getNetworkJourneys } from "@/modules/journey/domain/industry-journeys"
import { ROLE_UX_CATALOG } from "@/modules/organization/domain/role-ux-catalog"

/**
 * Audit N-05 (12/11/2026): khi khoá "Sắp ra mắt" bật (`NEXT_PUBLIC_APP_ENV=production`), lối vào tuyến khoá phải ẩn
 * thay vì dẫn tới màn khoá. Khoá tắt (staging, bản giao GD1) thì giữ nguyên.
 */
const coordinator = ROLE_UX_CATALOG.find((r) => r.key === "coordinator")!
const handlers = { go: () => undefined, refreshRaw: () => undefined, refreshApproved: () => undefined, refreshLibrary: () => undefined }

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("ẩn lối vào tuyến khoá khi bật khoá", () => {
  it("ô thứ hai của thanh dưới: chuỗi dùng Đơn hàng thay cho Điều phối đang khoá", () => {
    expect(mobileSecondSlot(() => true, coordinator).href).toBe("/dieu-phoi")
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production")
    expect(mobileSecondSlot(() => true, coordinator).href).toBe("/don-hang")
  })

  it('Kho dữ liệu, tab Đã duyệt: bỏ nút "Đi tới Hàng chờ duyệt" khi /duyet khoá', () => {
    expect(buildOverflowActions("approved", handlers).map((a) => a.id)).toEqual(["go-approval-queue"])
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production")
    expect(buildOverflowActions("approved", handlers).map((a) => a.id)).toEqual(["refresh-finalized"])
  })

  it('Kho dữ liệu, thư viện: bỏ nút "Mở … trong công cụ" khi công cụ đích khoá', () => {
    expect(buildOverflowActions("lib:video", handlers).map((a) => a.id)).toEqual(["refresh-library", "open-tool"])
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production")
    expect(buildOverflowActions("lib:video", handlers).map((a) => a.id)).toEqual(["refresh-library"])
    expect(buildOverflowActions("lib:original", handlers).map((a) => a.id)).toEqual(["refresh-library", "open-tool"])
  })

  it("trang chủ chuỗi: ẩn thẻ hành trình dẫn tới tuyến khoá (Điều phối, Khách hàng)", () => {
    const ids = (list: { id: string }[]) => list.map((j) => j.id)
    expect(ids(filterOpenHrefs(getNetworkJourneys(null), (j) => j.primaryHref))).toContain("network-dispatch")
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production")
    const shown = ids(filterOpenHrefs(getNetworkJourneys(null), (j) => j.primaryHref))
    expect(shown).not.toContain("network-dispatch")
    expect(shown).not.toContain("network-crm")
    expect(shown).toContain("network-overview")
    expect(shown).toContain("network-sales")
  })
})
