import { describe, expect, it } from "vitest"

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"

import { hasCapability, requireCapability } from "./capabilities"

function contextWith(capabilities: string[]): TenantContext {
  return {
    organizationId: "org-a",
    workspaceId: "ws-a",
    userId: "user-a",
    branchId: null,
    capabilities: new Set(capabilities),
  }
}

describe("cổng năng lực", () => {
  it("chặn khi ngữ cảnh chưa có năng lực nào — trạng thái của P1", () => {
    const ctx = contextWith([])
    expect(hasCapability(ctx, "F7")).toBe(false)
    expect(() => requireCapability(ctx, "F7")).toThrow(AppError)
  })

  it("thân lỗi nêu đúng mã còn thiếu", () => {
    try {
      requireCapability(contextWith([]), "I2")
      expect.unreachable("phải ném")
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      const app = error as AppError
      expect(app.code).toBe("CAPABILITY_DENIED")
      expect(app.status).toBe(403)
      expect(app.details).toEqual({ capability: "I2" })
    }
  })

  it("cho qua khi ngữ cảnh có mã — hình dạng mà P2 sẽ nạp vào", () => {
    expect(() => requireCapability(contextWith(["F6"]), "F6")).not.toThrow()
  })
})
