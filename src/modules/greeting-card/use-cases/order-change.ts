import { conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { parseShippingConfig } from "../domain/brochure-pricing"
import { phoneLast4Matches } from "../domain/tracking-privacy"
import {
  buildOrderChange,
  cardMessageLocked,
  changeLockReason,
  changesForCustomer,
  holidaySurchargeDelta,
  quoteFactsOf,
  shippingFeeDelta,
  snapshotFromOrder,
  type ChangeItem,
  type ChangeStatus,
  type OrderChangeInput,
  type OrderChangePayload,
} from "../domain/order-change-request"
import type { InboxAction, PipelineLike } from "../domain/inbox"
import { OrderChangeRepository, getOrderChangeRepository } from "../infra/order-change-repository"
import { isBrochureOwner } from "./brochure-owner"
import { holidayOn, holidaySurcharge, parseHolidayPolicy } from "../domain/holiday-policy"
import { assertHolidayCapacity } from "./holiday-capacity"
import { assertSlotOpen } from "./slot-availability"
import { queueStaffNotification } from "./notify-staff"

/** Cách khách chứng minh là người đặt: mở từ chính link của đơn (cookie chủ phiên) hoặc 4 số cuối SĐT. */
export interface ChangeProof {
  sendCode?: string | null | undefined
  phoneLast4?: string | null | undefined
}

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})

/** Người xem là người đặt: chủ phiên của chính link đơn, hoặc đúng 4 số cuối SĐT người đặt. */
export function isVerifiedCustomer(
  request: Request,
  order: { greeting_sessions: Array<{ send_code: string }>; customer: { phone: string | null } | null },
  proof: ChangeProof,
): boolean {
  const link = proof.sendCode?.trim().toUpperCase()
  return (
    (!!link && order.greeting_sessions.some((s) => s.send_code === link) && isBrochureOwner(request, link)) ||
    (!!proof.phoneLast4 && phoneLast4Matches(order.customer?.phone, proof.phoneLast4.trim()))
  )
}

/**
 * Khách gửi yêu cầu đổi thông tin đơn từ trang theo dõi. Không chứng minh được là người đặt,
 * sai mã hay đơn không phải Thẻ chào → 404 (không lộ đơn tồn tại).
 */
export async function submitOrderChange(
  request: Request,
  orderCode: string,
  proof: ChangeProof,
  input: OrderChangeInput,
  repo = getOrderChangeRepository(),
  now: Date = new Date(),
) {
  const order = await repo.findPublicOrder(orderCode)
  if (!order) throw notFound()
  if (!isVerifiedCustomer(request, order, proof)) throw notFound()

  const lock = changeLockReason({ status: order.status, productionStatus: order.production_status, deliveryStatus: order.delivery_status })
  if (lock) throw conflict(lock)

  const shipping = parseShippingConfig(order.organization.settings)
  const before = snapshotFromOrder(order)
  const holidays = parseHolidayPolicy(order.organization.settings)
  const built = buildOrderChange(before, input, shipping, now, { cardLocked: cardMessageLocked({ productionStatus: order.production_status }), holidays })
  if (!built.ok) throw validationFailed(built.errors)
  const dateChanged = built.after.deliveryDate !== before.deliveryDate
  if (dateChanged) await assertHolidayCapacity(order.organization_id, built.after.deliveryDate, order.organization.settings, { excludeOrderId: order.id })
  // Dời sang khung giờ đã kín đơn (trần theo khung của tiệm) → không nhận
  if (dateChanged || built.after.deliveryTimeSlot !== before.deliveryTimeSlot) await assertSlotOpen(order.organization_id, built.after, order.organization.settings)

  const ref = obj(order.pricing_rule_ref)
  const zoneFee = built.after.shippingZoneId !== before.shippingZoneId
    ? shipping.zones.find((z) => z.id === built.after.shippingZoneId)?.feeVnd ?? null
    : null
  const surcharge = dateChanged && ref.awaitingQuote !== true
    ? holidaySurcharge(holidayOn(built.after.deliveryDate, holidays), order.greeting_sessions[0]?.catalog?.filters)
    : null
  const expectedFeeDeltaVnd = shippingFeeDelta(
    quoteFactsOf(ref),
    zoneFee,
    shipping,
  ) + (surcharge ? holidaySurchargeDelta(ref, surcharge.vnd) : 0)
  const payload: OrderChangePayload = {
    status: "PENDING", before, after: built.after, changes: built.changes, note: built.note,
    requestedAt: now.toISOString(), ...(expectedFeeDeltaVnd > 0 ? { expectedFeeDeltaVnd } : {}),
  }
  const body = `Khách xin đổi: ${built.changes.map((c) => c.label).join(", ")}${built.note ? ` — "${built.note}"` : ""}`
  const created = await repo.createFromCustomer(order, payload, body)

  queueStaffNotification(order.organization_id, "CHANGE_REQUESTED", {
    orderId: order.id,
    orderCode: order.code,
    customerName: before.recipientName || "Khách hàng",
    customerPhone: order.customer?.phone ?? null,
    amountVnd: Number(order.total_vnd),
    reason: body,
    assignedSaleId: order.greeting_sessions?.[0]?.sale_id ?? null,
  })

  return { id: created.id, status: "PENDING" as const, changes: changesForCustomer(built.changes), expectedFeeDeltaVnd }
}

export interface CustomerChangeView {
  id: string
  status: ChangeStatus
  createdAt: string
  decidedAt: string | null
  decisionNote: string | null
  changes: ChangeItem[]
  feeDeltaVnd: number
}

/** Phần "Thay đổi thông tin" trên trang theo dõi (chỉ khi người xem đã xác minh). */
export async function customerChangeSection(
  order: { id: string; organization_id: string; status: string; production_status: string; delivery_status: string },
  repo = getOrderChangeRepository(),
) {
  const rows = await repo.listForOrder(order.organization_id, order.id)
  const history: CustomerChangeView[] = rows.map((r) => ({
    id: r.id,
    status: r.payload.status,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.payload.decidedAt ?? null,
    decisionNote: r.payload.decisionNote ?? null,
    changes: Array.isArray(r.payload.changes) ? changesForCustomer(r.payload.changes) : [],
    feeDeltaVnd: r.payload.status === "APPROVED" ? r.payload.feeDeltaVnd ?? 0 : r.payload.expectedFeeDeltaVnd ?? 0,
  }))
  return {
    lockedReason: changeLockReason({ status: order.status, productionStatus: order.production_status, deliveryStatus: order.delivery_status }),
    cardLocked: cardMessageLocked({ productionStatus: order.production_status }),
    pending: history.find((h) => h.status === "PENDING") ?? null,
    history,
  }
}

/** Nhân viên (R3) duyệt hoặc từ chối; từ chối phải ghi lý do để khách biết. */
export async function decideOrderChange(
  ctx: TenantContext,
  input: { requestId: string; approve: boolean; note: string },
  repo = getOrderChangeRepository(),
) {
  const note = input.note.trim()
  if (!input.approve && note.length < 3) throw validationFailed({ note: "Ghi lý do không đổi để khách biết (ít nhất 3 ký tự)" })
  const settings = (await getCurrentOrganization(ctx))?.settings
  if (input.approve) {
    // Dời sang ngày lễ đã đủ đơn → không duyệt được (kiểm lại lúc duyệt, ngày có thể vừa đầy)
    const pending = (await repo.listPending(ctx)).find((r) => r.id === input.requestId)
    const p = pending?.payload as unknown as OrderChangePayload | undefined
    if (pending?.order_id && p && p.after.deliveryDate !== p.before.deliveryDate) {
      await assertHolidayCapacity(ctx.organizationId, p.after.deliveryDate, settings, { excludeOrderId: pending.order_id })
    }
    if (p && (p.after.deliveryDate !== p.before.deliveryDate || p.after.deliveryTimeSlot !== p.before.deliveryTimeSlot)) {
      await assertSlotOpen(ctx.organizationId, p.after, settings)
    }
  }
  return repo.decide(ctx, { requestId: input.requestId, approve: input.approve, note, shipping: parseShippingConfig(settings), holidays: parseHolidayPolicy(settings) })
}

/** Việc "Khách xin đổi thông tin" trong Hộp việc — cho người có quyền sửa đơn. */
export async function changeRequestActions(ctx: TenantContext, pipeline: PipelineLike[], repo = getOrderChangeRepository()): Promise<InboxAction[]> {
  const pending = await repo.listPending(ctx)
  return pending.flatMap((r) => {
    const p = r.payload as unknown as OrderChangePayload
    const item = pipeline.find((i) => i.orderId === r.order_id)
    if (!r.order_id || !Array.isArray(p?.changes)) return []
    return [{
      id: `change:${r.id}`, kind: "CHANGE_REQUEST" as const, title: "Khách xin đổi thông tin đơn",
      detail: `${item?.orderCode ? `Đơn ${item.orderCode}` : "Đơn"} · ${p.changes.map((c) => c.label).join(", ")}`,
      orderId: r.order_id, sessionId: item?.sessionId || null, customerName: item?.customerName ?? null,
      imageUrl: item?.productImageUrl ?? null, tab: "coordinator" as const, urgency: 1200,
      change: { requestId: r.id, changes: p.changes, note: p.note ?? null, expectedFeeDeltaVnd: p.expectedFeeDeltaVnd ?? 0, requestedAt: r.created_at.toISOString() },
    }]
  })
}
