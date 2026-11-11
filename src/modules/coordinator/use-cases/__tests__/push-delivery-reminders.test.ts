import { describe, expect, it, vi } from "vitest"

import { pushDueDeliveryReminders, DELIVERY_REMINDER_EVENT, type PushDeliveryReminderDeps } from "../push-delivery-reminders"
import { DEFAULT_DISPATCH_REMINDER_POLICY } from "../../domain/dispatch-reminder-types"
import type { IDispatchReminderRepository } from "../../domain/dispatch-reminder-repository-port"

const now = new Date("2026-11-11T08:00:00.000Z")
// Giao sau 110 phút → M1 (mặc định 120 phút trước giờ giao) vừa tới 10 phút trước
const order = { orderId: "o1", orderCode: "DH-1", paidAt: now, deliveryTime: new Date(now.getTime() + 110 * 60_000) }

function deps(overrides: Partial<PushDeliveryReminderDeps> = {}) {
  const claimed = new Set<string>()
  const repository = {
    getActiveOrdersForReminders: vi.fn(async (organizationId: string) => (organizationId === "org-loi" ? Promise.reject(new Error("hỏng")) : [order])),
    getPolicyConfig: vi.fn(async () => DEFAULT_DISPATCH_REMINDER_POLICY),
  } as unknown as IDispatchReminderRepository
  return {
    listOrganizations: vi.fn(async () => ["org-a"]),
    repository,
    claim: vi.fn(async (org: string, scope: string, key: string) => !claimed.has(`${org}|${scope}|${key}`) && Boolean(claimed.add(`${org}|${scope}|${key}`))),
    notify: vi.fn(async () => 1),
    ...overrides,
  } satisfies PushDeliveryReminderDeps
}

describe("4.32 — đẩy tin nhắc giao", () => {
  it("gửi M1 vừa tới đúng một lần dù cron chạy lại", async () => {
    const d = deps()
    expect(await pushDueDeliveryReminders(now, d)).toEqual({ organizations: 1, pushed: 1, failedOrganizations: 0 })
    expect(d.notify).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-a", eventKey: DELIVERY_REMINDER_EVENT }))
    expect(await pushDueDeliveryReminders(new Date(now.getTime() + 5 * 60_000), d)).toMatchObject({ pushed: 0 })
    expect(d.notify).toHaveBeenCalledTimes(1)
  })

  it("một tổ chức lỗi không chặn tổ chức khác, không ném ra cron", async () => {
    const d = deps({ listOrganizations: vi.fn(async () => ["org-loi", "org-a"]) })
    expect(await pushDueDeliveryReminders(now, d)).toEqual({ organizations: 2, pushed: 1, failedOrganizations: 1 })
    const broken = deps({ listOrganizations: vi.fn(async () => Promise.reject(new Error("db"))) })
    expect(await pushDueDeliveryReminders(now, broken)).toEqual({ organizations: 0, pushed: 0, failedOrganizations: 0 })
  })
})
