import { beforeEach, describe, expect, it, vi } from "vitest"

const callCapability = vi.fn()
vi.mock("@/core/ai/gateway", () => ({ callCapability: (...args: unknown[]) => callCapability(...args) }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: () => ({}) }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: () => ({}) }))

import { verifyPodPhotoWithAi } from "./verify-pod-photo-ai"

const input = {
  organizationId: "org-1",
  orderId: "order-1",
  productName: "Lẵng hoa khai trương",
  podPhotoBytes: new Uint8Array([1, 2, 3]),
  podPhotoMimeType: "image/jpeg",
}

describe("verifyPodPhotoWithAi (qua gateway)", () => {
  beforeEach(() => {
    callCapability.mockReset()
  })

  it("AI xác nhận MATCH: trả nguyên kết luận", async () => {
    callCapability.mockResolvedValue({ kind: "xong", output: { isMatch: true, confidenceScore: 90, verdict: "MATCH", reason: "Có người nhận cầm lẵng hoa." } })
    expect(await verifyPodPhotoWithAi(input)).toMatchObject({ isMatch: true, verdict: "MATCH" })
    expect(callCapability.mock.calls[0]![0]).toMatchObject({ entity: { type: "order_pod_photo", id: "order-1" } })
  })

  it("AI kết luận MISMATCH: không cho qua", async () => {
    callCapability.mockResolvedValue({ kind: "xong", output: { isMatch: false, confidenceScore: 20, verdict: "MISMATCH", reason: "Ảnh sàn nhà trống." } })
    expect(await verifyPodPhotoWithAi(input)).toMatchObject({ isMatch: false, verdict: "MISMATCH" })
  })

  it("AI không chạy được hoặc lỗi: UNCERTAIN — trước đây trả MATCH (cổng tự mở)", async () => {
    callCapability.mockResolvedValue({ kind: "khong_chay_duoc", reason: "no_model", attempts: [] })
    expect(await verifyPodPhotoWithAi(input)).toMatchObject({ isMatch: false, verdict: "UNCERTAIN" })
    callCapability.mockImplementation(async () => { throw new Error("boom") })
    expect(await verifyPodPhotoWithAi(input)).toMatchObject({ isMatch: false, verdict: "UNCERTAIN" })
  })
})
