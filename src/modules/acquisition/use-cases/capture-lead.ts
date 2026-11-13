import type { HumanVerifier } from "@/core/ports/human-verification"
import { AppError, notFound, validationFailed } from "@/core/http/errors"
import { normalizeInquiryPhone } from "@/modules/crm/domain/product-inquiry"
import { CatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import { BrochureCheckoutRepository } from "@/modules/greeting-card/infra/brochure-checkout-repository"
import { getHumanVerifier } from "../adapters/human-verifier"
import {
  LEAD_CONSENT_VERSION,
  LEAD_PHONE_LIMIT_PER_HOUR,
  validateLeadInput,
  type LeadInput,
} from "../domain/lead-rules"
import { isShortLinkCode, normalizeUtm } from "../domain/short-link-rules"
import { LeadRepository } from "../infra/lead-repository"
import { ShortLinkRepository } from "../infra/short-link-repository"

const HOUR_MS = 60 * 60_000

export interface PublicLeadInput extends LeadInput {
  /** Mã link/QR động khách đã quét để tới trang (tham số `ref`). */
  ref?: string | undefined
  utm?: { source?: string | undefined; medium?: string | undefined; campaign?: string | undefined } | undefined
  verificationToken?: string | undefined
}

export interface CaptureLeadDeps {
  catalogLinks: Pick<CatalogLinkRepository, "findBySlug">
  shortLinks: Pick<ShortLinkRepository, "findPublicByCode">
  leads: Pick<LeadRepository, "createPublic" | "countRecentByPhone">
  customers: Pick<BrochureCheckoutRepository, "findOrCreateCustomer">
  verifier: HumanVerifier
  now: () => Date
}

function defaultDeps(): CaptureLeadDeps {
  return {
    catalogLinks: new CatalogLinkRepository(),
    shortLinks: new ShortLinkRepository(),
    leads: new LeadRepository(),
    customers: new BrochureCheckoutRepository(),
    verifier: getHumanVerifier(),
    now: () => new Date(),
  }
}

/**
 * Khách để lại thông tin trên trang catalog công khai `/c/<slug>` (công cụ 21).
 * Tổ chức suy từ catalog (không nhận từ client); catalog đã thu hồi → 404. Ghi khách vào
 * CRM (tìm hoặc tạo theo SĐT), lead kèm nguồn/UTM và lời đồng ý liên hệ.
 */
export async function captureCatalogLead(
  slug: string,
  input: PublicLeadInput,
  remoteIp: string | undefined,
  deps: CaptureLeadDeps = defaultDeps(),
): Promise<{ leadId: string }> {
  const errors = validateLeadInput(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  if (!(await deps.verifier.verify({ token: input.verificationToken, remoteIp }))) {
    throw validationFailed({ verification: "Chưa xác minh được bạn không phải máy, vui lòng thử lại" })
  }

  const catalog = await deps.catalogLinks.findBySlug(slug)
  if (!catalog || catalog.is_revoked) throw notFound()
  const organizationId = catalog.organization_id

  // Mã `ref` của tổ chức khác hoặc đã tắt → bỏ qua (không lỗi), chỉ không ghi nguồn.
  let shortLink: { id: string; code: string } | null = null
  if (input.ref && isShortLinkCode(input.ref)) {
    const found = await deps.shortLinks.findPublicByCode(input.ref)
    if (found && found.organization_id === organizationId) shortLink = { id: found.id, code: found.code }
  }

  const phone = normalizeInquiryPhone(input.phone)
  const now = deps.now()
  const recent = await deps.leads.countRecentByPhone(organizationId, phone, new Date(now.getTime() - HOUR_MS))
  if (recent >= LEAD_PHONE_LIMIT_PER_HOUR) {
    throw new AppError("RATE_LIMITED", "Cửa hàng đã nhận thông tin của bạn và sẽ liên hệ sớm.")
  }

  const name = input.name.trim()
  const customerId = await deps.customers.findOrCreateCustomer({ organizationId, customerPhone: phone, customerName: name, deliveryAddress: "" })
  const lead = await deps.leads.createPublic({
    organizationId,
    customerId,
    name,
    phone,
    message: input.message?.trim() || null,
    source: shortLink ? "SHORT_LINK" : "CATALOG_LINK",
    sourceRef: shortLink ? shortLink.code : slug,
    shortLinkId: shortLink?.id ?? null,
    utm: normalizeUtm(input.utm ?? {}),
    consentAt: now,
    consentVersion: LEAD_CONSENT_VERSION,
    reason: "CONTACT",
  })
  return { leadId: lead.id }
}
