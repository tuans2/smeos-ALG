import { planReconciliation } from "../domain/payment-reconciliation"
import { PaymentReconciliationRepository } from "../infra/payment-reconciliation-repository"

export interface ReconciliationResult {
  readonly mismatched: number
  readonly resolved: number
}

/** Một lượt đối soát `orders.paid_vnd` với `order_payments` (ADR-013 D-I6). */
export async function reconcileOrderPayments(
  repo: PaymentReconciliationRepository = new PaymentReconciliationRepository(),
  now: Date = new Date(),
): Promise<ReconciliationResult> {
  const [mismatches, open] = await Promise.all([repo.findPaidMismatches(), repo.listOpen()])
  const plan = planReconciliation(mismatches, open)
  await repo.apply(plan, now)
  return { mismatched: plan.upsert.length, resolved: plan.resolveIds.length }
}
