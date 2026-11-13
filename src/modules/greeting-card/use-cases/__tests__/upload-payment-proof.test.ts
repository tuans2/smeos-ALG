import { describe, it, expect, vi } from "vitest"
import { sniffImage, uploadPaymentProof } from "../upload-payment-proof"
import type { GreetingCardRepository } from "../../infra/greeting-card-repository"

vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({
  getStorageProvider: () => ({
    put: vi.fn().mockResolvedValue(undefined),
    signedUrl: vi.fn().mockResolvedValue("https://storage.example.com/payment-proof/test.jpg"),
  }),
}))

describe("sniffImage", () => {
  it("nhận diện đúng định dạng JPEG từ magic bytes", () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(sniffImage(jpegBytes)).toEqual({ ext: "jpg", mimeType: "image/jpeg" })
  })

  it("nhận diện đúng định dạng PNG từ magic bytes", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    expect(sniffImage(pngBytes)).toEqual({ ext: "png", mimeType: "image/png" })
  })

  it("nhận diện đúng định dạng WebP từ magic bytes", () => {
    const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    expect(sniffImage(webpBytes)).toEqual({ ext: "webp", mimeType: "image/webp" })
  })

  it("từ chối tệp không phải ảnh hoặc không đủ byte", () => {
    expect(sniffImage(new Uint8Array([1, 2, 3]))).toBeNull()
    expect(sniffImage(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull()
  })
})

describe("uploadPaymentProof", () => {
  const mockRepo = {
    getPublicSessionBySendCode: vi.fn().mockResolvedValue({
      id: "session-1",
      organization_id: "org-1",
      send_code: "T01-001",
      status: "ORDER_SUBMITTED",
      order_id: "order-1",
      catalog: { is_active: true },
    }),
    updateSession: vi.fn().mockResolvedValue({}),
    createPaymentProofAsset: vi.fn().mockResolvedValue({ id: "mock-asset-id" }),
  } as unknown as GreetingCardRepository

  it("từ chối khi tệp rỗng", async () => {
    const emptyFile = new Blob([], { type: "image/jpeg" })
    try {
      await uploadPaymentProof({ sendCode: "T01-001", file: emptyFile, purpose: "DEPOSIT" }, mockRepo)
      expect.fail("Should have thrown")
    } catch (err: unknown) {
      const e = err as { details?: { file?: string } }
      expect(e.details?.file).toMatch(/không được rỗng/i)
    }
  })

  it("từ chối khi tệp vượt quá 5MB", async () => {
    const largeBytes = new Uint8Array(6 * 1024 * 1024)
    largeBytes[0] = 0xff
    largeBytes[1] = 0xd8
    largeBytes[2] = 0xff
    const largeFile = new Blob([largeBytes], { type: "image/jpeg" })
    try {
      await uploadPaymentProof({ sendCode: "T01-001", file: largeFile, purpose: "DEPOSIT" }, mockRepo)
      expect.fail("Should have thrown")
    } catch (err: unknown) {
      const e = err as { details?: { file?: string } }
      expect(e.details?.file).toMatch(/tối đa 5MB/i)
    }
  })

  it("tải lên ảnh hợp lệ lần 1 (DEPOSIT) thành công và cập nhật session", async () => {
    const validBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
    const validFile = new Blob([validBytes], { type: "image/jpeg" })
    const res = await uploadPaymentProof(
      { sendCode: "T01-001", file: validFile, purpose: "DEPOSIT" },
      mockRepo
    )
    expect(res.assetId).toBeDefined()
    expect(res.url).toBe("https://storage.example.com/payment-proof/test.jpg")
    expect(mockRepo.updateSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ paymentProofAssetId: res.assetId })
    )
  })

  it("tải lên ảnh hợp lệ lần 2 (BALANCE) thành công và cập nhật paymentProofBalanceAssetId", async () => {
    const validBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const validFile = new Blob([validBytes], { type: "image/png" })
    const res = await uploadPaymentProof(
      { sendCode: "T01-001", file: validFile, purpose: "BALANCE" },
      mockRepo
    )
    expect(res.assetId).toBeDefined()
    expect(mockRepo.updateSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ paymentProofBalanceAssetId: res.assetId })
    )
  })

  function repoWithOrder(order: Record<string, unknown>) {
    return {
      getPublicSessionBySendCode: vi.fn().mockResolvedValue({
        id: "session-1",
        organization_id: "org-1",
        send_code: "T01-001",
        status: "PAYMENT_REPORTED",
        order_id: "order-1",
        order,
        catalog: { is_active: true },
      }),
      updateSession: vi.fn().mockResolvedValue({}),
      createPaymentProofAsset: vi.fn().mockResolvedValue({ id: "mock-asset-id" }),
    } as unknown as GreetingCardRepository
  }
  const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])], { type: "image/jpeg" })

  it("từ chối khi đơn đã huỷ hoặc đã thanh toán đủ", async () => {
    await expect(
      uploadPaymentProof({ sendCode: "T01-001", file: jpeg(), purpose: "DEPOSIT" }, repoWithOrder({ status: "CANCELLED", total_vnd: 1_000_000, paid_vnd: 0 }))
    ).rejects.toThrow(/đã huỷ/i)
    await expect(
      uploadPaymentProof({ sendCode: "T01-001", file: jpeg(), purpose: "BALANCE" }, repoWithOrder({ status: "CONFIRMED", total_vnd: 1_000_000, paid_vnd: 1_000_000 }))
    ).rejects.toThrow(/thanh toán đủ/i)
  })

  it("đã nhận cọc thì ảnh mới luôn là Lần 2 — không ghi đè chứng từ Lần 1", async () => {
    const repo = repoWithOrder({ status: "CONFIRMED", total_vnd: 1_000_000, paid_vnd: 500_000 })
    const res = await uploadPaymentProof({ sendCode: "T01-001", file: jpeg(), purpose: "DEPOSIT" }, repo)
    expect(repo.updateSession).toHaveBeenCalledWith("session-1", { paymentProofBalanceAssetId: res.assetId })
  })
})
