import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { validationFailed } from "@/core/http/errors"
import { readCreditPricing, writeCreditPricing } from "@/modules/usage/infra/credit-pricing-store"
import { creditPricingProblem, parseCreditPricing, type CreditPricing } from "@/modules/usage/domain/credit-pricing"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"

/** Console → Mức dùng → Quy đổi credit (PO Q10, checklist ALG 10.3, 10.4). Đọc `N4`, sửa `N3`. */

export async function getCreditPricing(pctx: PlatformContext): Promise<CreditPricing> {
  requirePlatformCapability(pctx, "N4")
  return readCreditPricing()
}

export async function updateCreditPricing(pctx: PlatformContext, input: Partial<CreditPricing>): Promise<CreditPricing> {
  requirePlatformCapability(pctx, "N3")
  const problem = creditPricingProblem(input as Record<string, unknown>)
  if (problem) throw validationFailed({ value: problem })
  const before = await readCreditPricing()
  const next = parseCreditPricing({ ...before, ...input })
  await writeCreditPricing(next, pctx.userId)
  await recordPlatformAuditLog(pctx, { action: "platform.credit_pricing.update", entityType: "platform_settings", entityId: "credit_pricing", before, after: next })
  return next
}
