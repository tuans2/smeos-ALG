import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { saveLandingPage } from "../save-landing-page"

const ctx = { organizationId: "org-a", workspaceId: "w", userId: "u", branchId: null, capabilities: new Set() } as TenantContext
const data = { title: "Mừng khai trương", pageType: null, occasionLabel: "Khai trương", input: {}, content: {} }

describe("saveLandingPage", () => {
  it("trả id bản ghi đã lưu", async () => {
    expect(await saveLandingPage(ctx, data, vi.fn(async () => ({ id: "lp-1" })))).toBe("lp-1")
  })

  it("lỗi ghi không làm hỏng lượt sinh: trả null", async () => {
    expect(await saveLandingPage(ctx, data, vi.fn(async () => Promise.reject(new Error("db"))))).toBeNull()
  })
})
