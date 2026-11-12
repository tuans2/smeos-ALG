import { describe, expect, it, vi } from "vitest"

import type { AiModelCandidate } from "@/core/ai/domain/routing"
import { createProductVisionAdapter } from "@/modules/market-intelligence/adapters/product-vision-ai-adapter"

const model = { key: "claude_opus" } as AiModelCandidate
const image = { mimeType: "image/png", base64: "AAAA" }

describe("adapter Chặng 02 qua cổng AI (nợ #155)", () => {
  it("gửi ảnh + lời nhắc hệ thống cho đúng mô hình được giao, đọc JSON thành kiểu miền", async () => {
    const complete = vi.fn().mockResolvedValue({
      text: '```json\n{"product_name":"Bó hồng","flowers":[{"name":"Hồng đỏ","count":9,"role":"dominant"}]}\n```',
      model: "anthropic",
      modelVersion: "claude-opus-5",
      costUsd: 0.01,
    })
    const r = await createProductVisionAdapter({ name: "x", complete }, { image, productTitle: "Bó" }, "org")(model)
    expect(complete.mock.calls[0]![0]).toMatchObject({ model: "claude_opus", images: [image] })
    expect(complete.mock.calls[0]![0].system).toContain("ALG")
    expect(r.ok && r.output.components[0]).toMatchObject({ flowerType: "Hồng đỏ", quantityEstimate: 9 })
    expect(r.ok && r.costUsd).toBe(0.01)
  })

  it("không có thành phần hoa hoặc nhà cung cấp ném → ok:false để cổng AI sang bên kế tiếp", async () => {
    const rong = vi.fn().mockResolvedValue({ text: '{"flowers":[]}', model: "m", modelVersion: "m" })
    expect((await createProductVisionAdapter({ name: "x", complete: rong }, { image }, "org")(model)).ok).toBe(false)
    const nem = vi.fn().mockRejectedValue(new Error("429"))
    const r = await createProductVisionAdapter({ name: "x", complete: nem }, { image }, "org")(model)
    expect(r).toEqual({ ok: false, message: "429" })
  })
})
