import { describe, expect, it, vi } from "vitest"

/** Audit API §33: chữ banner đi qua cổng AI (`callCapability`, `content_generation`) với tổ chức thật của phiên. */
const callCapability = vi.fn()
vi.mock("@/core/ai/gateway", () => ({ callCapability: (...args: unknown[]) => callCapability(...args) }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: () => ({}) }))

import type { TenantContext } from "@/core/tenancy"
import type { LLMProvider } from "@/core/ports/llm-provider"
import { createBannerCopyAdapter } from "../adapters/banner-copy-ai-adapter"
import { generateBannerCopyUseCase } from "./generate-banner-copy.use-case"

const ctx = { organizationId: "org-tiem-thu", userId: "u-1", capabilities: new Set(["I1"]) } as unknown as TenantContext
const input = { industryKey: "FLORAL", occasionKey: "women_day", occasionLabel: "8/3", shopName: "Tiệm Hoa Thử", shopPromotions: ["Tặng thiệp"] }
const COPY = { headline: "Tôn vinh phái đẹp", subHeadline: "Quà tặng tinh tế ngày 8/3", promotionBadge: "Tặng thiệp", ctaText: "Đặt ngay" }
const llmReturning = (text: string) => ({ complete: vi.fn(async () => ({ text })) }) as unknown as LLMProvider & { complete: ReturnType<typeof vi.fn> }
const model = { key: "mo-hinh-thu" } as never

describe("chữ banner qua cổng AI", () => {
  it("gọi callCapability với content_generation, sàn SHOP; AI xong → AI_CONTENT_ENGINE", async () => {
    callCapability.mockResolvedValueOnce({ kind: "xong", output: { ...COPY, promotionBadge: "TẶNG THIỆP", validityText: "" }, model: { key: "m", provider: "p" }, attempts: [], evaluation: { needsReview: false } })
    const out = await generateBannerCopyUseCase(input, { ctx, llm: llmReturning("{}") })
    expect(out.source).toBe("AI_CONTENT_ENGINE")
    expect(callCapability).toHaveBeenCalledWith(expect.objectContaining({ capability: "content_generation", privacy: "SHOP" }), expect.any(Function), expect.anything())
  })

  it("cổng AI không chạy được hoặc lỗi → mẫu dựng sẵn, ưu đãi đúng của tiệm", async () => {
    callCapability.mockResolvedValueOnce({ kind: "khong_chay_duoc", reason: "HET_DUONG_DU_PHONG", attempts: [] })
    expect((await generateBannerCopyUseCase(input, { ctx })).source).toBe("INSTANT_TEMPLATE")
    callCapability.mockRejectedValueOnce(new Error("chưa cấu hình mô hình"))
    const out = await generateBannerCopyUseCase(input, { ctx })
    expect(out).toMatchObject({ source: "INSTANT_TEMPLATE", copy: { promotionBadge: "TẶNG THIỆP" } })
  })

  it("không có phiên tổ chức → không gọi AI", async () => {
    callCapability.mockClear()
    expect((await generateBannerCopyUseCase(input)).source).toBe("INSTANT_TEMPLATE")
    expect(callCapability).not.toHaveBeenCalled()
  })

  it("adapter: gửi đúng tổ chức và mô hình; JSON hỏng, thiếu trường, tự hứa ưu đãi → không đạt", async () => {
    const llm = llmReturning(`Đây là kết quả: ${JSON.stringify(COPY)}`)
    const ok = await createBannerCopyAdapter(llm, { prompt: "p", organizationId: "org-tiem-thu", shopPromotions: ["Tặng thiệp"] })(model)
    expect(ok).toMatchObject({ ok: true, output: { promotionBadge: "TẶNG THIỆP", validityText: "" } })
    expect(llm.complete).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-tiem-thu", model: "mo-hinh-thu" }))
    const run = (text: string, promos: string[] = []) => createBannerCopyAdapter(llmReturning(text), { prompt: "p", organizationId: "o", shopPromotions: promos })(model)
    expect((await run("không có json")).ok).toBe(false)
    expect((await run(JSON.stringify({ headline: "x" }))).ok).toBe(false)
    expect((await run(JSON.stringify({ ...COPY, headline: "Giảm 50% toàn bộ" }))).ok).toBe(false) // tiệm chưa khai ưu đãi
  })
})
