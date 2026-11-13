import { describe, expect, it } from "vitest"

import { AppError } from "@/core/http/errors"
import type { PlatformContext } from "./platform-context"
import { hasPlatformCapability, requirePlatformCapability } from "./platform-capabilities"

function pctx(codes: string[]): PlatformContext {
  return { userId: "u1", capabilities: new Set(codes) }
}

describe("platform-capabilities", () => {
  it("hasPlatformCapability đúng khi có mã, sai khi không có", () => {
    expect(hasPlatformCapability(pctx(["N1", "N4"]), "N1")).toBe(true)
    expect(hasPlatformCapability(pctx(["N1"]), "N4")).toBe(false)
  })

  it("requirePlatformCapability không ném khi có mã", () => {
    expect(() => requirePlatformCapability(pctx(["N5"]), "N5")).not.toThrow()
  })

  it("requirePlatformCapability ném CAPABILITY_DENIED (403) khi thiếu mã", () => {
    try {
      requirePlatformCapability(pctx(["N1"]), "N4")
      throw new Error("phải ném lỗi")
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe("CAPABILITY_DENIED")
      expect((error as AppError).status).toBe(403)
    }
  })

  it("ngữ cảnh trống (chưa cấp mã nào) bị chặn mọi mã — trạng thái đúng của một cổng chưa có bảng gán", () => {
    const trong = pctx([])
    expect(hasPlatformCapability(trong, "N1")).toBe(false)
    expect(() => requirePlatformCapability(trong, "N1")).toThrow(AppError)
  })

  it("ném lỗi lập trình rõ ràng cho mã không thuộc dải N — không âm thầm trả false", () => {
    expect(() => requirePlatformCapability(pctx(["N1"]), "L1")).toThrow(/không tồn tại/)
  })
})
