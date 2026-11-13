import { describe, expect, it } from "vitest"

import { describePlatformAccess, platformAccessLabel } from "./platform-access"

const P = "http://localhost/api/v1/platform"

describe("mục đích truy cập của nhân viên nền tảng (ADR-013 D-I5)", () => {
  it.each([
    ["GET", `${P}/organizations/o1`, "org.profile.read"],
    ["PATCH", `${P}/organizations/o1`, "org.profile.update"],
    ["GET", `${P}/organizations/o1/credits`, "org.credits.read"],
    ["POST", `${P}/organizations/o1/credits`, "org.credits.adjust"],
    ["GET", `${P}/organizations/o1/custom-domains`, "org.domains.read"],
    ["PUT", `${P}/organizations/o1/field-overrides`, "org.fields.update"],
    ["GET", `${P}/organizations/o1/field-preview`, "org.fields.read"],
    ["GET", `${P}/organizations/o1/subscription`, "org.subscription.read"],
    ["PUT", `${P}/organizations/o1/subscription`, "org.subscription.update"],
    ["DELETE", `${P}/organizations/o1/subscription`, "org.subscription.cancel"],
    ["PUT", `${P}/organizations/o1/usage-limit`, "org.usage_limit.update"],
    ["GET", `${P}/orgs-data/o1`, "org.data.overview"],
    ["GET", `${P}/orgs-data/o1/export`, "org.data.export"],
    ["PUT", `${P}/orgs-data/o1/legal-hold`, "org.legal_hold.update"],
    ["PUT", `${P}/orgs-data/o1/assets/a1/legal-hold`, "org.legal_hold.update"],
    ["GET", `${P}/orgs-data/o1/records/orders`, "org.records.orders.read"],
    ["GET", `${P}/orgs-data/o1/records/customers?export=csv`, "org.records.customers.export"],
  ])("%s %s → %s", (method, url, purpose) => {
    expect(describePlatformAccess(method, url)).toEqual({ organizationId: "o1", purpose })
  })

  it("thao tác lạ vẫn ghi (mục đích chung); đường dẫn không vào một tổ chức → null", () => {
    expect(describePlatformAccess("POST", `${P}/organizations/o1/subscription`)?.purpose).toBe("org.other.post")
    expect(describePlatformAccess("GET", `${P}/organizations`)).toBeNull()
    expect(describePlatformAccess("GET", `${P}/orgs-data`)).toBeNull()
    expect(describePlatformAccess("GET", "http://localhost/api/v1/organizations/current")).toBeNull()
  })

  it("nhãn tiếng Việt, không lộ mã kỹ thuật", () => {
    expect(platformAccessLabel("org.records.orders.export")).toBe("Tải dữ liệu đơn hàng")
    expect(platformAccessLabel("org.data.export")).toBe("Xuất toàn bộ dữ liệu")
    expect(platformAccessLabel("org.other.post")).toBe("Truy cập dữ liệu tổ chức")
  })
})
