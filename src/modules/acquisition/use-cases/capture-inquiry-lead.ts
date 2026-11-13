import { normalizeInquiryPhone } from "@/modules/crm/domain/product-inquiry"
import { LEAD_CONSENT_VERSION, LEAD_PHONE_LIMIT_PER_HOUR } from "../domain/lead-rules"
import { normalizeUtm } from "../domain/short-link-rules"
import { LeadRepository } from "../infra/lead-repository"

const HOUR_MS = 60 * 60_000

export interface InquiryLeadInput {
  /** Suy từ link/bộ sưu tập ở use-case gọi — không bao giờ nhận từ client */
  organizationId: string
  customerId: string
  name: string
  phone: string
  message: string
  /** Mã link chào riêng hoặc id bộ sưu tập khách đang xem */
  sourceRef: string
}

export interface InquiryLeadDeps {
  leads: Pick<LeadRepository, "createPublic" | "countRecentByPhone">
  now: () => Date
}

/**
 * Khách nhắn tin tư vấn từ Bộ sưu tập riêng (`/b`, `/g`) và đồng ý được liên hệ → ghi thêm một lead
 * nguồn `BROCHURE`, lý do `CONTACT` (KIEN_TRUC_SSOT_DON_HANG_DA_NGUON §3.1 A1–A2). Cùng SĐT đã để lại
 * đủ lead trong giờ qua → bỏ qua (yêu cầu tư vấn vẫn được ghi ở hội thoại).
 */
export async function captureInquiryLead(
  input: InquiryLeadInput,
  deps: InquiryLeadDeps = { leads: new LeadRepository(), now: () => new Date() },
): Promise<{ leadId: string } | null> {
  const phone = normalizeInquiryPhone(input.phone)
  const now = deps.now()
  const recent = await deps.leads.countRecentByPhone(input.organizationId, phone, new Date(now.getTime() - HOUR_MS))
  if (recent >= LEAD_PHONE_LIMIT_PER_HOUR) return null
  const lead = await deps.leads.createPublic({
    organizationId: input.organizationId,
    customerId: input.customerId,
    name: input.name.trim(),
    phone,
    message: input.message.trim() || null,
    source: "BROCHURE",
    sourceRef: input.sourceRef,
    shortLinkId: null,
    utm: normalizeUtm({}),
    consentAt: now,
    consentVersion: LEAD_CONSENT_VERSION,
    reason: "CONTACT",
  })
  return { leadId: lead.id }
}
