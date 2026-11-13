import { describe, expect, it, vi } from "vitest"
import { AppError } from "@/core/http/errors"
import {
  handlePublicWidgetMessage,
  type PublicWidgetDeps,
} from "@/modules/chat-assistant/use-cases/handle-public-widget-message"

function makeDeps(overrides: Partial<PublicWidgetDeps> = {}): PublicWidgetDeps {
  return {
    findOrgBySlug: vi.fn(async () => ({ id: "org-1" })),
    getChannelConfig: vi.fn(async () => null),
    rateLimit: vi.fn(async () => {}),
    handleMessage: vi.fn(async (input) => ({
      replyText: "ok",
      suggestedProducts: [],
      conversationId: "c1",
      channel: input.channel,
    })),
    ...overrides,
  }
}

const input = { slug: "hoa-cuc", surface: "catalog" as const, visitorId: "v1", message: "chào" }

describe("handlePublicWidgetMessage", () => {
  it("tiệm không tồn tại → 404", async () => {
    const deps = makeDeps({ findOrgBySlug: vi.fn(async () => null) })
    await expect(handlePublicWidgetMessage(input, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(deps.handleMessage).not.toHaveBeenCalled()
  })

  it("trang bị tắt khung chat → 404, không gọi AI", async () => {
    const deps = makeDeps({ getChannelConfig: vi.fn(async () => ({ config: { publicSurfaces: ["landing_page"] } })) })
    await expect(handlePublicWidgetMessage(input, deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(deps.handleMessage).not.toHaveBeenCalled()
  })

  it("áp hạn mức theo IP và theo khách, tách theo tiệm", async () => {
    const deps = makeDeps()
    await handlePublicWidgetMessage(input, deps)
    expect(deps.rateLimit).toHaveBeenCalledWith({ scope: "public-chat-ip:org-1", limit: 60, windowMs: 600_000 })
    expect(deps.rateLimit).toHaveBeenCalledWith({
      scope: "public-chat-visitor:org-1",
      limit: 20,
      windowMs: 600_000,
      subject: "v1",
    })
  })

  it("vượt hạn mức → không gọi AI, không trừ credit", async () => {
    const deps = makeDeps({
      rateLimit: vi.fn(async () => {
        throw new AppError("RATE_LIMITED", "quá nhanh")
      }),
    })
    await expect(handlePublicWidgetMessage(input, deps)).rejects.toMatchObject({ code: "RATE_LIMITED" })
    expect(deps.handleMessage).not.toHaveBeenCalled()
  })

  it("landing page đi kênh LANDING_PAGE", async () => {
    const deps = makeDeps()
    const result = await handlePublicWidgetMessage({ ...input, surface: "landing_page" }, deps)
    expect(deps.getChannelConfig).toHaveBeenCalledWith("org-1", "LANDING_PAGE")
    expect(result.channel).toBe("LANDING_PAGE")
  })
})
