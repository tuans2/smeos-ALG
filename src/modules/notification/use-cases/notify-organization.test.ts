import { describe, expect, it, vi } from "vitest"
import { notifyOrganization, type NotifyDeps } from "./notify-organization"

function deps(over: Partial<NotifyDeps> = {}): NotifyDeps {
  return {
    listMembers: vi.fn().mockResolvedValue({
      organizationType: "SINGLE",
      members: [
        { userId: "admin", systemRoleKey: "dieu_hanh", email: "a@example.test" },
        { userId: "sale", systemRoleKey: "sale" },
      ],
    }),
    dispatch: vi.fn().mockResolvedValue({ eventKey: "ORDER_RECEIVED", recipientUserId: "x", dispatchedChannels: ["APP_INBOX"], results: [] }),
    ...over,
  }
}

describe("notifyOrganization", () => {
  it("gửi cho người nhận theo vai, trong đúng tổ chức của bên gọi", async () => {
    const d = deps()
    const sent = await notifyOrganization({ organizationId: "org-1", eventKey: "ORDER_RECEIVED", ownerUserId: "sale", deepLink: "/don-hang" }, d)
    expect(sent).toBe(2)
    const calls = (d.dispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])
    expect(calls.every((c) => c.recipient.organizationId === "org-1" && c.deepLink === "/don-hang")).toBe(true)
    expect(calls.map((c) => c.recipient.roleKey)).toEqual(["store_admin", "sales"])
  })

  it("chuỗi cha chính chỉ đi vào phạm vi khoá cứng, không thay parentOrgId của bên gọi (P2-A11)", async () => {
    const listMembers = vi.fn().mockResolvedValue({
      organizationType: "SINGLE",
      parentChainOrgId: "chain-1",
      members: [{ userId: "admin", systemRoleKey: "dieu_hanh" }],
    })
    const d = deps({ listMembers })
    await notifyOrganization({ organizationId: "org-1", eventKey: "ORDER_RECEIVED" }, d)
    const call = (d.dispatch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(call).toMatchObject({ lockParentOrgId: "chain-1", parentOrgId: undefined })

    const solo = deps()
    await notifyOrganization({ organizationId: "org-1", eventKey: "ORDER_RECEIVED" }, solo)
    expect((solo.dispatch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].lockParentOrgId).toBeUndefined()
  })

  it("không bao giờ ném lỗi về luồng nghiệp vụ", async () => {
    const d = deps({ listMembers: vi.fn().mockRejectedValue(new Error("db down")) })
    await expect(notifyOrganization({ organizationId: "org-1", eventKey: "ORDER_RECEIVED" }, d)).resolves.toBe(0)
    const d2 = deps({ dispatch: vi.fn().mockRejectedValue(new Error("smtp")) })
    await expect(notifyOrganization({ organizationId: "org-1", eventKey: "ORDER_RECEIVED" }, d2)).resolves.toBe(0)
  })

  it("bỏ qua sự kiện không có trong danh mục", async () => {
    const d = deps()
    expect(await notifyOrganization({ organizationId: "org-1", eventKey: "KHONG_CO" }, d)).toBe(0)
    expect(d.listMembers).not.toHaveBeenCalled()
  })

  it("ghi notification.dispatched với số gửi được / thất bại (SLI SLO v1)", async () => {
    const lines: string[] = []
    const spy = vi.spyOn(console, "log").mockImplementation((line: string) => void lines.push(line))
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ eventKey: "ORDER_RECEIVED", recipientUserId: "x", dispatchedChannels: ["APP_INBOX"], results: [] })
      .mockRejectedValueOnce(new Error("smtp"))
    vi.spyOn(console, "warn").mockImplementation(() => {})
    await notifyOrganization({ organizationId: "org-1", eventKey: "ORDER_RECEIVED", ownerUserId: "sale" }, deps({ dispatch }))
    spy.mockRestore()
    const summary = lines.map((l) => JSON.parse(l)).find((l) => l.event === "notification.dispatched")
    expect(summary).toMatchObject({ eventKey: "ORDER_RECEIVED", organizationId: "org-1", recipients: 2, sent: 1, failed: 1 })
  })
})
