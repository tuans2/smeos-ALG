import { z } from "zod"

import { data, timestamp } from "./responses-orders"
import { customerRef, orderColumns, orderItemRow, orderProduct, ROLE, STEP_ID, trackingItem, trackingItemBase } from "./responses-greeting-shared"

/**
 * Phản hồi Thẻ chào — bảng Điều phối, việc của Điều phối, pipeline và các góc nhìn theo dõi (OpenAPI nội bộ,
 * PO 07/11/2026). Kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-greeting-ops.test.ts`.
 */
const DECISION = z.enum(["APPROVED", "PENDING", "REJECTED"])
export const coordinatorBoardResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      ...orderColumns,
      photo_approval: z.strictObject({
        status: z.enum(["APPROVED", "PENDING", "NONE", "BYPASSED", "AUTO_APPROVED"]),
        uploadedAt: z.string().nullable(),
        countdownMinutes: z.number(),
        approvedAt: z.string().nullable(),
        remainingMs: z.number(),
      }),
      gate2: z
        .strictObject({
          claimedBranchId: z.string().nullable().optional(),
          hasQcPhoto: z.boolean().optional(),
          hasShipperInfo: z.boolean().optional(),
          hasDeliveryProof: z.boolean().optional(),
          shipperInfo: z.strictObject({ shipperName: z.string(), shipperPhone: z.string(), submittedAt: z.string() }).nullable().optional(),
          bypassRequests: z
            .record(
              z.string(),
              z.strictObject({
                requestedAt: z.string().optional(),
                requestedByBranchId: z.string().optional(),
                requestedByBranchName: z.string().optional(),
                reason: z.string().optional(),
                status: DECISION.optional(),
                decisionAt: z.string().optional(),
                decidedBy: z.string().optional(),
                reviewNote: z.string().optional(),
              })
            )
            .nullable()
            .optional(),
        })
        .nullable(),
      payment_proof_url: z.string().nullable(),
      payment_proof_balance_url: z.string().nullable(),
      saleId: z.string().nullable(),
      saleName: z.string(),
      coordinatorId: z.string().nullable(),
      coordinatorName: z.string(),
      items: z.array(orderItemRow),
      greeting_sessions: z.array(
        z.strictObject({
          id: z.string(),
          status: z.string(),
          catalog: z.strictObject({ filters: z.unknown() }),
          send_code: z.string(),
          sale_id: z.string(),
          selected_product_id: z.string().nullable(),
          product_snapshot: z.unknown(),
          payment_proof_asset_id: z.string().nullable(),
          payment_proof_balance_asset_id: z.string().nullable(),
        })
      ),
      customer: customerRef.nullable(),
      assignments: z.array(z.strictObject({ assignee_id: z.string(), assigned_by: z.string() })),
      events: z.array(z.strictObject({ created_at: timestamp, axis: z.string(), actor_id: z.string().nullable(), reason: z.string().nullable() })),
      coordination: z.strictObject({ coordinator_id: z.string().nullable(), metadata: z.unknown() }).nullable(),
      qc_records: z.array(z.strictObject({ created_at: timestamp, notes: z.string().nullable(), inspector_id: z.string().nullable() })),
      product: orderProduct,
    })
  ),
  /** Bảng giới hạn số đơn trả về — `true` khi còn đơn chưa hiện. */
  truncated: z.boolean(),
})
export const coordinatorWorkResponse = data(z.array(trackingItem))
export const trackingPipelineResponse = data(z.array(trackingItemBase))

/** `view=list` / `view=queue`: một trang mục theo dõi. */
export const trackingPageResponse = z.strictObject({
  view: z.enum(["list", "queue"]),
  data: z.array(trackingItem),
  next_cursor: z.string().nullable(),
  total: z.number(),
})
const kanban = z.strictObject({
  view: z.literal("kanban"),
  columns: z.array(
    z.strictObject({
      stepId: STEP_ID,
      title: z.string(),
      count: z.number(),
      overdue: z.number(),
      dueSoon: z.number(),
      avgAgeMinutes: z.number(),
      maxAgeMinutes: z.number(),
      totalVnd: z.number(),
      tierOverdue: z.number(),
      tierUrgent: z.number(),
      items: z.array(trackingItem),
      hasMore: z.boolean(),
    })
  ),
  total: z.number(),
})
const calendar = z.strictObject({
  view: z.literal("calendar"),
  from: z.string(),
  to: z.string(),
  days: z.array(
    z.strictObject({
      date: z.string(),
      count: z.number(),
      slots: z.array(z.strictObject({ slot: z.string(), items: z.array(trackingItem) })),
    })
  ),
})
const dashboard = z.strictObject({
  view: z.literal("dashboard"),
  total: z.number(),
  orders: z.number(),
  links: z.number(),
  overdue: z.number(),
  dueSoon: z.number(),
  completed: z.number(),
  outstandingVnd: z.number(),
  byStep: z.array(z.strictObject({ stepId: STEP_ID, title: z.string(), count: z.number(), overdue: z.number(), totalVnd: z.number() })),
  aging: z.array(z.strictObject({ id: z.string(), label: z.string(), count: z.number() })),
  byOwner: z.array(z.strictObject({ owner: ROLE, overdue: z.number(), dueSoon: z.number() })),
  progress: z.strictObject({ paidOrBeyondRate: z.number(), completedRate: z.number() }),
})
/** `view=kanban` / `calendar` / `dashboard`: góc nhìn gộp trong `data`. */
export const trackingViewResponse = data(z.discriminatedUnion("view", [kanban, calendar, dashboard]))
export const trackingResponse = z.union([trackingPageResponse, trackingViewResponse])
