import { describe, expect, it } from "vitest"

import { dueDeliveryReminderPushes } from "../delivery-reminder-push"
import type { ActiveReminderItem, CoordinatorMilestoneCode } from "../dispatch-reminder-types"

const now = new Date("2026-11-11T08:00:00.000Z")
const item = (milestone: CoordinatorMilestoneCode, minutesAgo: number): ActiveReminderItem => ({
  id: `o1_${milestone}`,
  orderId: "o1",
  orderCode: "DH-1",
  milestone,
  title: "Tiêu đề",
  description: "",
  scheduledAt: new Date(now.getTime() - minutesAgo * 60_000),
  isOverdue: minutesAgo > 0,
  overdueMinutes: minutesAgo,
  urgency: "NORMAL",
  suggestedAction: "",
  messageTemplate: "Nhắc đơn DH-1",
  recipientType: "WORKSHOP",
  status: "PENDING",
})

describe("4.32 — mốc nào được đẩy thành tin", () => {
  it("chỉ M1 và M2, mốc vừa tới trong 30 phút", () => {
    const pushes = dueDeliveryReminderPushes([item("M0", 1), item("M1", 0), item("M2", 29), item("M3", 1)], now)
    expect(pushes.map((p) => p.milestone)).toEqual(["M1", "M2"])
    expect(pushes[0]).toMatchObject({ dedupeKey: "o1:M1", title: "Tiêu đề — đơn #DH-1", message: "Nhắc đơn DH-1" })
  })

  it("mốc đã quá 30 phút (vd. lần đầu bật tính năng) không dội tin", () => {
    expect(dueDeliveryReminderPushes([item("M1", 31)], now)).toEqual([])
  })
})
