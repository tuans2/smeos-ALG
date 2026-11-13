import { prisma } from "@/core/tenancy/infra/prisma"
import type { DbClient } from "./db-client"
import type { CreditEntryKind, CreditEntryMeta } from "../domain/repositories/organization-repository.interface"

export type { CreditEntryKind, CreditEntryMeta }

/**
 * Sổ cái credit (checklist ALG 10.6). Hàm ghi một dòng `credit_transactions` NGAY SAU khi số dư đổi, trên
 * cùng `db` (cùng giao dịch khi gọi trong transaction) — `balance_after` đọc lại số dư thật vừa ghi.
 * Mọi đường đổi `organizations.credit_balance` đều đi qua `OrganizationRepository`, và repository gọi hàm này.
 */

export async function appendCreditEntry(
  db: DbClient,
  organizationId: string,
  kind: CreditEntryKind,
  amount: number,
  meta: CreditEntryMeta = {},
): Promise<number> {
  const org = await db.organizations.findUnique({ where: { id: organizationId }, select: { credit_balance: true } })
  const balanceAfter = org?.credit_balance ?? 0
  await db.credit_transactions.create({
    data: {
      organization_id: organizationId,
      kind,
      amount,
      balance_after: balanceAfter,
      service: meta.service ?? null,
      reason: meta.reason?.slice(0, 300) ?? null,
      reference: meta.reference?.slice(0, 120) ?? null,
      actor_id: meta.actorId ?? null,
    },
  })
  return balanceAfter
}

export interface CreditEntryView {
  id: string
  kind: CreditEntryKind
  amount: number
  balanceAfter: number
  service: string | null
  reason: string | null
  reference: string | null
  createdAt: string
}

/** Các dòng gần nhất của sổ cái một tổ chức — Console đọc (tổ chức truyền vào từ đường dẫn đã kiểm quyền). */
export async function listCreditEntries(organizationId: string, limit = 50, db: DbClient = prisma): Promise<CreditEntryView[]> {
  const rows = await db.credit_transactions.findMany({
    where: { organization_id: organizationId },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: Math.min(Math.max(limit, 1), 200),
  })
  return rows.map((r) => ({
    id: r.id, kind: r.kind, amount: r.amount, balanceAfter: r.balance_after, service: r.service,
    reason: r.reason, reference: r.reference, createdAt: r.created_at.toISOString(),
  }))
}
