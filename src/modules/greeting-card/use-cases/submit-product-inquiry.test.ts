import { describe, expect, it, vi } from "vitest"

vi.mock("../infra/greeting-card-repository", () => ({ GreetingCardRepository: class {} }))
vi.mock("../infra/brochure-checkout-repository", () => ({ BrochureCheckoutRepository: class {} }))
vi.mock("@/modules/crm/infra/product-inquiry-repository", () => ({ ProductInquiryRepository: class {} }))
vi.mock("@/modules/acquisition/infra/lead-repository", () => ({ LeadRepository: class {} }))

import { submitBrochureInquiry, submitProductInquiry, INQUIRY_PHONE_LIMIT } from "./submit-product-inquiry"

const catalog = { organization_id: "org-A", items: [{ product: { id: "p1", code: "B1", name: "Bó hồng" } }] }
const input = { productId: "p1", customerName: "Lan", customerPhone: "0912345678", message: "Hỏi giá" }

function deps(recent = 0) {
  const repo = {
    getPublicCatalogById: vi.fn(async (id: string) => (id === "cat" ? catalog : null)),
    getPublicSessionBySendCode: vi.fn(async (code: string) =>
      code === "AB-12345678" ? { organization_id: "org-B", catalog_id: "cat-b", send_code: code, catalog } : null
    ),
  }
  const checkout = { findOrCreateCustomer: vi.fn(async () => "cus-1") }
  const inquiries = { countRecentByPhone: vi.fn(async () => recent), create: vi.fn(async () => ({ conversationId: "conv-1" })) }
  const captureLead = vi.fn(async () => ({ leadId: "lead-1" }))
  return { repo, checkout, inquiries, captureLead }
}

const run = (d: ReturnType<typeof deps>, catalogId = "cat", body = input) =>
  submitProductInquiry(catalogId, body, d.repo as never, d.checkout as never, d.inquiries as never, d.captureLead)

describe("submitProductInquiry", () => {
  it("tạo khách + hội thoại trong đúng tổ chức của bộ sưu tập", async () => {
    const d = deps()
    expect(await run(d)).toEqual({ conversationId: "conv-1" })
    expect(d.checkout.findOrCreateCustomer).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-A", customerPhone: "0912345678" }))
    expect(d.inquiries.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-A", customerId: "cus-1" }))
  })

  it("bộ sưu tập không tồn tại hoặc mẫu không thuộc bộ sưu tập → 404, không ghi gì", async () => {
    const d = deps()
    await expect(run(d, "khac")).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(run(d, "cat", { ...input, productId: "p-tiem-khac" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(d.inquiries.create).not.toHaveBeenCalled()
  })

  it("chưa đồng ý được liên hệ → chỉ ghi hội thoại, không tạo lead", async () => {
    const d = deps()
    await run(d)
    await run(d, "cat", { ...input, consent: false } as typeof input)
    expect(d.captureLead).not.toHaveBeenCalled()
  })

  it("đồng ý được liên hệ → lead mang id bộ sưu tập làm nguồn", async () => {
    const d = deps()
    await run(d, "cat", { ...input, consent: true } as typeof input)
    expect(d.captureLead).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-A", sourceRef: "cat" }))
  })

  it("gửi dồn quá giới hạn mỗi SĐT → chặn", async () => {
    const d = deps(INQUIRY_PHONE_LIMIT)
    await expect(run(d)).rejects.toMatchObject({ code: "RATE_LIMITED" })
    expect(d.inquiries.create).not.toHaveBeenCalled()
  })

  it("dữ liệu sai → lỗi theo trường, không tra bộ sưu tập", async () => {
    const d = deps()
    await expect(run(d, "cat", { ...input, customerPhone: "12" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.repo.getPublicCatalogById).not.toHaveBeenCalled()
  })
})

describe("submitBrochureInquiry — link chào riêng", () => {
  it("tổ chức lấy từ phiên của mã link, ghi kèm mã link", async () => {
    const d = deps()
    await submitBrochureInquiry("AB-12345678", input, d.repo as never, d.checkout as never, d.inquiries as never)
    expect(d.inquiries.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-B", metadata: expect.objectContaining({ sendCode: "AB-12345678", catalogId: "cat-b" }) })
    )
  })

  it("khách đồng ý được liên hệ → ghi thêm lead đúng tổ chức, kèm mã link", async () => {
    const d = deps()
    await submitBrochureInquiry("AB-12345678", { ...input, consent: true }, d.repo as never, d.checkout as never, d.inquiries as never, d.captureLead)
    expect(d.inquiries.create).toHaveBeenCalled()
    expect(d.captureLead).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-B", customerId: "cus-1", phone: "0912345678", sourceRef: "AB-12345678" })
    )
  })

  it("mã link không tồn tại → 404", async () => {
    const d = deps()
    await expect(submitBrochureInquiry("XX-00000000", input, d.repo as never, d.checkout as never, d.inquiries as never)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

