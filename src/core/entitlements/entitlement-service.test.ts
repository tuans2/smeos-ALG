import { describe, expect, it } from "vitest"
import {
  hasPlanEntitlement,
  resolvePlanFromOrg,
} from "./entitlement-service"

describe("entitlement-service (Commercial Feature Entitlement)", () => {
  it("nhận diện đúng gói từ credit_plan và organization_type", () => {
    expect(resolvePlanFromOrg(null, "EXPERIENCE")).toBe("EXPERIENCE")
    expect(resolvePlanFromOrg(null, "CHAIN")).toBe("FLOWER_NETWORK")
    expect(resolvePlanFromOrg("STARTER", "STORE")).toBe("STARTER")
    expect(resolvePlanFromOrg("PRO", "STORE")).toBe("PRO")
    expect(resolvePlanFromOrg(null, "STORE")).toBe("PRO")
  })

  it("gói EXPERIENCE chỉ có các tính năng cơ bản dùng thử", () => {
    expect(hasPlanEntitlement("EXPERIENCE", "vision.basic")).toBe(true)
    expect(hasPlanEntitlement("EXPERIENCE", "experience.trial")).toBe(true)
    expect(hasPlanEntitlement("EXPERIENCE", "ai.video.generate")).toBe(false)
    expect(hasPlanEntitlement("EXPERIENCE", "network.dispatch")).toBe(false)
  })

  it("gói PRO bao gồm toàn bộ năng lực AI và Creative Studio của cửa hàng", () => {
    expect(hasPlanEntitlement("PRO", "creative.studio")).toBe(true)
    expect(hasPlanEntitlement("PRO", "ai.video.generate")).toBe(true)
    expect(hasPlanEntitlement("PRO", "ai.chat.sales")).toBe(true)
    expect(hasPlanEntitlement("PRO", "network.dispatch")).toBe(false)
  })

  it("gói FLOWER_NETWORK bao gồm các năng lực mạng lưới điều phối và xưởng đối tác", () => {
    expect(hasPlanEntitlement("FLOWER_NETWORK", "network.dispatch")).toBe(true)
    expect(hasPlanEntitlement("FLOWER_NETWORK", "partner.management")).toBe(true)
    expect(hasPlanEntitlement("FLOWER_NETWORK", "qc.inspection")).toBe(true)
    expect(hasPlanEntitlement("FLOWER_NETWORK", "finance.reconciliation")).toBe(true)
  })
})
