/**
 * `POST /api/v1/leads` — Sale tự thêm khách tiềm năng (gọi điện, đến quầy, cần báo giá chưa đặt)
 * (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.1 nhóm A). Tổ chức chỉ từ `ctx`;
 * người phụ trách mặc định là người nhập.
 */

import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { VN_PHONE, normalizeInquiryPhone } from "@/modules/crm/domain/product-inquiry"
import { BrochureCheckoutRepository } from "@/modules/greeting-card/infra/brochure-checkout-repository"
import { LEAD_MESSAGE_MAX, LEAD_NAME_MAX } from "../domain/lead-rules"
import { LeadRepository } from "../infra/lead-repository"

export const STAFF_LEAD_REASONS = ["WALK_IN", "QUOTE_REQUEST", "CONTACT"] as const
export type StaffLeadReason = (typeof STAFF_LEAD_REASONS)[number]
/** Khách cung cấp SĐT trực tiếp cho nhân viên để được liên hệ (khác form đồng ý trên trang công khai). */
export const STAFF_LEAD_CONSENT_VERSION = "STAFF_ENTERED"

export interface StaffLeadInput {
  name: string
  phone: string
  message?: string | undefined
  reason: string
  nextFollowUpAt?: string | undefined
}

export interface StaffLeadDeps {
  leads: Pick<LeadRepository, "createStaff">
  customers: Pick<BrochureCheckoutRepository, "findOrCreateCustomer">
  now: () => Date
}

const defaultDeps = (): StaffLeadDeps => ({ leads: new LeadRepository(), customers: new BrochureCheckoutRepository(), now: () => new Date() })

export async function createStaffLead(ctx: TenantContext, input: StaffLeadInput, deps: StaffLeadDeps = defaultDeps()) {
  const name = input.name?.trim() ?? ""
  const phone = normalizeInquiryPhone(input.phone ?? "")
  const errors: Record<string, string> = {}
  if (!name || name.length > LEAD_NAME_MAX) errors.name = `Tên từ 1 đến ${LEAD_NAME_MAX} ký tự`
  if (!VN_PHONE.test(phone)) errors.phone = "Số điện thoại chưa đúng"
  if (input.message && input.message.length > LEAD_MESSAGE_MAX) errors.message = `Ghi chú tối đa ${LEAD_MESSAGE_MAX} ký tự`
  if (!(STAFF_LEAD_REASONS as readonly string[]).includes(input.reason)) errors.reason = "Lý do chưa hợp lệ"
  const followUp = input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null
  if (followUp && Number.isNaN(followUp.getTime())) errors.nextFollowUpAt = "Thời điểm gọi lại chưa hợp lệ"
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  const now = deps.now()
  const customerId = await deps.customers.findOrCreateCustomer({ organizationId: ctx.organizationId, customerPhone: phone, customerName: name, deliveryAddress: "" })
  return deps.leads.createStaff(ctx, {
    customerId,
    name,
    phone,
    message: input.message?.trim() || null,
    reason: input.reason as StaffLeadReason,
    nextFollowUpAt: followUp,
    assigneeUserId: ctx.userId,
    consentAt: now,
    consentVersion: STAFF_LEAD_CONSENT_VERSION,
  })
}
