import { describe, expect, it } from "vitest"

import {
  isSelfApprovalAllowed,
  selfApprovalBlocked,
  isVisibleInApprovalQueue,
  SELF_APPROVAL_SETTINGS_KEY,
} from "./self-approval-policy"

describe("công tắc cho_phep_tu_duyet", () => {
  it("chưa cấu hình gì thì mặc định KHÔNG cho tự duyệt", () => {
    expect(isSelfApprovalAllowed(null)).toBe(false)
    expect(isSelfApprovalAllowed(undefined)).toBe(false)
    expect(isSelfApprovalAllowed({})).toBe(false)
  })

  it("tổ chức tắt công tắc thì không cho tự duyệt", () => {
    expect(isSelfApprovalAllowed({ [SELF_APPROVAL_SETTINGS_KEY]: false })).toBe(false)
  })

  it("tổ chức bật rõ ràng thì cho tự duyệt", () => {
    expect(isSelfApprovalAllowed({ [SELF_APPROVAL_SETTINGS_KEY]: true })).toBe(true)
  })

  it("giá trị không phải boolean bị bỏ qua, rơi về mặc định", () => {
    expect(isSelfApprovalAllowed({ [SELF_APPROVAL_SETTINGS_KEY]: "true" })).toBe(false)
  })

  it("bản ghi của người khác luôn hiện trong hàng đợi, không phụ thuộc công tắc", () => {
    expect(
      isVisibleInApprovalQueue({
        actorId: "u-dieu-hanh",
        createdBy: "u-dieu-phoi",
        settings: { [SELF_APPROVAL_SETTINGS_KEY]: false },
      })
    ).toBe(true)
  })

  it("bật công tắc: bản ghi của chính actor hiện trong hàng đợi của họ", () => {
    expect(
      isVisibleInApprovalQueue({
        actorId: "u-dieu-hanh",
        createdBy: "u-dieu-hanh",
        settings: { [SELF_APPROVAL_SETTINGS_KEY]: true },
      })
    ).toBe(true)
  })

  it("tắt công tắc: bản ghi của chính actor biến mất khỏi hàng đợi của họ", () => {
    expect(
      isVisibleInApprovalQueue({
        actorId: "u-dieu-hanh",
        createdBy: "u-dieu-hanh",
        settings: { [SELF_APPROVAL_SETTINGS_KEY]: false },
      })
    ).toBe(false)
  })

  it("selfApprovalBlocked: chặn người tạo tự duyệt khi công tắc tắt hoặc chưa cấu hình", () => {
    expect(selfApprovalBlocked({ actorId: "u1", requesterId: "u1", settings: {} })).toMatch(/Không tự duyệt/)
    expect(selfApprovalBlocked({ actorId: "u1", requesterId: "u1", settings: { [SELF_APPROVAL_SETTINGS_KEY]: true } })).toBeNull()
    expect(selfApprovalBlocked({ actorId: "u1", requesterId: "u2", settings: {} })).toBeNull()
    expect(selfApprovalBlocked({ actorId: "u1", requesterId: null, settings: {} })).toBeNull()
  })
})
