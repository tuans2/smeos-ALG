import { describe, expect, it } from "vitest"
import { ALL_INDUSTRY_KEYS } from "@/modules/organization/domain/industry-profile"
import { INDUSTRY_JOURNEYS, NETWORK_JOURNEYS, PLATFORM_JOURNEYS, STORE_JOURNEYS } from "./journey-catalog"
import { getNetworkJourneys, getStoreJourneys } from "./industry-journeys"

// Tên việc trên thẻ trang chủ ≤ 5 từ; giải thích nằm trong "?" (OPERATING_PRINCIPLES §6).
const words = (s: string) => s.split(/\s+/).filter((w) => w !== "&").length

describe("tên việc trang chủ ngắn gọn", () => {
  it("mọi hành trình ở mọi tầng và mọi ngành có tên ≤ 5 từ", () => {
    const all = [
      ...STORE_JOURNEYS, ...PLATFORM_JOURNEYS, ...NETWORK_JOURNEYS, ...INDUSTRY_JOURNEYS,
      ...ALL_INDUSTRY_KEYS.flatMap((k) => [...getStoreJourneys(k), ...getNetworkJourneys(k)]),
    ]
    const long = all.filter((j) => words(j.goal) > 5).map((j) => `${j.id}: ${j.goal}`)
    expect(long).toEqual([])
  })

  it("không còn thuật ngữ kỹ thuật trong tên việc", () => {
    const all = [...STORE_JOURNEYS, ...PLATFORM_JOURNEYS, ...NETWORK_JOURNEYS, ...INDUSTRY_JOURNEYS]
    expect(all.filter((j) => /BOM|Plugin|Vision|A6/.test(j.goal)).map((j) => j.goal)).toEqual([])
  })
})
