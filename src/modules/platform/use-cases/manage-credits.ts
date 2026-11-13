import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { notFound, validationFailed } from "@/core/http/errors"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { listCreditEntries, type CreditEntryView } from "@/modules/organization/infra/credit-ledger"
import { formatNumber } from "@/lib/i18n/formatters"
import { monthlySnapshot, setMonthlyLimit, type MonthlySnapshot } from "@/modules/usage/infra/usage-limit-repository"
import { parseMonthlyLimit } from "@/modules/usage/domain/monthly-limit"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"

/**
 * Console → tổ chức → Credit (checklist ALG 10.6). Nạp (TOPUP), tặng (GIFT), hoàn (REFUND) bắt buộc có lý do,
 * ghi sổ cái `credit_transactions` và nhật ký nền tảng. Đọc sổ: `N1`; ghi: `N3`.
 */

export const MAX_CREDIT_ADJUSTMENT = 1_000_000

export async function listOrganizationCredits(
  pctx: PlatformContext,
  organizationId: string,
): Promise<{ balance: number; entries: CreditEntryView[]; monthly: MonthlySnapshot }> {
  requirePlatformCapability(pctx, "N1")
  const org = await new OrganizationRepository().findById(organizationId)
  if (!org) throw notFound()
  const [entries, monthly] = await Promise.all([listCreditEntries(organizationId), monthlySnapshot(organizationId)])
  return { balance: org.credit_balance, entries, monthly }
}

/** Hạn mức credit tháng của một tổ chức (checklist ALG 10.3, `N3`); null = không giới hạn. */
export async function setOrganizationMonthlyLimit(pctx: PlatformContext, organizationId: string, raw: unknown): Promise<MonthlySnapshot> {
  requirePlatformCapability(pctx, "N3")
  const limit = parseMonthlyLimit(raw)
  if (limit === undefined) throw validationFailed({ monthlyLimit: "Hạn mức là số nguyên từ 0 hoặc bỏ trống để không giới hạn" })
  if (!(await new OrganizationRepository().findById(organizationId))) throw notFound()
  const before = await monthlySnapshot(organizationId)
  await setMonthlyLimit(organizationId, "CREDIT", limit)
  await recordPlatformAuditLog(pctx, {
    action: "platform.usage_limit.set", entityType: "usage_limits", entityId: `${organizationId}:CREDIT`,
    before: { limit: before.credit.limit }, after: { limit },
  })
  return monthlySnapshot(organizationId)
}

export interface AdjustCreditsInput {
  organizationId: string
  kind: "TOPUP" | "GIFT" | "REFUND"
  amount: number
  reason: string
}

export async function adjustOrganizationCredits(pctx: PlatformContext, input: AdjustCreditsInput): Promise<{ balance: number }> {
  requirePlatformCapability(pctx, "N3")
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > MAX_CREDIT_ADJUSTMENT) {
    throw validationFailed({ amount: `Số credit là số nguyên từ 1 đến ${formatNumber(MAX_CREDIT_ADJUSTMENT)}` })
  }
  const reason = input.reason.trim()
  if (reason.length < 3) throw validationFailed({ reason: "Cần ghi lý do" })

  const balance = await runInTransaction(async (tx) => {
    const repo = new OrganizationRepository(tx)
    const before = await repo.findById(input.organizationId)
    if (!before) throw notFound()
    const after = await repo.topUpCredit(input.organizationId, input.amount, input.kind, { reason, actorId: pctx.userId })
    return { before: before.credit_balance, after: after ?? before.credit_balance }
  })

  await recordPlatformAuditLog(pctx, {
    action: `platform.credit.${input.kind.toLowerCase()}`,
    entityType: "organizations",
    entityId: input.organizationId,
    before: { creditBalance: balance.before },
    after: { creditBalance: balance.after, amount: input.amount, reason },
  })
  return { balance: balance.after }
}
