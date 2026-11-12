import { describe, expect, it } from "vitest"
import { globalConfig } from "zod/v4/core"

describe("instrumentation-client (CSP chặn eval)", () => {
  it("bật jitless cho Zod để không thử new Function trên trình duyệt", async () => {
    await import("@/instrumentation-client")
    expect(globalConfig.jitless).toBe(true)
  })
})
