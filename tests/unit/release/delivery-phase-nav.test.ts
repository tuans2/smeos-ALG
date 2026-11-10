import { afterEach, describe, expect, it, vi } from "vitest"

import { withDeliveryPhase } from "@/components/layout/nav/nav-phase"
import type { NavView } from "@/components/layout/nav/nav-types"
import { isHrefInPhase } from "@/lib/delivery/delivery-phase"
import { getNetworkJourneys, getStoreJourneys } from "@/modules/journey/domain/industry-journeys"
import { getAllTools, getVisibleGroups } from "@/modules/toolkit/domain/toolkit-catalog"

/** Kế hoạch bàn giao GD1, Bước 2.2: menu, lưới công cụ, hành trình chỉ còn mục trong phạm vi. */
const VIEW: NavView = {
  groups: [
    {
      key: "cong-cu",
      label: "Công cụ",
      entries: [
        { href: "/the-chao", label: "Thẻ chào", group: "cong-cu", iconKey: "Gift", navKey: "greeting-card" },
        { href: "/creative-studio", label: "Sáng tạo", group: "cong-cu", iconKey: "Palette", navKey: "creative-studio" },
      ],
    },
    {
      key: "thi-truong",
      label: "Thị trường",
      entries: [{ href: "/market-intelligence", label: "Thị trường", group: "thi-truong", iconKey: "Radar", navKey: "market-intel" }],
    },
  ],
}

describe("menu theo giai đoạn", () => {
  it("tắt: giữ nguyên cây menu", () => {
    expect(withDeliveryPhase(VIEW, "STORE", null)).toBe(VIEW)
  })

  it("gd1: bỏ mục ngoài phạm vi và nhóm rỗng", () => {
    const view = withDeliveryPhase(VIEW, "STORE", "gd1")
    expect(view.groups.map((group) => group.key)).toEqual(["cong-cu"])
    expect(view.groups[0]!.entries.map((entry) => entry.href)).toEqual(["/the-chao"])
  })

  it("gd1: tầng SaaS Ngành không có menu", () => {
    expect(withDeliveryPhase(VIEW, "INDUSTRY", "gd1").groups).toEqual([])
  })
})

describe("lưới công cụ và hành trình theo giai đoạn", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("tắt: lưới công cụ có cả công cụ ngoài phạm vi gd1", () => {
    expect(getAllTools().some((tool) => !isHrefInPhase(tool.href, "gd1"))).toBe(true)
  })

  it("gd1: không còn công cụ, hành trình dẫn ra ngoài phạm vi", () => {
    vi.stubEnv("NEXT_PUBLIC_DELIVERY_PHASE", "gd1")
    const outside = (href: string | null | undefined) => !isHrefInPhase(href, "gd1")
    expect(getAllTools().filter((tool) => outside(tool.href))).toEqual([])
    expect(getVisibleGroups(true).flatMap((group) => group.tools).filter((tool) => outside(tool.href))).toEqual([])
    for (const industry of [null, "FASHION"]) {
      expect(getStoreJourneys(industry).filter((journey) => outside(journey.primaryHref))).toEqual([])
      expect(getNetworkJourneys(industry).filter((journey) => outside(journey.primaryHref))).toEqual([])
    }
  })
})
