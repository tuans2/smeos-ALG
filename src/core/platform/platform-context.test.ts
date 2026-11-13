import { describe, expect, it } from "vitest"

import type { PlatformContext } from "./platform-context"

describe("PlatformContext", () => {
  it("không mang organizationId — khác hình dạng với TenantContext một cách có chủ đích", () => {
    const pctx: PlatformContext = { userId: "u1", capabilities: new Set(["N1"]) }
    expect("organizationId" in pctx).toBe(false)
  })

  it("capabilities là tập chỉ đọc", () => {
    const pctx: PlatformContext = { userId: "u1", capabilities: new Set(["N1", "N4"]) }
    expect(pctx.capabilities.has("N1")).toBe(true)
    expect(pctx.capabilities.has("N9")).toBe(false)
  })
})
