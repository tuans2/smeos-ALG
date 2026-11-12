import { beforeEach, describe, expect, it, vi } from "vitest"

import { unauthenticated } from "@/core/http/errors"

/**
 * Bốn phát hiện quyền truy cập có từ trước (rà chuẩn API v1.1, PO duyệt xử lý 12/11/2026):
 * - `GET /chat/channels`, `GET /chat/public-limits` từng không kiểm mã năng lực → nay đòi `W1` (xem tích hợp);
 * - `GET /catalog-links/[slug]` công khai từng không giới hạn tần suất → nay 60 lượt/phút/IP;
 * - `GET /product-photo`, `GET /product-image-set` từng không đòi phiên → nay phải đăng nhập.
 */
type Ctx = { organizationId: string; workspaceId: string; userId: string; branchId: null; capabilities: Set<string> }
const ctxWith = (codes: string[]): Ctx => ({ organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(codes) })
let current: Ctx | null = ctxWith([])
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({
  requireTenantContext: async () => {
    if (!current) throw unauthenticated()
    return { ctx: current, resolved: { user: { id: "u" }, session: { id: "s" } } }
  },
}))
const enforceRateLimit = vi.fn(async () => undefined)
vi.mock("@/core/http/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/http/rate-limit")>()),
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...(args as [])),
}))
vi.mock("@/modules/chat-assistant/use-cases/list-chat-channels", () => ({ listChatChannels: async () => [] }))
vi.mock("@/modules/chat-assistant/use-cases/public-chat-limits", () => ({ getPublicChatLimitStatus: async () => ({}), requestPublicChatLimits: async () => null }))
vi.mock("@/modules/catalog-links/use-cases/get-catalog-link", () => ({ getCatalogLinkBySlug: async () => null }))

import { GET as chatChannels } from "@/app/api/v1/chat/channels/route"
import { GET as publicLimits } from "@/app/api/v1/chat/public-limits/route"
import { GET as catalogLink } from "@/app/api/v1/catalog-links/[slug]/route"
import { GET as photoPresets } from "@/app/api/v1/product-photo/route"
import { GET as imageSetBundles } from "@/app/api/v1/product-image-set/route"

const req = (path: string) => new Request(`http://localhost/api/v1${path}`)

describe("phát hiện quyền truy cập đã đóng (PO 12/11/2026)", () => {
  beforeEach(() => {
    current = ctxWith([])
    enforceRateLimit.mockClear()
  })

  it("cấu hình kênh chat và hạn mức chat công khai đòi W1", async () => {
    expect((await chatChannels(req("/chat/channels"))).status).toBe(403)
    expect((await publicLimits(req("/chat/public-limits"))).status).toBe(403)
    current = ctxWith(["W1"])
    expect((await publicLimits(req("/chat/public-limits"))).status).toBe(200)
  })

  it("tra link catalog công khai qua giới hạn tần suất theo IP trước khi tra", async () => {
    const res = await catalogLink(req("/catalog-links/abc"), { params: Promise.resolve({ slug: "abc" }) })
    expect(res.status).toBe(404)
    expect(enforceRateLimit).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ scope: "catalog-link-view", limit: 60 }))
  })

  it("danh mục preset/bộ ảnh tĩnh đòi đăng nhập", async () => {
    current = null
    expect((await photoPresets(req("/product-photo"))).status).toBe(401)
    expect((await imageSetBundles(req("/product-image-set"))).status).toBe(401)
    current = ctxWith([])
    expect((await photoPresets(req("/product-photo"))).status).toBe(200)
  })
})
