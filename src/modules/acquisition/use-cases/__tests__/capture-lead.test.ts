import { describe, expect, it, vi } from "vitest"
import { AppError } from "@/core/http/errors"
import { LEAD_CONSENT_VERSION } from "../../domain/lead-rules"
import { captureCatalogLead, type CaptureLeadDeps } from "../capture-lead"

const NOW = new Date("2026-10-30T03:00:00Z")

function deps(over: Partial<CaptureLeadDeps> = {}) {
  const d = {
    catalogLinks: { findBySlug: vi.fn().mockResolvedValue({ organization_id: "org-a", is_revoked: false }) },
    shortLinks: { findPublicByCode: vi.fn().mockResolvedValue(null) },
    leads: {
      countRecentByPhone: vi.fn().mockResolvedValue(0),
      createPublic: vi.fn().mockResolvedValue({ id: "lead-1" }),
    },
    customers: { findOrCreateCustomer: vi.fn().mockResolvedValue("cus-1") },
    verifier: { name: "test", verify: vi.fn().mockResolvedValue(true) },
    now: () => NOW,
    ...over,
  }
  return d as unknown as CaptureLeadDeps & typeof d
}

const input = { name: " Lan ", phone: "0901 234 567", consent: true, message: "Tư vấn giúp mình" }

describe("captureCatalogLead", () => {
  it("ghi lead vào tổ chức của catalog (không từ client), kèm đồng ý + khách CRM", async () => {
    const d = deps()
    await expect(captureCatalogLead("hoa-20-10", input, "1.2.3.4", d)).resolves.toEqual({ leadId: "lead-1" })
    expect(d.customers.findOrCreateCustomer).toHaveBeenCalledWith({ organizationId: "org-a", customerPhone: "0901234567", customerName: "Lan", deliveryAddress: "" })
    expect(d.leads.createPublic).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-a",
      customerId: "cus-1",
      phone: "0901234567",
      source: "CATALOG_LINK",
      sourceRef: "hoa-20-10",
      shortLinkId: null,
      consentAt: NOW,
      consentVersion: LEAD_CONSENT_VERSION,
    }))
  })

  it("chưa đồng ý → 422, không ghi gì", async () => {
    const d = deps()
    await expect(captureCatalogLead("x", { ...input, consent: false }, undefined, d)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.leads.createPublic).not.toHaveBeenCalled()
  })

  it("xác minh người thật thất bại → từ chối", async () => {
    const d = deps({ verifier: { name: "t", verify: vi.fn().mockResolvedValue(false) } })
    await expect(captureCatalogLead("x", input, undefined, d)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.catalogLinks.findBySlug).not.toHaveBeenCalled()
  })

  it("catalog không có hoặc đã thu hồi → 404", async () => {
    await expect(captureCatalogLead("x", input, undefined, deps({ catalogLinks: { findBySlug: vi.fn().mockResolvedValue(null) } }))).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(captureCatalogLead("x", input, undefined, deps({ catalogLinks: { findBySlug: vi.fn().mockResolvedValue({ organization_id: "o", is_revoked: true }) } }))).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("gửi dồn cùng SĐT → 429", async () => {
    const d = deps({ leads: { countRecentByPhone: vi.fn().mockResolvedValue(3), createPublic: vi.fn() } })
    const err = await captureCatalogLead("x", input, undefined, d).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe("RATE_LIMITED")
  })

  it("ref là mã QR cùng tổ chức → ghi nguồn SHORT_LINK; mã của tổ chức khác → bỏ qua", async () => {
    const same = deps({ shortLinks: { findPublicByCode: vi.fn().mockResolvedValue({ id: "sl-1", code: "abc2345", organization_id: "org-a" }) } })
    await captureCatalogLead("x", { ...input, ref: "abc2345", utm: { campaign: "20-10" } }, undefined, same)
    expect(same.leads.createPublic).toHaveBeenCalledWith(expect.objectContaining({ source: "SHORT_LINK", sourceRef: "abc2345", shortLinkId: "sl-1", utm: { source: null, medium: null, campaign: "20-10" } }))

    const other = deps({ shortLinks: { findPublicByCode: vi.fn().mockResolvedValue({ id: "sl-9", code: "abc2345", organization_id: "org-b" }) } })
    await captureCatalogLead("x", { ...input, ref: "abc2345" }, undefined, other)
    expect(other.leads.createPublic).toHaveBeenCalledWith(expect.objectContaining({ source: "CATALOG_LINK", shortLinkId: null }))
  })
})
