import { describe, expect, it } from "vitest"
import { canAccessConversation, type LinkState } from "../conversation-access-policy"

const CHAIN = "chain-org"
const PARTNER = "partner-org"
const room = { organizationId: CHAIN, counterpartOrgId: PARTNER, branchId: null }
const branchRoom = { organizationId: CHAIN, counterpartOrgId: null, branchId: "branch-1" }
const legacyRoom = { organizationId: CHAIN, counterpartOrgId: null, branchId: null }
const facts = (linkState: LinkState, isLegacyParticipant = false) => ({ linkState, isLegacyParticipant })

describe("quyền vào phòng theo tổ chức (D1, D7, D10)", () => {
  it("mọi người của tổ chức chủ phòng vào được, không cần được mời", () => {
    expect(canAccessConversation(room, { organizationId: CHAIN, branchId: null }, facts("OTHER"))).toBe("READ_WRITE")
  })

  it("cửa hàng đối tác: ACTIVE đọc + gửi, SUSPENDED chỉ đọc, chấm dứt / chờ / không liên kết thì không", () => {
    expect(canAccessConversation(room, { organizationId: PARTNER, branchId: null }, facts("ACTIVE"))).toBe("READ_WRITE")
    expect(canAccessConversation(room, { organizationId: PARTNER, branchId: null }, facts("SUSPENDED"))).toBe("READ")
    expect(canAccessConversation(room, { organizationId: PARTNER, branchId: null }, facts("OTHER"))).toBe("NONE")
  })

  it("tổ chức thứ ba không vào được dù có liên kết với ai đó", () => {
    expect(canAccessConversation(room, { organizationId: "third", branchId: null }, facts("ACTIVE"))).toBe("NONE")
  })

  it("phòng chi nhánh: toàn tổ chức hoặc đúng chi nhánh; chi nhánh khác thì không", () => {
    expect(canAccessConversation(branchRoom, { organizationId: CHAIN, branchId: null }, facts("OTHER"))).toBe("READ_WRITE")
    expect(canAccessConversation(branchRoom, { organizationId: CHAIN, branchId: "branch-1" }, facts("OTHER"))).toBe("READ_WRITE")
    expect(canAccessConversation(branchRoom, { organizationId: CHAIN, branchId: "branch-2" }, facts("OTHER"))).toBe("NONE")
  })

  it("phòng cũ chưa có bên kia: chỉ thành viên với liên kết ACTIVE", () => {
    expect(canAccessConversation(legacyRoom, { organizationId: PARTNER, branchId: null }, facts("ACTIVE", true))).toBe("READ_WRITE")
    expect(canAccessConversation(legacyRoom, { organizationId: PARTNER, branchId: null }, facts("ACTIVE", false))).toBe("NONE")
    expect(canAccessConversation(legacyRoom, { organizationId: PARTNER, branchId: null }, facts("SUSPENDED", true))).toBe("NONE")
  })
})
