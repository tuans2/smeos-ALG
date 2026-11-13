import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"

vi.mock("@/core/ai/gateway", () => ({ callCapability: vi.fn() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: vi.fn() }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: vi.fn() }))
const { logInfo } = vi.hoisted(() => ({ logInfo: vi.fn() }))
vi.mock("@/core/observability/log", () => ({ log: { info: logInfo, warn: vi.fn(), error: vi.fn() } }))

import { callCapability } from "@/core/ai/gateway"
import { executeGenerateLandingContent } from "@/modules/content-engine/use-cases/generate-landing-page-content.use-case"

const ctx = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null, capabilities: new Set<string>() } as unknown as TenantContext

function draft(faqAnswer: string, headline = "Hồng đỏ cho ngày 20/10 của mẹ") {
  return {
    hero: { badge: "Mùa 20/10", headline, subHeadline: "Chọn mẫu qua ảnh thật." },
    story: { title: "Chuyện của tiệm", paragraph1: "Tiệm nhỏ ở góc phố.", paragraph2: "", quote: "Cảm ơn mẹ." },
    perks: [{ title: "Chọn mẫu qua ảnh thật", description: "Mỗi mẫu có ảnh." }],
    faq: [{ question: "Bao lâu thì giao?", answer: faqAnswer }],
    lead: { title: "Để lại số", description: "Tiệm gọi lại tư vấn." },
  }
}
const input = { shopName: "Tiệm A", occasionId: "20-10", occasionLabel: "20/10", selectedProducts: [] }
const critic = { kind: "xong", output: { factual: 1, completeness: 1, issues: [], fixInstructions: "" } }

describe("landing — kiểm chữ sau AI", () => {
  beforeEach(() => vi.mocked(callCapability).mockReset())

  it("lời hứa chưa khai → viết lại 1 lần; còn thì bỏ mục FAQ đó", async () => {
    vi.mocked(callCapability)
      .mockResolvedValueOnce({ kind: "xong", output: draft("Giao trong 2 giờ nội thành.") } as never)
      .mockResolvedValueOnce(critic as never)
      .mockResolvedValueOnce({ kind: "xong", output: draft("Giao trong 2 giờ nội thành.") } as never)
    const pkg = await executeGenerateLandingContent(input, ctx)
    expect(vi.mocked(callCapability)).toHaveBeenCalledTimes(3)
    expect(pkg.faq.some((f) => /2 giờ/.test(f.answer))).toBe(false)
  })

  it("tiệm đã khai cam kết thì giữ, không viết lại", async () => {
    vi.mocked(callCapability)
      .mockResolvedValueOnce({ kind: "xong", output: draft("Giao trong 2 giờ nội thành.") } as never)
      .mockResolvedValueOnce(critic as never)
    const pkg = await executeGenerateLandingContent({ ...input, guarantees: ["Giao trong 2 giờ nội thành"] }, ctx)
    expect(vi.mocked(callCapability)).toHaveBeenCalledTimes(2)
    expect(pkg.faq[0]?.answer).toContain("2 giờ")
  })

  it("cụm sáo rỗng → viết lại, dùng bản mới", async () => {
    vi.mocked(callCapability)
      .mockResolvedValueOnce({ kind: "xong", output: draft("Nhắn tiệm để được báo.", "Tuyệt tác thay ngàn lời yêu") } as never)
      .mockResolvedValueOnce(critic as never)
      .mockResolvedValueOnce({ kind: "xong", output: draft("Nhắn tiệm để được báo.") } as never)
    const pkg = await executeGenerateLandingContent(input, ctx)
    expect(pkg.hero.headline).toBe("Hồng đỏ cho ngày 20/10 của mẹ")
  })

  it("ghi nhật ký phiên bản prompt và nguồn nội dung", async () => {
    logInfo.mockReset()
    vi.mocked(callCapability)
      .mockResolvedValueOnce({ kind: "xong", output: draft("Nhắn tiệm để được báo.") } as never)
      .mockResolvedValueOnce(critic as never)
    await executeGenerateLandingContent(input, ctx)
    expect(logInfo).toHaveBeenCalledWith("landing_content.generated", expect.objectContaining({ promptVersion: "v2", source: "ai" }))

    logInfo.mockReset()
    vi.mocked(callCapability).mockResolvedValueOnce({ kind: "khong_chay_duoc" } as never)
    await executeGenerateLandingContent(input, ctx)
    expect(logInfo).toHaveBeenCalledWith("landing_content.generated", expect.objectContaining({ source: "template", reason: "ai_unavailable" }))
  })
})
