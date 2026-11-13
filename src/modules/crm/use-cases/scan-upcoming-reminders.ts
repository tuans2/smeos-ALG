/**
 * Use-case: Scan Upcoming Reminders (Quét các dịp kỷ niệm sắp tới).
 * Trích xuất các lát cắt nhắc việc (Occasion Reminders) phục vụ chăm sóc khách hàng.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { calculateDaysUntilOccasion } from "../domain/crm-rules"
import { projectOccasionReminder } from "../domain/customer-master-index"
import type { ICustomerRepository } from "../domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "../infra/customer-repository"

export async function scanUpcomingReminders(
  ctx: TenantContext,
  daysAhead = 14,
  repo: ICustomerRepository = getCustomerRepository()
) {
  const { items } = await repo.list(ctx, {}, { limit: 200 })

  const reminders: ReturnType<typeof projectOccasionReminder>[] = []

  for (const customer of items) {
    for (const occasion of customer.occasions) {
      const daysLeft = calculateDaysUntilOccasion(occasion.date)
      if (daysLeft !== null && daysLeft >= 0 && daysLeft <= daysAhead) {
        reminders.push(projectOccasionReminder(customer, occasion, daysLeft))
      }
    }
  }

  // Sắp xếp theo số ngày gần nhất
  reminders.sort((a, b) => a.daysLeft - b.daysLeft)

  return {
    items: reminders,
    count: reminders.length,
    scannedAt: new Date().toISOString(),
  }
}
