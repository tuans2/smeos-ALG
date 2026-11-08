/**
 * Đọc đơn vừa bị tự huỷ vì quá hạn thanh toán và ghi lead cứu đơn (`domain/lead-recovery.ts`).
 * Chạy từ bộ quét nền (không có phiên người dùng): tổ chức lấy từ chính hàng đơn, mọi lệnh ghi lead
 * mang đúng `organization_id` của đơn đó.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import {
  OPEN_LEAD_STATUSES,
  PAYMENT_TIMEOUT_LEAD_REASON,
  type CancelledOrderCandidate,
  type RecoveryLeadRow,
} from "../domain/lead-recovery"
import { phoneIn } from "@/core/security/pii-lookup"
import { normalizePhoneForHash } from "@/core/security/pii-cipher"

export class LeadRecoveryRepository {
  /** Đơn có sự kiện huỷ (`order_events` trục order → CANCELLED) với một trong các lý do cho trước, từ `since`. */
  async listCandidates(since: Date, cancelReasons: readonly string[], take: number): Promise<CancelledOrderCandidate[]> {
    const events = await prisma.order_events.findMany({
      where: { axis: "order", to_value: "CANCELLED", reason: { in: [...cancelReasons] }, created_at: { gte: since } },
      orderBy: { created_at: "asc" },
      take,
      select: {
        order: {
          select: {
            id: true, code: true, organization_id: true, source: true, created_at: true, owner_sale_id: true, status: true,
            customer: { select: { id: true, name: true, phone: true } },
            greeting_sessions: { select: { sale_id: true }, take: 1 },
          },
        },
      },
    })
    const orders = events.map((e) => e.order).filter((o) => o.status === "CANCELLED")
    if (orders.length === 0) return []

    const recovered = await prisma.leads.findMany({
      where: { reason: PAYMENT_TIMEOUT_LEAD_REASON, source_ref: { in: orders.map((o) => o.id) } },
      select: { organization_id: true, source_ref: true },
    })
    const recoveredKeys = new Set(recovered.map((l) => `${l.organization_id}:${l.source_ref}`))

    // P-5b: SĐT tra theo `phone_hash` của từng tổ chức; so khớp theo số đã chuẩn hoá
    const phonesByOrg = new Map<string, string[]>()
    for (const o of orders) if (o.customer?.phone) phonesByOrg.set(o.organization_id, [...(phonesByOrg.get(o.organization_id) ?? []), o.customer.phone])
    const open = phonesByOrg.size
      ? await prisma.leads.findMany({
          where: { status: { in: [...OPEN_LEAD_STATUSES] }, OR: [...phonesByOrg].map(([org, phones]) => ({ organization_id: org, ...phoneIn(org, phones) })) },
          select: { organization_id: true, phone: true },
        })
      : []
    const openKeys = new Set(open.map((l) => `${l.organization_id}:${normalizePhoneForHash(l.phone)}`))

    return orders.map((o) => ({
      organizationId: o.organization_id,
      orderId: o.id,
      orderCode: o.code,
      source: o.source,
      customerId: o.customer?.id ?? null,
      customerName: o.customer?.name ?? null,
      customerPhone: o.customer?.phone ?? null,
      saleId: o.owner_sale_id ?? o.greeting_sessions[0]?.sale_id ?? null,
      orderCreatedAt: o.created_at,
      hasRecoveryLead: recoveredKeys.has(`${o.organization_id}:${o.id}`),
      hasOpenLeadForPhone: o.customer?.phone ? openKeys.has(`${o.organization_id}:${normalizePhoneForHash(o.customer.phone)}`) : false,
    }))
  }

  async createLead(row: RecoveryLeadRow): Promise<void> {
    await prisma.leads.create({
      data: {
        organization_id: row.organizationId,
        customer_id: row.customerId,
        name: row.name,
        phone: row.phone,
        message: row.message,
        source: row.source,
        source_ref: row.sourceRef,
        assignee_user_id: row.assigneeUserId,
        consent_at: row.consentAt,
        consent_version: row.consentVersion,
        reason: row.reason,
      },
    })
  }
}
