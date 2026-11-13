/**
 * Domain Registry for Greeting Card Templates (Mẫu Thẻ Chào).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */

import type {
  GreetingTemplateId,
  GreetingCardTemplateDef,
  TemplateCategory,
} from "./greeting-template-types"
import { GREETING_TEMPLATES } from "./greeting-template-catalog"
import { enabledFieldsFor, readDisplaySettings, type OptionalDisplayField } from "./display-fields"

import { resolveAppliedPolicies, type PublicAppliedPolicies } from "./store-policy"
import { applyDiscountVisibility, readPriceVisibility } from "./price-visibility"
import type { PolicyGovernanceUpper } from "@/modules/organization/domain/governance-decisions"
import { parsePaymentPolicy, resolveRequirePaymentProof } from "./brochure-payment-policy"

export type { GreetingTemplateId, GreetingCardTemplateDef, TemplateCategory }
export { GREETING_TEMPLATES }
export {
  getIndustryGreetingTemplate,
  getIndustryGreetingTemplates,
  getIndustryGreetingTemplateList,
} from "./industry-greeting-templates"

export const GREETING_TEMPLATE_LIST: GreetingCardTemplateDef[] = Object.values(GREETING_TEMPLATES)

/** 12 phong cách vuốt thẻ cốt lõi theo SSOT */
export const SWIPE_12_STYLES: GreetingCardTemplateDef[] = GREETING_TEMPLATE_LIST.filter(
  (t) => t.styleNumber !== undefined
)

/**
 * Phân giải templateId hợp lệ, mặc định fallback về editorial-luxury.
 */
export function resolveGreetingTemplateId(candidate?: string | null): GreetingTemplateId {
  if (!candidate) return "editorial-luxury"
  if (candidate in GREETING_TEMPLATES) {
    return candidate as GreetingTemplateId
  }
  return "editorial-luxury"
}

/**
 * Phần cấu hình được phép gửi ra trang khách: mẫu đang dùng và các trường thông tin
 * cửa hàng bật cho mẫu đó, kèm theo các chính sách (ưu đãi, cam kết, thỏa thuận) áp dụng
 * và cơ chế bắt buộc tải ảnh chuyển khoản.
 */
export function toPublicCatalogFilters(
  raw: unknown,
  orgSettings?: unknown,
  industryKey?: string | null,
  governanceUpper?: PolicyGovernanceUpper,
): {
  templateId: string
  displayFields: OptionalDisplayField[]
  appliedPolicies?: PublicAppliedPolicies
  requirePaymentProof: boolean
} | null {
  const rawId = raw && typeof raw === "object" ? (raw as Record<string, unknown>).templateId : undefined
  const templateId = resolveGreetingTemplateId(typeof rawId === "string" ? rawId : null)
  const displayFields = enabledFieldsFor(readDisplaySettings(orgSettings), templateId)
  const settingsObj = orgSettings && typeof orgSettings === "object" ? (orgSettings as Record<string, unknown>) : {}
  const industry = industryKey || (typeof settingsObj.industry === "string" ? settingsObj.industry : null)
  const appliedPolicies = applyDiscountVisibility(resolveAppliedPolicies(raw, orgSettings, industry, governanceUpper), readPriceVisibility(orgSettings))
  const paymentPolicy = parsePaymentPolicy(orgSettings)
  const requirePaymentProof = resolveRequirePaymentProof(paymentPolicy, raw)
  if (typeof rawId !== "string" && orgSettings === undefined) return null
  return { templateId, displayFields, appliedPolicies, requirePaymentProof }
}

