import { describe, it, expect, vi } from "vitest"

const callCapability = vi.fn().mockResolvedValue({ kind: "loi" })
vi.mock("@/core/ai/gateway", () => ({ callCapability: (...args: unknown[]) => callCapability(...args) }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: () => ({}) }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: () => ({}) }))
vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({
  getStorageProvider: () => ({ get: vi.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff])) }),
}))

import { processPaymentProofVisionJob } from "../process-payment-proof-job"
import type { GreetingCardRepository } from "../../infra/greeting-card-repository"
import type { PaymentProofRepository } from "../../infra/payment-proof-repository"

const AI_ON = { brochure_policy: { ai_read_payment_proof: true } }

/**
 * PO 14/10/2026: AI đọc bill bằng GPT-4o là công tắc trong cài đặt, mặc định TẮT (không tốn token).
 * Tắt → không gọi AI, không đọc ảnh; bật → GPT-4o, chỉ đọc/ghi ảnh của đúng tiệm.
 */
describe("processPaymentProofVisionJob", () => {
  it("tiệm chưa bật AI đọc bill (mặc định) → không gọi AI, không tải ảnh", async () => {
    callCapability.mockClear()
    const repo = {
      findSessionForVerification: vi.fn().mockResolvedValue({
        sale_id: null,
        order: { total_vnd: 1_000_000, balance_vnd: 1_000_000, pricing_rule_ref: null },
        organization: { settings: {} },
      }),
      findAssetForVerification: vi.fn(),
      updateAssetMetadata: vi.fn(),
    } as unknown as GreetingCardRepository

    const res = await processPaymentProofVisionJob({ assetId: "a0", organizationId: "org-1", sendCode: "T01-001", purpose: "DEPOSIT" }, repo)

    expect(res).toBeNull()
    expect(callCapability).not.toHaveBeenCalled()
    expect(repo.findAssetForVerification).not.toHaveBeenCalled()
  })

  it("bật → gọi GPT-4o (ghim mô hình); AI không chạy được → UNREADABLE để Điều hành duyệt tay", async () => {
    const repo = {
      findSessionForVerification: vi.fn().mockResolvedValue({
        sale_id: null,
        order: { total_vnd: 1_000_000, balance_vnd: 1_000_000, pricing_rule_ref: null },
        organization: { settings: AI_ON },
      }),
      findAssetForVerification: vi.fn().mockResolvedValue({ storage_key: "k", mime_type: "image/jpeg", metadata: {} }),
      updateAssetMetadata: vi.fn().mockResolvedValue({ count: 1 }),
    } as unknown as GreetingCardRepository

    const res = await processPaymentProofVisionJob({ assetId: "a1", organizationId: "org-1", sendCode: "T01-001", purpose: "DEPOSIT" }, repo)

    expect(callCapability.mock.calls[0]?.[0]).toMatchObject({ privacy: "SHOP", pinnedModelKey: "openai_structured" })
    expect(repo.findAssetForVerification).toHaveBeenCalledWith("org-1", "a1")
    expect(repo.updateAssetMetadata).toHaveBeenCalledWith("org-1", "a1", expect.objectContaining({ ai_analysis: expect.objectContaining({ status: "UNREADABLE" }) }))
    expect(res?.status).toBe("UNREADABLE")
  })

  it("bill khớp nhưng mã giao dịch đã dùng cho ảnh khác → SUSPICIOUS (không tự duyệt)", async () => {
    callCapability.mockResolvedValueOnce({
      kind: "xong",
      output: { amountVnd: 1_000_000, isSuccessStatus: true, receiverAccountNumber: "0123456789", transactionCode: "FT999" },
    })
    const repo = {
      findSessionForVerification: vi.fn().mockResolvedValue({
        sale_id: null,
        order: { total_vnd: 1_000_000, balance_vnd: 1_000_000, pricing_rule_ref: null },
        organization: { settings: { ...AI_ON, brochure_payment: { bankId: "VCB", accountNo: "0123456789", accountName: "TIEM HOA" } } },
      }),
      findAssetForVerification: vi.fn().mockResolvedValue({ storage_key: "k", mime_type: "image/jpeg", metadata: {} }),
      updateAssetMetadata: vi.fn().mockResolvedValue({ count: 1 }),
    } as unknown as GreetingCardRepository
    const proofs = { transactionCodeUsedElsewhere: vi.fn().mockResolvedValue(true) } as unknown as PaymentProofRepository

    const res = await processPaymentProofVisionJob({ assetId: "a2", organizationId: "org-1", sendCode: "T01-001", purpose: "DEPOSIT" }, repo, proofs)

    expect(proofs.transactionCodeUsedElsewhere).toHaveBeenCalledWith("org-1", "FT999", "a2")
    expect(res?.status).toBe("SUSPICIOUS")
  })
})
