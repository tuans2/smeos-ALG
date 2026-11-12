import { prisma } from "@/core/tenancy/infra/prisma"

import type { OpenFinding, PaidMismatch, ReconciliationPlan } from "../domain/payment-reconciliation"

/**
 * Đọc/ghi đối soát số đã thu — chạy liên tenant như các bộ quét nền khác (không có `TenantContext`);
 * mỗi dòng ghi vẫn mang `organization_id` của đơn. Sau ADR-013 I-1 chạy bằng tài khoản `alg_system`.
 */
export class PaymentReconciliationRepository {
  /** Đơn có `paid_vnd` khác sổ thu, tối đa `limit` dòng mỗi lượt. */
  async findPaidMismatches(limit = 1000): Promise<PaidMismatch[]> {
    const rows = await prisma.$queryRaw<Array<{ organization_id: string; id: string; expected: string; actual: string }>>`
      SELECT o."organization_id", o."id",
             COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p."amount_vnd" ELSE p."amount_vnd" END)
                      FILTER (WHERE p."status" = 'CONFIRMED'), 0)::text AS expected,
             o."paid_vnd"::text AS actual
        FROM "orders" o
        LEFT JOIN "order_payments" p ON p."order_id" = o."id" AND p."organization_id" = o."organization_id"
       GROUP BY o."organization_id", o."id", o."paid_vnd"
      HAVING o."paid_vnd" <> COALESCE(SUM(CASE WHEN p."kind" = 'REFUND' THEN -p."amount_vnd" ELSE p."amount_vnd" END)
                                        FILTER (WHERE p."status" = 'CONFIRMED'), 0)
       ORDER BY o."id"
       LIMIT ${limit}`
    return rows.map((r) => ({ organizationId: r.organization_id, orderId: r.id, expectedVnd: Number(r.expected), actualVnd: Number(r.actual) }))
  }

  async listOpen(): Promise<OpenFinding[]> {
    const rows = await prisma.reconciliation_findings.findMany({
      where: { kind: "ORDER_PAID_MISMATCH", resolved_at: null },
      select: { id: true, entity_id: true },
    })
    return rows.map((r) => ({ id: r.id, entityId: r.entity_id }))
  }

  async apply(plan: ReconciliationPlan, now: Date): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const m of plan.upsert) {
        await tx.reconciliation_findings.upsert({
          where: { kind_entity_id: { kind: "ORDER_PAID_MISMATCH", entity_id: m.orderId } },
          create: {
            organization_id: m.organizationId, kind: "ORDER_PAID_MISMATCH", entity_id: m.orderId,
            expected_vnd: m.expectedVnd, actual_vnd: m.actualVnd, first_detected_at: now, last_detected_at: now,
          },
          update: { expected_vnd: m.expectedVnd, actual_vnd: m.actualVnd, last_detected_at: now, resolved_at: null },
        })
      }
      if (plan.resolveIds.length > 0) {
        await tx.reconciliation_findings.updateMany({ where: { id: { in: [...plan.resolveIds] } }, data: { resolved_at: now } })
      }
    })
  }
}
