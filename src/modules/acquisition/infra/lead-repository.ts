import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import type { LeadSource, LeadStatus, Utm } from "../domain/lead-rules"
import { phoneEquals } from "@/core/security/pii-lookup"

export interface NewLeadRow {
  organizationId: string
  customerId: string
  name: string
  phone: string
  message: string | null
  source: LeadSource
  sourceRef: string | null
  shortLinkId: string | null
  utm: Utm
  consentAt: Date
  consentVersion: string
  /** Lý do vào (§3.1): CONTACT | QUOTE_REQUEST | ABANDONED | PAYMENT_TIMEOUT | WALK_IN | CHAT */
  reason?: string | null | undefined
}

const LIST_SELECT = {
  id: true, name: true, phone: true, message: true, source: true, source_ref: true,
  utm_source: true, utm_medium: true, utm_campaign: true, status: true,
  assignee_user_id: true, customer_id: true, consent_at: true, created_at: true, status_changed_at: true,
  short_link: { select: { name: true, placement_label: true } },
} as const

export class LeadRepository {
  /**
   * Ghi lead + ghi nhận khách đồng ý được gọi điện (customer_consents PHONE_CALL) trong một giao
   * dịch. Tổ chức đã được suy từ link công khai ở use-case — không đến từ client.
   */
  async createPublic(row: NewLeadRow): Promise<{ id: string }> {
    return prisma.$transaction(async (tx) => {
      const lead = await tx.leads.create({
        data: {
          organization_id: row.organizationId,
          customer_id: row.customerId,
          name: row.name,
          phone: row.phone,
          message: row.message,
          source: row.source,
          source_ref: row.sourceRef,
          short_link_id: row.shortLinkId,
          utm_source: row.utm.source,
          utm_medium: row.utm.medium,
          utm_campaign: row.utm.campaign,
          consent_at: row.consentAt,
          consent_version: row.consentVersion,
          reason: row.reason ?? null,
        },
        select: { id: true },
      })
      await tx.customer_consents.upsert({
        where: { customer_id_channel: { customer_id: row.customerId, channel: "PHONE_CALL" } },
        create: { organization_id: row.organizationId, customer_id: row.customerId, channel: "PHONE_CALL", granted: true, granted_at: row.consentAt },
        update: { granted: true, granted_at: row.consentAt, revoked_at: null },
      })
      return lead
    })
  }

  /** Lead do nhân viên nhập (gọi điện, đến quầy). Tổ chức chỉ từ `ctx`. */
  async createStaff(
    ctx: TenantContext,
    row: {
      customerId: string; name: string; phone: string; message: string | null; reason: string
      nextFollowUpAt: Date | null; assigneeUserId: string; consentAt: Date; consentVersion: string
    },
  ): Promise<{ id: string }> {
    return prisma.leads.create({
      data: {
        organization_id: ctx.organizationId,
        customer_id: row.customerId,
        name: row.name,
        phone: row.phone,
        message: row.message,
        source: "MANUAL",
        reason: row.reason,
        next_follow_up_at: row.nextFollowUpAt,
        assignee_user_id: row.assigneeUserId,
        consent_at: row.consentAt,
        consent_version: row.consentVersion,
      },
      select: { id: true },
    })
  }

  async countRecentByPhone(organizationId: string, phone: string, since: Date): Promise<number> {
    return prisma.leads.count({ where: { organization_id: organizationId, created_at: { gte: since }, AND: [phoneEquals(organizationId, phone)] } }) // P-5b
  }

  async list(ctx: TenantContext, opts: { status?: LeadStatus | readonly LeadStatus[] | undefined; limit: number; cursor?: string | undefined }) {
    const statusFilter = opts.status
      ? typeof opts.status === "string"
        ? opts.status
        : { in: [...opts.status] }
      : undefined
    const rows = await prisma.leads.findMany({
      where: scopedWhere(ctx, statusFilter ? { status: statusFilter } : {}),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: LIST_SELECT,
    })
    const hasMore = rows.length > opts.limit
    const items = hasMore ? rows.slice(0, opts.limit) : rows
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null }
  }

  async countByStatus(ctx: TenantContext): Promise<Record<string, number>> {
    const groups = await prisma.leads.groupBy({ by: ["status"], where: scopedWhere(ctx), _count: { _all: true } })
    return Object.fromEntries(groups.map((g) => [g.status, g._count._all]))
  }

  async findById(ctx: TenantContext, id: string) {
    return prisma.leads.findFirst({ where: scopedWhere(ctx, { id }), select: LIST_SELECT })
  }

  async update(ctx: TenantContext, id: string, data: { status?: LeadStatus; assigneeUserId?: string | null }) {
    const patch: Record<string, unknown> = {}
    if (data.status !== undefined) {
      patch.status = data.status
      patch.status_changed_at = new Date()
    }
    if (data.assigneeUserId !== undefined) patch.assignee_user_id = data.assigneeUserId
    const res = await prisma.leads.updateMany({ where: scopedWhere(ctx, { id }), data: patch })
    return res.count > 0
  }

  /** Người được giao phải là thành viên đang hoạt động của chính tổ chức. */
  async isActiveMember(ctx: TenantContext, userId: string): Promise<boolean> {
    const n = await prisma.memberships.count({ where: scopedWhere(ctx, { user_id: userId, status: "ACTIVE" as const }) })
    return n > 0
  }
}
