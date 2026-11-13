import { describe, expect, it, vi } from "vitest"
import { decidePublicChatLimits, type DecidePublicChatLimitsDeps } from "../decide-public-chat-limits"

const pctx = { userId: "admin-1", capabilities: new Set(["N2"]) }
const pending = { per_visitor: 100, per_ip: 300, requested_at: "2026-10-31T00:00:00Z", requested_by: "u1", note: "mùa lễ" }

function makeDeps(settings: Record<string, unknown> | null): DecidePublicChatLimitsDeps {
  return {
    orgRepo: {
      findById: vi.fn(async () =>
        settings === null ? null : ({ id: "org-1", type: "SINGLE", settings } as never),
      ),
      updateTypeAndSettings: vi.fn(async () => undefined as never),
    },
    writeLimits: vi.fn(async () => {}),
    audit: vi.fn(async () => undefined as never),
    now: () => new Date("2026-10-31T05:00:00Z"),
  }
}

describe("decidePublicChatLimits", () => {
  it("thiếu năng lực N2 → từ chối, không ghi gì", async () => {
    const deps = makeDeps({ pending_public_chat_limits: pending })
    await expect(
      decidePublicChatLimits({ userId: "x", capabilities: new Set() }, { organizationId: "org-1", approve: true }, deps),
    ).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    expect(deps.writeLimits).not.toHaveBeenCalled()
  })

  it("duyệt → ghi đúng mức đã xin kèm thời điểm duyệt, xoá yêu cầu, giữ settings khác", async () => {
    const deps = makeDeps({ pending_public_chat_limits: pending, unlocked_locales: ["vi"] })
    await decidePublicChatLimits(pctx, { organizationId: "org-1", approve: true }, deps)
    expect(deps.writeLimits).toHaveBeenCalledWith("org-1", {
      perVisitor: 100,
      perIp: 300,
      approvedAt: "2026-10-31T05:00:00.000Z",
    })
    expect(deps.orgRepo.updateTypeAndSettings).toHaveBeenCalledWith("org-1", "SINGLE", { unlocked_locales: ["vi"] })
  })

  it("từ chối → chỉ xoá yêu cầu, không ghi hạn mức", async () => {
    const deps = makeDeps({ pending_public_chat_limits: pending })
    const res = await decidePublicChatLimits(pctx, { organizationId: "org-1", approve: false }, deps)
    expect(res.action).toBe("rejected")
    expect(deps.writeLimits).not.toHaveBeenCalled()
    expect(deps.orgRepo.updateTypeAndSettings).toHaveBeenCalledWith("org-1", "SINGLE", {})
  })

  it("mức trong settings bị sửa tay ngoài danh sách chọn sẵn → không duyệt", async () => {
    const deps = makeDeps({ pending_public_chat_limits: { ...pending, per_visitor: 99_999 } })
    await expect(decidePublicChatLimits(pctx, { organizationId: "org-1", approve: true }, deps)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    })
    expect(deps.writeLimits).not.toHaveBeenCalled()
  })

  it("không có yêu cầu chờ duyệt hoặc không có tổ chức → lỗi", async () => {
    await expect(decidePublicChatLimits(pctx, { organizationId: "org-1", approve: true }, makeDeps({}))).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    })
    await expect(decidePublicChatLimits(pctx, { organizationId: "nope", approve: true }, makeDeps(null))).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
