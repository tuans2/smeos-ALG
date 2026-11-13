import { describe, expect, it } from "vitest"
import { isAddressedTo, resolveRecipient, roleOf } from "../internal-message"

describe("internal-message", () => {
  it("vai suy từ năng lực, không do client chọn", () => {
    expect(roleOf(new Set(["F2", "R4", "R2"]))).toBe("ADMIN")
    expect(roleOf(new Set(["R4", "R2", "R9"]))).toBe("COORDINATOR")
    expect(roleOf(new Set(["R1", "R2", "R9"]))).toBe("SALE")
    expect(roleOf(new Set(["R1"]))).toBeNull()
  })

  it("sale phụ trách: link riêng → đúng người; link công khai → mọi sale", () => {
    expect(resolveRecipient({ kind: "OWNER_SALE" }, "lan")).toEqual({ toRole: null, toUserId: "lan" })
    expect(resolveRecipient({ kind: "OWNER_SALE" }, "public")).toEqual({ toRole: "SALE", toUserId: null })
    expect(resolveRecipient({ kind: "ROLE", role: "ADMIN" }, "lan")).toEqual({ toRole: "ADMIN", toUserId: null })
  })

  it("gửi cho vai → mọi người vai đó; gửi riêng → chỉ người đó; không tự báo cho mình", () => {
    const toAdmin = { senderId: "lan", toRole: "ADMIN", toUserId: null }
    expect(isAddressedTo(toAdmin, { userId: "chu", role: "ADMIN" })).toBe(true)
    expect(isAddressedTo(toAdmin, { userId: "minh", role: "SALE" })).toBe(false)
    expect(isAddressedTo({ senderId: "chu", toRole: null, toUserId: "lan" }, { userId: "lan", role: "SALE" })).toBe(true)
    expect(isAddressedTo({ senderId: "chu", toRole: null, toUserId: "lan" }, { userId: "minh", role: "SALE" })).toBe(false)
    expect(isAddressedTo({ senderId: "chu", toRole: "ADMIN", toUserId: null }, { userId: "chu", role: "ADMIN" })).toBe(false)
  })
})
