/**
 * `GET /api/v1/orders/lead-queue` — hàng đợi "Khách tiềm năng" của Sale (§3.4, §6).
 * Phạm vi xem: phiên Thẻ chào theo đúng quy tắc hiện hành của Thẻ chào (`resolveSaleScope`, chỉ gọi);
 * lead nguồn mới — sale chỉ thấy lead của mình + lead chưa ai nhận khi tiệm bật "chỉ khách của mình".
 */

import type { TenantContext } from "@/core/tenancy"
import { resolveSaleScope } from "@/modules/greeting-card/use-cases/order-scope"
import {
  leadHeat,
  leadReasonLabel,
  leadSourceLabel,
  sessionHeat,
  sessionReasonLabel,
  sortLeadQueue,
  type LeadQueueItem,
} from "../domain/lead-queue"
import { LeadQueueRepository } from "../infra/lead-queue-repository"

export interface LeadQueueDeps {
  repo: Pick<LeadQueueRepository, "openLeads" | "openBrochureSessions">
  saleScope: (ctx: TenantContext) => Promise<string | null>
}

const defaultDeps = (): LeadQueueDeps => ({ repo: new LeadQueueRepository(), saleScope: resolveSaleScope })

export async function listLeadQueue(ctx: TenantContext, deps: LeadQueueDeps = defaultDeps(), now = new Date()) {
  const scope = await deps.saleScope(ctx)
  const [leads, sessions] = await Promise.all([
    deps.repo.openLeads(ctx, scope),
    deps.repo.openBrochureSessions(ctx, scope, now),
  ])
  const items: LeadQueueItem[] = [
    ...leads.map((l): LeadQueueItem => ({
      key: `lead:${l.id}`,
      kind: "LEAD",
      id: l.id,
      name: l.name,
      phone: l.phone,
      sourceLabel: leadSourceLabel(l.source),
      reasonLabel: leadReasonLabel(l.reason),
      heat: leadHeat(l.reason),
      status: l.status,
      assigneeUserId: l.assignee_user_id,
      nextFollowUpAt: l.next_follow_up_at?.toISOString() ?? null,
      lastActivityAt: l.updated_at.toISOString(),
      href: "/thu-hut-khach",
    })),
    ...sessions.map((s): LeadQueueItem => ({
      key: `session:${s.id}`,
      kind: "BROCHURE_SESSION",
      id: s.id,
      name: s.customer_name,
      phone: s.customer_phone,
      sourceLabel: leadSourceLabel("BROCHURE"),
      reasonLabel: sessionReasonLabel(s.status),
      heat: sessionHeat(s.status),
      status: s.status,
      assigneeUserId: s.sale_id,
      nextFollowUpAt: null,
      lastActivityAt: s.last_active_at.toISOString(),
      href: "/the-chao?tab=sales",
    })),
  ]
  const sorted = sortLeadQueue(items, now)
  return {
    items: sorted,
    counts: {
      total: sorted.length,
      hot: sorted.filter((i) => i.heat === "HOT").length,
      dueFollowUp: sorted.filter((i) => i.nextFollowUpAt && new Date(i.nextFollowUpAt) <= now).length,
    },
  }
}
