import { describe, it, expect } from "vitest"
import { getStoreJourneys, getNetworkJourneys } from "./industry-journeys"
import { STORE_JOURNEYS, NETWORK_JOURNEYS } from "./journey-catalog"

describe("industry-journeys", () => {
  describe("getStoreJourneys", () => {
    it("returns default STORE_JOURNEYS for FLORAL or null", () => {
      expect(getStoreJourneys("FLORAL")).toEqual(STORE_JOURNEYS)
      expect(getStoreJourneys(null)).toEqual(STORE_JOURNEYS)
    })

    it("adapts terms for FASHION", () => {
      const journeys = getStoreJourneys("FASHION")
      expect(journeys.length).toBe(STORE_JOURNEYS.length)
      const hub = journeys.find((j) => j.id === "greeting-card-hub")
      expect(hub?.description).toContain("bộ sưu tập lookbook")
      const analyze = journeys.find((j) => j.id === "analyze-product-photo")
      expect(analyze?.steps[0]?.description).toContain("mẫu thiết kế lookbook")
    })
  })

  describe("getNetworkJourneys", () => {
    it("returns default NETWORK_JOURNEYS for FLORAL or null", () => {
      expect(getNetworkJourneys("FLORAL")).toEqual(NETWORK_JOURNEYS)
      expect(getNetworkJourneys(null)).toEqual(NETWORK_JOURNEYS)
    })

    it("adapts terms for FASHION", () => {
      const journeys = getNetworkJourneys("FASHION")
      expect(journeys.length).toBe(NETWORK_JOURNEYS.length)
      const products = journeys.find((j) => j.id === "network-products")
      expect(products?.description).toContain("mẫu thiết kế lookbook")
      const partners = journeys.find((j) => j.id === "network-partners")
      expect(partners?.description).toContain("thợ may")
    })

    it("adapts terms for FNB", () => {
      const journeys = getNetworkJourneys("FNB")
      const dispatch = journeys.find((j) => j.id === "network-dispatch")
      expect(dispatch?.description).toContain("mẫu món chuẩn")
    })
  })
})
