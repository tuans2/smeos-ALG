import { describe, expect, it, vi } from "vitest"

vi.mock("../../infra/lead-repository", () => ({ LeadRepository: class {} }))

import { captureInquiryLead } from "../capture-inquiry-lead"
import { LEAD_CONSENT_VERSION, LEAD_PHONE_LIMIT_PER_HOUR } from "../../domain/lead-rules"

const NOW = new Date("2026-11-09T03:00:00Z")
const input = { organizationId: "org-A", customerId: "cus-1", name: " Lan ", phone: "0912 345 678", message: "Hỏi giá", sourceRef: "AB-12345678" }

function deps(recent = 0) {
  return {
    leads: { countRecentByPhone: vi.fn(async () => recent), createPublic: vi.fn(async () => ({ id: "lead-1" })) },
    now: () => NOW,
  }
}

describe("captureInquiryLead — tin nhắn tư vấn từ Bộ sưu tập riêng", () => {
  it("ghi lead nguồn BROCHURE, lý do CONTACT, kèm lời đồng ý", async () => {
    const d = deps()
    expect(await captureInquiryLead(input, d)).toEqual({ leadId: "lead-1" })
    expect(d.leads.createPublic).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-A",
      customerId: "cus-1",
      name: "Lan",
      phone: "0912345678",
      source: "BROCHURE",
      sourceRef: "AB-12345678",
      reason: "CONTACT",
      consentAt: NOW,
      consentVersion: LEAD_CONSENT_VERSION,
    }))
  })

  it("cùng SĐT đã để lại đủ lead trong giờ qua → bỏ qua, không lỗi", async () => {
    const d = deps(LEAD_PHONE_LIMIT_PER_HOUR)
    expect(await captureInquiryLead(input, d)).toBeNull()
    expect(d.leads.createPublic).not.toHaveBeenCalled()
    expect(d.leads.countRecentByPhone).toHaveBeenCalledWith("org-A", "0912345678", new Date(NOW.getTime() - 60 * 60_000))
  })
})
