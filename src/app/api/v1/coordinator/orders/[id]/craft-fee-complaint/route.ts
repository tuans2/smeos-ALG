/**
 * POST /api/v1/coordinator/orders/[id]/craft-fee-complaint
 *
 * Điều phối ghi nhận khiếu nại của khách về đơn gia công → trừ phí gia công của chi nhánh theo %
 * tiệm cài (mặc định 0% — chỉ ghi nhận, không trừ). Mọi khiếu nại đều được lưu; phí chỉ bị trừ một lần (PO 22/10/2026).
 */

import { handle, jsonResponse } from "@/core/http/response"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { requireCapability } from "@/core/rbac/capabilities"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { craftFeePayable } from "@/modules/greeting-card/domain/craft-fee-policy"
import type { SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { withCraftFeeDeduction } from "@/modules/greeting-card/use-cases/craft-fee-deductions"
import { craftFeePolicyOf } from "@/modules/greeting-card/use-cases/suggest-craft-fee"
import { craftFeeComplaintBody } from "@/app/api/v1/_contracts/requests-coordinator"

export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderUpdate)
  const { id: orderId } = await context.params

  const parsed = craftFeeComplaintBody.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const facts = await new CraftFeeFactsRepository().loadFacts(ctx.organizationId, orderId)
  if (!facts) throw notFound()
  const policy = craftFeePolicyOf(facts.settings)

  const result = await new SubcontractStepStore().mutateMetadata(ctx.organizationId, orderId, (current) => {
    const sub = current.subcontract_dispatch as SubcontractOrderState | undefined
    if (!sub?.claimedBranchId) throw conflict("Đơn chưa có chi nhánh nhận làm.")
    const complaints = Array.isArray(current.craft_fee_complaints) ? (current.craft_fee_complaints as unknown[]) : []
    const logged = {
      ...current,
      craft_fee_complaints: [...complaints, { reason: parsed.data.reason, at: new Date().toISOString(), by: ctx.userId }],
    }
    const { meta, applied } = withCraftFeeDeduction(logged, policy, "COMPLAINT", parsed.data.reason, new Date())
    const next = meta.subcontract_dispatch as SubcontractOrderState
    const feeVnd = next.craftFee?.finalVnd ?? next.subcontractPriceVnd ?? 0
    return { next: meta, result: { deducted: applied, payableVnd: craftFeePayable(feeVnd, next.craftFee?.deductions ?? []) } }
  })

  return jsonResponse({ data: result })
})

export const dynamic = "force-dynamic"
