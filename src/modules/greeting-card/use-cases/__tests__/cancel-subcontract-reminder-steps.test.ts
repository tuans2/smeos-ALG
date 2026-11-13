import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  cancelSubcontractReminderSteps,
  getMilestoneSteps,
} from "../cancel-subcontract-reminder-steps"

// Bản trong bộ nhớ của kho metadata: `mutateMetadata` chạy hàm sửa trên bản hiện tại, ghi nếu có `next`
let stored: Record<string, unknown> | null = null
const written: Array<Record<string, unknown>> = []
vi.mock("@/modules/greeting-card/infra/subcontract-step-store", () => ({
  SubcontractStepStore: function () {
    return {
      mutateMetadata: async (_org: string, _order: string, change: (m: Record<string, unknown>) => { next: Record<string, unknown> | null; result: unknown }) => {
        const { next, result } = change(stored ?? {})
        if (next && stored) {
          stored = next
          written.push(next)
        }
        return stored ? result : false
      },
    }
  },
}))

vi.mock("@/core/observability/log", () => ({
  log: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

describe("cancelSubcontractReminderSteps (First-Wins Mutex)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stored = null
    written.length = 0
  })

  it("getMilestoneSteps trả về đúng mảng các steps cho M2, M3, M4", () => {
    expect(getMilestoneSteps("M2")).toEqual(["M2_QC", "M2_QC_RETRY", "M2_QC_ESCALATED"])
    expect(getMilestoneSteps("M3")).toEqual([
      "M3_SHIPPER",
      "M3_SHIPPER_RETRY",
      "M3_SHIPPER_ESCALATED",
      "M3_DISPATCH",
    ])
    expect(getMilestoneSteps("M4")).toEqual([
      "M4_DELIVERY",
      "M4_DELIVERY_RETRY",
      "M4_DELIVERY_ESCALATION",
      "M4_OVERDUE",
    ])
  })

  it("trả về mảng rỗng nếu không tìm thấy order_coordinations", async () => {

    const result = await cancelSubcontractReminderSteps({
      organizationId: "org-1",
      orderId: "order-1",
      steps: ["M2_QC", "M2_QC_RETRY"],
      reason: "coordinator_action",
      actorId: "coord-1",
    })

    expect(result.cancelledSteps).toHaveLength(0)
    expect(result.alreadyDoneSteps).toHaveLength(0)
    expect(written).toHaveLength(0)
  })

  it("đánh dấu CANCELLED_BY_COORDINATOR_ACTION cho các step chưa gửi", async () => {
    stored = { subcontract_dispatch: { remindersSent: {} }, qc_photos: ["org/o/qc.jpg"] }

    const result = await cancelSubcontractReminderSteps({
      organizationId: "org-1",
      orderId: "order-1",
      steps: ["M2_QC", "M2_QC_RETRY", "M2_QC_ESCALATED"],
      reason: "coordinator_action",
      actorId: "user-123",
    })

    expect(result.cancelledSteps).toEqual(["M2_QC", "M2_QC_RETRY", "M2_QC_ESCALATED"])
    expect(result.alreadyDoneSteps).toHaveLength(0)
    expect(written).toEqual([
      {
        qc_photos: ["org/o/qc.jpg"], // khoá khác của phiên giữ nguyên
        subcontract_dispatch: {
          remindersSent: expect.objectContaining({
            M2_QC: expect.stringMatching(/^CANCELLED_BY_COORDINATOR_ACTION:/),
            M2_QC_RETRY: expect.stringMatching(/^CANCELLED_BY_COORDINATOR_ACTION:/),
            M2_QC_ESCALATED: expect.stringMatching(/^CANCELLED_BY_COORDINATOR_ACTION:/),
          }),
        },
      },
    ])
  })

  it("không ghi đè các step ĐÃ GỬI THẬT (ISO timestamp) và đưa vào alreadyDoneSteps", async () => {
    const sentRealIso = "2026-10-19T08:00:00.000Z"
    stored = { subcontract_dispatch: { remindersSent: { M2_QC: sentRealIso } } }

    const result = await cancelSubcontractReminderSteps({
      organizationId: "org-1",
      orderId: "order-1",
      steps: ["M2_QC", "M2_QC_RETRY", "M2_QC_ESCALATED"],
      reason: "store_action_via_link",
      actorId: "store-branch-1",
    })

    // M2_QC đã gửi thật -> alreadyDone, không bị đè bởi CANCELLED
    expect(result.alreadyDoneSteps).toEqual(["M2_QC"])
    expect(result.cancelledSteps).toEqual(["M2_QC_RETRY", "M2_QC_ESCALATED"])

    expect(written[0]).toEqual({
      subcontract_dispatch: {
        remindersSent: expect.objectContaining({
          M2_QC: sentRealIso, // Giữ nguyên
          M2_QC_RETRY: expect.stringMatching(/^CANCELLED_BY_STORE_ACTION_VIA_LINK:/),
          M2_QC_ESCALATED: expect.stringMatching(/^CANCELLED_BY_STORE_ACTION_VIA_LINK:/),
        }),
      },
    })
  })
})
