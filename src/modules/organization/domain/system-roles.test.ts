import { describe, expect, it } from "vitest"

import { SYSTEM_ROLES } from "./system-roles"

describe("vai hệ thống", () => {
  it("tên vai hiện trên màn hình là tiếng Việt (GD1 Bước 6, A-08) — chỉ giữ tên riêng Sale, Marketing, Shipper", () => {
    const KEEP = new Set(["Sale", "Marketing", "Shipper"])
    for (const role of SYSTEM_ROLES) {
      if (KEEP.has(role.name)) continue
      expect(role.name, role.key).toMatch(/[ạ-ỹà-ýđĐ]/u)
    }
    expect(SYSTEM_ROLES.find((r) => r.key === "experience_user")?.name).toBe("Người dùng trải nghiệm")
  })
})
