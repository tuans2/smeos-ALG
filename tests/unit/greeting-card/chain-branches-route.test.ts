import { beforeEach, describe, expect, it, vi } from "vitest"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(["R4"]) }
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx }) }))
vi.mock("@/core/rbac/capabilities", () => ({ requireCapability: () => undefined }))

// Chi nhánh theo tổ chức (bản trong bộ nhớ thay cho dòng branches nhận đơn điều phối)
const rows = new Map<string, Array<{ branchId: string; branchName: string; isActive: boolean; channels?: Record<string, string> }>>()
vi.mock("@/modules/greeting-card/infra/chain-branch-repository", () => ({
  ChainBranchRepository: class {
    async listCandidates(orgId: string) {
      return rows.get(orgId) ?? []
    }
    async setActive(orgId: string, code: string, isActive: boolean) {
      const b = (rows.get(orgId) ?? []).find((r) => r.branchId === code)
      if (!b) return false
      b.isActive = isActive
      return true
    }
  },
}))
vi.mock("@/modules/greeting-card/infra/telegram-linked-chats", () => ({ listLinkedTelegramChatIds: async () => ["-100"] }))

import { GET } from "@/app/api/v1/greeting-card/chain-branches/route"
import { PATCH } from "@/app/api/v1/greeting-card/chain-branches/[branchCode]/route"

function patch(code: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/x/${code}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ branchCode: code }) }
  )
}

/** Danh sách đối tác: xem được cả chi nhánh không còn trong Excel, tạm dừng / bật lại; chỉ của tổ chức mình. */
describe("chain-branches route", () => {
  beforeEach(() => {
    rows.clear()
    rows.set("org-a", [
      { branchId: "CN-BADINH", branchName: "Ba Đình", isActive: true, channels: { telegramChatId: "-100" } },
      { branchId: "CN-CAUGIAY", branchName: "Cầu Giấy", isActive: true, channels: { telegramChatId: "-999" } },
    ])
    rows.set("org-b", [{ branchId: "CN-KHAC", branchName: "Tiệm khác", isActive: true }])
  })

  it("GET trả mọi chi nhánh của tổ chức kèm trạng thái liên kết Telegram", async () => {
    const body = await (await GET(new Request("http://localhost/x"))).json()
    expect(body.data.map((b: { branchCode: string }) => b.branchCode)).toEqual(["CN-BADINH", "CN-CAUGIAY"])
    expect(body.data[0].telegramLinked).toBe(true)
    expect(body.data[1].telegramLinked).toBe(false)
  })

  it("PATCH tạm dừng rồi bật lại", async () => {
    expect((await patch("CN-BADINH", { is_active: false })).status).toBe(200)
    expect(rows.get("org-a")?.[0]?.isActive).toBe(false)
    expect((await patch("CN-BADINH", { is_active: true })).status).toBe(200)
    expect(rows.get("org-a")?.[0]?.isActive).toBe(true)
  })

  it("PATCH chi nhánh của tổ chức khác: 404, không đổi gì", async () => {
    expect((await patch("CN-KHAC", { is_active: false })).status).toBe(404)
    expect(rows.get("org-b")?.[0]?.isActive).toBe(true)
  })

  it("PATCH thiếu is_active: 400", async () => {
    expect((await patch("CN-BADINH", {})).status).toBe(400)
  })
})
