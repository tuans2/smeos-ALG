import { describe, expect, it } from "vitest"

import { canSignIn, signInBlockedMessage } from "./account-approval"

describe("account-approval", () => {
  it("chỉ APPROVED đăng nhập được", () => {
    expect(canSignIn("APPROVED")).toBe(true)
    expect(canSignIn("PENDING")).toBe(false)
    expect(canSignIn("REJECTED")).toBe(false)
  })

  it("chờ duyệt và bị từ chối có câu riêng; đã duyệt thì không chặn", () => {
    expect(signInBlockedMessage("PENDING")).toMatch(/chờ quản trị viên duyệt/)
    expect(signInBlockedMessage("REJECTED")).toMatch(/chưa được cấp quyền/)
    expect(signInBlockedMessage("APPROVED")).toBeNull()
  })
})
