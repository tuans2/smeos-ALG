import { retotalWithVat, vatColumnsOf } from "../domain/order-vat"
import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { withOrganizationIndustry } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import type { ShippingConfig } from "../domain/brochure-pricing"
import { deliveryScheduleError } from "../domain/delivery-schedule"
import { holidayOn, holidaySurcharge, scheduleForDate, type HolidayDay } from "../domain/holiday-policy"
import {
  cardMessageLocked,
  changeLockReason,
  holidaySurchargeDelta,
  orderColumnsFromSnapshot,
  quoteFactsOf,
  shippingFeeDelta,
  type OrderChangePayload,
} from "../domain/order-change-request"
import { CUSTOMER_SENDER_ID } from "../domain/internal-message"
import { storedDeliveryAddress, upsertOrderRecipient } from "@/modules/orders/infra/order-recipient-repository"

export const CHANGE_REQUEST_KIND = "ORDER_CHANGE_REQUEST"
export const CHANGE_DECISION_KIND = "ORDER_CHANGE_DECISION"

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d)
const EDITABLE_PRODUCTION = ["WAITING", "ASSIGNED"] as const

const ORDER_SELECT = {
  id: true, organization_id: true, code: true, status: true, production_status: true, delivery_status: true,
  delivery_window: true, delivery_address: true, card_message: true, pricing_rule_ref: true, total_vnd: true, paid_vnd: true,
  vat_enabled: true, vat_rate: true, vat_amount_vnd: true,
} as const

/**
 * Yêu cầu đổi thông tin đơn = tin `ORDER_CHANGE_REQUEST` (người gửi là khách) gửi Điều phối;
 * quyết định = cập nhật đơn + tin `ORDER_CHANGE_DECISION` gửi sale phụ trách.
 */
export class OrderChangeRepository {
  constructor(private readonly db = prisma) {}

  /** Đơn Thẻ chào theo mã (trang công khai) — tổ chức lấy từ chính đơn, không từ client. */
  async findPublicOrder(orderCode: string) {
    const matches = await this.db.orders.findMany({
      where: { code: orderCode.trim().toUpperCase(), source: "BROCHURE" },
      select: {
        ...ORDER_SELECT,
        customer: { select: { phone: true } },
        greeting_sessions: { select: { send_code: true, sale_id: true, catalog: { select: { filters: true } } }, take: 5 },
        organization: { select: ORG_SETTINGS_SELECT }, // ngành theo cột (ADR-012 T-6c-1)
      },
      take: 2,
    })
    return matches.length === 1 ? withOrganizationIndustry(matches[0] ?? null) : null
  }

  /** Các yêu cầu của một đơn, mới nhất trước — cho trang theo dõi của khách. */
  async listForOrder(organizationId: string, orderId: string, take = 10) {
    const rows = await this.db.greeting_messages.findMany({
      where: { organization_id: organizationId, order_id: orderId, kind: CHANGE_REQUEST_KIND },
      select: { id: true, payload: true, created_at: true },
      orderBy: { created_at: "desc" },
      take,
    })
    return rows.map((r) => ({ id: r.id, createdAt: r.created_at, payload: r.payload as unknown as OrderChangePayload }))
  }

  /** Khách gửi yêu cầu. Khoá theo đơn để hai lần gửi cùng lúc không tạo hai yêu cầu chờ duyệt. */
  async createFromCustomer(order: { id: string; organization_id: string }, payload: OrderChangePayload, body: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order-change:${order.id}`}))`
      const pending = await tx.greeting_messages.count({
        where: { organization_id: order.organization_id, order_id: order.id, kind: CHANGE_REQUEST_KIND, payload: { path: ["status"], equals: "PENDING" } },
      })
      if (pending > 0) throw conflict("Đơn đang có một yêu cầu thay đổi chờ cửa hàng xử lý")
      return tx.greeting_messages.create({
        data: {
          id: randomUUID(), organization_id: order.organization_id, order_id: order.id, step_key: "GENERAL",
          sender_id: CUSTOMER_SENDER_ID, sender_role: "CUSTOMER", to_role: "COORDINATOR", kind: CHANGE_REQUEST_KIND,
          body, payload: payload as unknown as Prisma.InputJsonValue,
        },
        select: { id: true, created_at: true },
      })
    })
  }

  /** Yêu cầu đang chờ duyệt của tổ chức (Hộp việc). */
  async listPending(ctx: TenantContext) {
    return this.db.greeting_messages.findMany({
      where: scopedWhere(ctx, { kind: CHANGE_REQUEST_KIND, payload: { path: ["status"], equals: "PENDING" } }),
      select: { id: true, order_id: true, body: true, payload: true, created_at: true },
      orderBy: { created_at: "asc" },
      take: 100,
    })
  }

  /**
   * Duyệt/từ chối một lần, nguyên tử. Duyệt: đơn phải còn chưa cắm hoa, giờ giao mới còn kịp,
   * tổng đơn chưa đổi từ lúc đọc; phí giao tăng thì cộng phần chênh vào tổng (giảm thì giữ nguyên).
   */
  async decide(ctx: TenantContext, input: {
    requestId: string; approve: boolean; note: string; shipping: ShippingConfig; holidays: readonly HolidayDay[]; now?: Date | undefined
  }) {
    const now = input.now ?? new Date()
    return this.db.$transaction(async (tx) => {
      const req = await tx.greeting_messages.findFirst({
        where: scopedWhere(ctx, { id: input.requestId, kind: CHANGE_REQUEST_KIND }),
        select: { id: true, order_id: true, payload: true },
      })
      if (!req?.order_id) throw notFound()
      const payload = obj(req.payload) as unknown as OrderChangePayload
      if (payload.status !== "PENDING") throw conflict("Yêu cầu này đã được xử lý")
      const order = await tx.orders.findFirst({
        where: scopedWhere(ctx, { id: req.order_id, source: "BROCHURE" }),
        select: { ...ORDER_SELECT, greeting_sessions: { select: { sale_id: true, catalog: { select: { filters: true } } }, take: 1 } },
      })
      if (!order) throw notFound()

      let feeDeltaVnd = 0
      let newTotal = Number(order.total_vnd)
      let newVatVnd = Number(order.vat_amount_vnd)
      if (input.approve) {
        const lock = changeLockReason({ status: order.status, productionStatus: order.production_status, deliveryStatus: order.delivery_status })
        if (lock) throw conflict(lock)
        const { after, before } = payload
        if (after.cardMessage !== before.cardMessage && cardMessageLocked({ productionStatus: order.production_status })) {
          throw conflict("Thiệp đã in kèm hoa nên không đổi lời nhắn được nữa — vui lòng từ chối và báo khách")
        }
        const dateChanged = after.deliveryDate !== before.deliveryDate
        if (dateChanged || after.deliveryTimeSlot !== before.deliveryTimeSlot) {
          const holiday = holidayOn(after.deliveryDate, input.holidays)
          const err = deliveryScheduleError(after.deliveryDate, after.deliveryTimeSlot, scheduleForDate(input.shipping, holiday), now)
          if (err) throw conflict(`Giờ giao khách xin đổi không còn kịp: ${err}`)
        }
        const ref = obj(order.pricing_rule_ref)
        // Dời sang ngày lễ có phụ phí (bộ sưu tập bật áp dụng): cộng phần tăng; đơn chờ báo giá không tính
        const surcharge = dateChanged && ref.awaitingQuote !== true
          ? holidaySurcharge(holidayOn(after.deliveryDate, input.holidays), order.greeting_sessions[0]?.catalog?.filters)
          : null
        const holidayDeltaVnd = surcharge ? holidaySurchargeDelta(ref, surcharge.vnd) : 0
        const zoneChanged = (after.shippingZoneId ?? "") !== (before.shippingZoneId ?? "")
        const zoneFee = zoneChanged ? input.shipping.zones.find((z) => z.id === after.shippingZoneId)?.feeVnd ?? null : null
        if (zoneChanged && zoneFee === null) throw conflict("Khu vực giao khách chọn không còn trong bảng phí — vui lòng từ chối và liên hệ khách")
        const quote = quoteFactsOf(ref)
        const zoneDeltaVnd = zoneChanged ? shippingFeeDelta(quote, zoneFee, input.shipping) : 0
        feeDeltaVnd = zoneDeltaVnd + holidayDeltaVnd
        // Phụ phí cộng vào giá trước thuế; VAT (nếu có) tính lại
        const vat = vatColumnsOf(order)
        const retotal = retotalWithVat(vat.totalVnd - vat.vatAmountVnd + feeDeltaVnd, vat)
        newTotal = retotal.totalVnd
        newVatVnd = retotal.vatAmountVnd
        const manual = obj(ref.manualDiscount)
        const nextRef = {
          ...ref,
          ...(zoneChanged
            ? {
                shippingZone: { id: after.shippingZoneId, name: after.shippingZoneName },
                shippingFeeVnd: num(ref.shippingFeeVnd) + zoneDeltaVnd,
                shippingChange: { fromZone: before.shippingZoneName, toZone: after.shippingZoneName, newZoneFeeVnd: zoneFee, chargedDeltaVnd: zoneDeltaVnd, requestId: req.id },
              }
            : {}),
          ...(holidayDeltaVnd > 0 && surcharge ? { holidaySurchargeVnd: num(ref.holidaySurchargeVnd) + holidayDeltaVnd, holidayName: surcharge.name } : {}),
          ...(feeDeltaVnd > 0 && typeof ref.totalVnd === "number" ? { totalVnd: ref.totalVnd + feeDeltaVnd } : {}),
          ...(feeDeltaVnd > 0 && typeof manual.baseTotalVnd === "number" ? { manualDiscount: { ...manual, baseTotalVnd: manual.baseTotalVnd + feeDeltaVnd } } : {}),
        }
        const cols = orderColumnsFromSnapshot(order.delivery_address, after, order.delivery_window)
        const moved = await tx.orders.updateMany({
          where: {
            id: order.id, organization_id: ctx.organizationId, total_vnd: order.total_vnd,
            status: { not: "CANCELLED" },
            // Chưa cắm hoa, hoặc giao không thành công đang chờ hẹn lại
            OR: [{ production_status: { in: [...EDITABLE_PRODUCTION] } }, { delivery_status: "FAILED" }],
          },
          data: {
            delivery_window: cols.delivery_window as Prisma.InputJsonValue,
            delivery_address: storedDeliveryAddress(cols.delivery_address), // P-3c: người nhận chỉ ở order_recipients
            card_message: cols.card_message,
            ...(feeDeltaVnd > 0 ? { total_vnd: newTotal, balance_vnd: newTotal - Number(order.paid_vnd), vat_amount_vnd: newVatVnd } : {}),
            pricing_rule_ref: nextRef as Prisma.InputJsonValue,
          },
        })
        if (moved.count === 0) throw conflict("Đơn vừa thay đổi, vui lòng tải lại")
        await upsertOrderRecipient(tx, ctx.organizationId, order.id, { deliveryAddress: cols.delivery_address })
      }

      const decided: OrderChangePayload = {
        ...payload, status: input.approve ? "APPROVED" : "REJECTED", decidedBy: ctx.userId, decidedAt: now.toISOString(),
        ...(input.note ? { decisionNote: input.note } : {}), ...(input.approve ? { feeDeltaVnd } : {}),
      }
      const locked = await tx.greeting_messages.updateMany({
        where: { id: req.id, organization_id: ctx.organizationId, payload: { path: ["status"], equals: "PENDING" } },
        data: { payload: decided as unknown as Prisma.InputJsonValue },
      })
      if (locked.count === 0) throw conflict("Yêu cầu này đã được xử lý")

      const saleId = order.greeting_sessions[0]?.sale_id
      const labels = payload.changes.map((c) => c.label).join(", ")
      await tx.greeting_messages.create({
        data: scopedData(ctx, {
          id: randomUUID(), order_id: order.id, step_key: "GENERAL", sender_id: ctx.userId, sender_role: "COORDINATOR",
          ...(saleId && saleId !== "public" ? { to_user_id: saleId } : { to_role: "SALE" }),
          kind: CHANGE_DECISION_KIND, reply_to_id: req.id,
          body: `${input.approve ? "Đã cập nhật đơn theo yêu cầu của khách" : "Không đổi thông tin đơn theo yêu cầu của khách"}: ${labels}${input.note ? ` — ${input.note}` : ""}`,
          payload: decided as unknown as Prisma.InputJsonValue,
        }),
      })
      await recordAuditLog(ctx, {
        action: input.approve ? "greeting_card.order_change.approve" : "greeting_card.order_change.reject",
        entityType: "order", entityId: order.id,
        before: { info: payload.before, totalVnd: Number(order.total_vnd) },
        after: { info: input.approve ? payload.after : payload.before, totalVnd: newTotal, feeDeltaVnd, note: input.note || null },
      }, tx)
      return { orderId: order.id, orderCode: order.code, status: decided.status, totalVnd: newTotal, feeDeltaVnd }
    })
  }
}

let _orderChangeRepositorySingleton: OrderChangeRepository | null = null
export function getOrderChangeRepository(): OrderChangeRepository {
  if (!_orderChangeRepositorySingleton) _orderChangeRepositorySingleton = new OrderChangeRepository()
  return _orderChangeRepositorySingleton
}
