import { prisma } from "@/core/tenancy/infra/prisma"
import type { MarginInput } from "../domain/platform-margin"

/** Chi phí nhà cung cấp ngoài AI (checklist ALG 10.4). Tổ chức truyền vào là tổ chức sở hữu tin nhắn đã gửi. */
export async function recordProviderCost(
  organizationId: string,
  entry: { provider: "ESMS" | "ZALO_ZNS"; service: "SMS" | "ZNS"; costVnd: number; reference?: string | null },
): Promise<void> {
  if (entry.costVnd <= 0) return
  await prisma.provider_cost_entries.create({
    data: { organization_id: organizationId, provider: entry.provider, service: entry.service, cost_vnd: Math.round(entry.costVnd), reference: entry.reference ?? null },
  })
}

/**
 * Số liệu thô theo tổ chức trong một khoảng thời gian (Console, `N4`): credit đã dùng sau hoàn (sổ cái),
 * chi phí AI (`ai_requests.cost_usd`), chi phí tin nhắn (`provider_cost_entries`). Chỉ tổ chức có phát sinh.
 */
export async function marginInputs(from: Date, to: Date): Promise<MarginInput[]> {
  const range = { gte: from, lt: to }
  const [credit, ai, messages] = await Promise.all([
    prisma.credit_transactions.groupBy({
      by: ["organization_id"],
      where: { created_at: range, OR: [{ kind: "USAGE" }, { kind: "REFUND", service: { not: null } }] },
      _sum: { amount: true },
    }),
    prisma.ai_requests.groupBy({ by: ["organization_id"], where: { created_at: range }, _sum: { cost_usd: true } }),
    prisma.provider_cost_entries.groupBy({ by: ["organization_id"], where: { occurred_at: range }, _sum: { cost_vnd: true } }),
  ])
  const ids = [...new Set([...credit, ...ai, ...messages].map((r) => r.organization_id))]
  const orgs = await prisma.organizations.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  return ids.map((id) => ({
    organizationId: id,
    organizationName: orgs.find((o) => o.id === id)?.name ?? id,
    // USAGE âm, REFUND do dịch vụ dương → tổng âm là credit đã dùng
    creditUsed: -(credit.find((r) => r.organization_id === id)?._sum.amount ?? 0),
    aiCostUsd: ai.find((r) => r.organization_id === id)?._sum.cost_usd ?? 0,
    messageCostVnd: messages.find((r) => r.organization_id === id)?._sum.cost_vnd ?? 0,
  }))
}
