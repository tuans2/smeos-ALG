import { retotalWithVat, vatColumnsOf } from "../domain/order-vat"
import type { Prisma } from "@/generated/prisma/client"
import { conflict } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { windowWithFailure, type DeliveryFailureRecord } from "../domain/delivery-failure"

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)

/** Ghi một lần giao không thành công: trạng thái giao, lịch sử, phí giao lại (nếu tính), sự kiện + audit. */
export class DeliveryFailureRepository {
  constructor(private readonly db = prisma) {}

  async recordFailure(
    ctx: TenantContext,
    order: {
      id: string; code: string; internal_note: string | null; delivery_status: string
      delivery_window: unknown; pricing_rule_ref: unknown; total_vnd: unknown; paid_vnd: unknown
      vat_enabled?: boolean | null; vat_rate?: number | null; vat_amount_vnd?: unknown
    },
    input: { failure: DeliveryFailureRecord; feeVnd: number },
  ) {
    return this.db.$transaction(async (tx) => {
      const total = Number(order.total_vnd)
      // Phí giao lại cộng vào giá trước thuế; VAT (nếu có) tính lại
      const vat = vatColumnsOf(order)
      const { totalVnd: newTotal, vatAmountVnd } = retotalWithVat(total - vat.vatAmountVnd + input.feeVnd, vat)
      const ref = obj(order.pricing_rule_ref)
      const manual = obj(ref.manualDiscount)
      const nextRef = input.feeVnd > 0
        ? {
            ...ref,
            redeliveryFeesVnd: num(ref.redeliveryFeesVnd) + input.feeVnd,
            ...(typeof ref.totalVnd === "number" ? { totalVnd: ref.totalVnd + input.feeVnd } : {}),
            // Giảm giá đã duyệt tính trên tổng gốc — cộng phí vào gốc để lần duyệt sau không làm mất phí
            ...(typeof manual.baseTotalVnd === "number" ? { manualDiscount: { ...manual, baseTotalVnd: manual.baseTotalVnd + input.feeVnd } } : {}),
          }
        : null
      const line = `[Giao không thành công] ${input.failure.reasonLabel}${input.failure.note ? ` — ${input.failure.note}` : ""}${input.feeVnd > 0 ? ` · phí giao lại ${input.feeVnd.toLocaleString("vi-VN")}đ` : ""}`

      const moved = await tx.orders.updateMany({
        where: {
          id: order.id, organization_id: ctx.organizationId, status: { not: "CANCELLED" },
          delivery_status: { in: ["DISPATCHED", "DELIVERING"] }, total_vnd: total, paid_vnd: Number(order.paid_vnd),
        },
        data: {
          delivery_status: "FAILED",
          delivery_window: windowWithFailure(order.delivery_window, input.failure) as Prisma.InputJsonValue,
          internal_note: [order.internal_note, line].filter(Boolean).join("\n"),
          ...(nextRef ? { total_vnd: newTotal, balance_vnd: newTotal - Number(order.paid_vnd), vat_amount_vnd: vatAmountVnd, pricing_rule_ref: nextRef as Prisma.InputJsonValue } : {}),
        },
      })
      if (moved.count === 0) throw conflict("Đơn vừa thay đổi, vui lòng tải lại")

      await tx.order_events.create({
        data: scopedData(ctx, {
          order_id: order.id, axis: "delivery", from_value: order.delivery_status, to_value: "FAILED",
          reason: "DELIVERY_FAILED", actor_id: ctx.userId,
        }),
      })
      await recordAuditLog(ctx, {
        action: "greeting_card.order.delivery_failed",
        entityType: "order", entityId: order.id,
        before: { deliveryStatus: order.delivery_status, totalVnd: total },
        after: { deliveryStatus: "FAILED", reason: input.failure.reason, note: input.failure.note, feeVnd: input.feeVnd, totalVnd: newTotal },
      }, tx)
      return { orderId: order.id, orderCode: order.code, feeVnd: input.feeVnd, totalVnd: newTotal }
    })
  }
}

let _deliveryFailureRepositorySingleton: DeliveryFailureRepository | null = null
export function getDeliveryFailureRepository(): DeliveryFailureRepository {
  if (!_deliveryFailureRepositorySingleton) _deliveryFailureRepositorySingleton = new DeliveryFailureRepository()
  return _deliveryFailureRepositorySingleton
}
