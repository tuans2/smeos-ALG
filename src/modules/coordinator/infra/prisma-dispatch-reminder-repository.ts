/**
 * Prisma Dispatch Reminder Repository Implementation.
 * Enforces strict Tenant Isolation via organization_id.
 * No invasive schema modifications — leverages metadata/settings/attributes JSON.
 */

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { notFound } from "@/core/http/errors"
import type {
  IDispatchReminderRepository,
  OrderWithReminderData,
} from "../domain/dispatch-reminder-repository-port"
import {
  DEFAULT_DISPATCH_REMINDER_POLICY,
  type CoordinatorMilestoneCode,
  type DispatchReminderPolicyConfig,
  type MilestoneReminderState,
  type OrderRemindersMetadata,
  type TemplateReminderOverrides,
} from "../domain/dispatch-reminder-types"

/** "YYYY-MM-DD" + "HH:MM…" (giờ Việt Nam) → thời điểm; sai định dạng → null. */
function slotStartAt(date: unknown, timeSlot: unknown): Date | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof timeSlot !== "string") return null
  const m = /^(\d{1,2}):(\d{2})/.exec(timeSlot.trim())
  if (!m) return null
  const at = new Date(`${date}T${m[1]!.padStart(2, "0")}:${m[2]}:00+07:00`)
  return Number.isNaN(at.getTime()) ? null : at
}

export class PrismaDispatchReminderRepository implements IDispatchReminderRepository {
  async getActiveOrdersForReminders(
    organizationId: string
  ): Promise<OrderWithReminderData[]> {
    const orders = await prisma.orders.findMany({
      where: {
        organization_id: organizationId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        coordination: true,
        customer: true,
        items: {
          take: 1,
        },
      },
      // Giới hạn cố định nhưng có thứ tự: đơn mới nhất trước (không lấy 100 đơn ngẫu nhiên)
      orderBy: { created_at: "desc" },
      take: 200,
    })

    // Lấy thông tin attributes của các product liên quan
    const productIds = orders
      .map((o) => o.items[0]?.product_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    const productMap = new Map<string, Record<string, unknown>>()
    if (productIds.length > 0) {
      const products = await prisma.products.findMany({
        where: {
          id: { in: productIds },
          organization_id: organizationId,
        },
        select: {
          id: true,
          attributes: true,
        },
      })
      for (const p of products) {
        if (p.attributes) {
          productMap.set(p.id, p.attributes as Record<string, unknown>)
        }
      }
    }

    return orders.map((order) => {
      const coord = order.coordination
      const coordMeta = (coord?.metadata as Record<string, unknown> | null) ?? {}
      const remindersMeta =
        (coordMeta.reminders as OrderRemindersMetadata | undefined) ?? null

      // Xác định thời điểm thanh toán
      let paidAt: Date | null = null
      if (Number(order.paid_vnd) > 0) {
        paidAt = coordMeta.paid_at
          ? new Date(coordMeta.paid_at as string)
          : order.created_at
      }

      // Xác định thời điểm giao hàng
      let deliveryTime: Date | null = coord?.estimated_delivery_at ?? null
      if (!deliveryTime && order.delivery_window) {
        const dw = order.delivery_window as Record<string, unknown>
        if (typeof dw.targetAt === "string") {
          deliveryTime = new Date(dw.targetAt)
        } else {
          // Đơn Thẻ chào lưu { date, timeSlot } — giờ giao là đầu khung, giờ Việt Nam
          deliveryTime = slotStartAt(dw.date, dw.timeSlot)
        }
      }

      // Xác định thời điểm gán shipper
      let shipperAssignedAt: Date | null = null
      if (coord?.shipper_phone) {
        shipperAssignedAt = coordMeta.shipper_assigned_at
          ? new Date(coordMeta.shipper_assigned_at as string)
          : coord.updated_at
      }

      // Lấy template overrides từ product
      let templateOverrides: TemplateReminderOverrides | null = null
      const firstProductId = order.items[0]?.product_id
      if (firstProductId && productMap.has(firstProductId)) {
        const prodAttrs = productMap.get(firstProductId)
        if (prodAttrs?.coordinator_reminder_overrides) {
          templateOverrides = prodAttrs.coordinator_reminder_overrides as TemplateReminderOverrides
        }
      }

      // Địa chỉ giao
      let deliveryAddress: string | null = null
      if (order.delivery_address) {
        const addr = order.delivery_address as Record<string, unknown>
        deliveryAddress =
          typeof addr.fullAddress === "string"
            ? addr.fullAddress
            : typeof addr.street === "string"
            ? `${addr.street}, ${addr.district ?? ""}`
            : null
      }

      return {
        orderId: order.id,
        orderCode: order.code,
        paidAt,
        deliveryTime,
        shipperAssignedAt,
        shipperName: coord?.shipper_name,
        shipperPhone: coord?.shipper_phone,
        coordinatorPhone: null,
        customerName: order.customer?.name,
        customerPhone: order.customer?.phone,
        deliveryAddress,
        metadataReminders: remindersMeta,
        isDelivered: coord?.stage === "DELIVERED",
        deliveredAt: coord?.actual_delivery_at,
        templateOverrides,
      }
    })
  }

  async getPolicyConfig(organizationId: string): Promise<DispatchReminderPolicyConfig> {
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })

    if (!org?.settings) {
      return { ...DEFAULT_DISPATCH_REMINDER_POLICY }
    }

    const settings = org.settings as Record<string, unknown>
    const saved = settings.coordinator_reminders as
      | Partial<DispatchReminderPolicyConfig>
      | undefined

    return {
      m0MinutesAfterPaid:
        saved?.m0MinutesAfterPaid ?? DEFAULT_DISPATCH_REMINDER_POLICY.m0MinutesAfterPaid,
      m1MinutesBeforeDelivery:
        saved?.m1MinutesBeforeDelivery ??
        DEFAULT_DISPATCH_REMINDER_POLICY.m1MinutesBeforeDelivery,
      m2MinutesBeforeDelivery:
        saved?.m2MinutesBeforeDelivery ??
        DEFAULT_DISPATCH_REMINDER_POLICY.m2MinutesBeforeDelivery,
      m3MinutesAfterShipperAssigned:
        saved?.m3MinutesAfterShipperAssigned ??
        DEFAULT_DISPATCH_REMINDER_POLICY.m3MinutesAfterShipperAssigned,
      m5MinutesAfterDelivery:
        saved?.m5MinutesAfterDelivery ??
        DEFAULT_DISPATCH_REMINDER_POLICY.m5MinutesAfterDelivery,
    }
  }

  async savePolicyConfig(
    organizationId: string,
    config: DispatchReminderPolicyConfig
  ): Promise<void> {
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })

    const existingSettings = (org?.settings as Record<string, unknown> | null) ?? {}
    const updatedSettings = {
      ...existingSettings,
      coordinator_reminders: config,
    }

    await prisma.organizations.update({
      where: { id: organizationId },
      data: { settings: updatedSettings as unknown as Prisma.InputJsonValue },
    })
  }

  async getTemplateOverrides(
    organizationId: string,
    productId: string
  ): Promise<TemplateReminderOverrides | null> {
    const product = await prisma.products.findFirst({
      where: { id: productId, organization_id: organizationId },
      select: { attributes: true },
    })
    // Sản phẩm không thuộc cửa hàng này → 404, không để lộ là "chưa cấu hình"
    if (!product) throw notFound()

    if (!product.attributes) return null
    const attrs = product.attributes as Record<string, unknown>
    return (attrs.coordinator_reminder_overrides as TemplateReminderOverrides) ?? null
  }

  async saveTemplateOverrides(
    organizationId: string,
    productId: string,
    overrides: TemplateReminderOverrides
  ): Promise<void> {
    const product = await prisma.products.findFirst({
      where: { id: productId, organization_id: organizationId },
      select: { attributes: true },
    })
    // Sản phẩm không thuộc cửa hàng này → 404, không bao giờ ghi sang cửa hàng khác
    if (!product) throw notFound()

    const existingAttrs = (product.attributes as Record<string, unknown> | null) ?? {}
    const updatedAttrs = {
      ...existingAttrs,
      coordinator_reminder_overrides: overrides,
    }

    await prisma.products.updateMany({
      where: { id: productId, organization_id: organizationId },
      data: { attributes: updatedAttrs as unknown as Prisma.InputJsonValue },
    })
  }

  async acknowledgeMilestone(params: {
    organizationId: string
    orderId: string
    milestone: CoordinatorMilestoneCode
    action: "ACKNOWLEDGED" | "SNOOZED" | "DISMISSED"
    actorId?: string | undefined
    snoozeMinutes?: number | undefined
    note?: string | undefined
  }): Promise<void> {
    const coord = await prisma.order_coordinations.findFirst({
      where: {
        order_id: params.orderId,
        organization_id: params.organizationId,
      },
    })

    if (!coord) {
      // Đơn của cửa hàng khác (hoặc không tồn tại) → 404, không bao giờ báo "đã xác nhận" giả
      const order = await prisma.orders.findFirst({
        where: { id: params.orderId, organization_id: params.organizationId },
        select: { id: true },
      })
      if (!order) throw notFound()
      return
    }

    const existingMeta = (coord.metadata as Record<string, unknown> | null) ?? {}
    const existingReminders =
      (existingMeta.reminders as OrderRemindersMetadata | undefined) ?? {}

    const now = new Date()
    const updatedState: MilestoneReminderState = {
      status: params.action,
      scheduledAt: undefined,
      triggeredAt: undefined,
      acknowledgedAt: now.toISOString(),
      acknowledgedBy: params.actorId ?? undefined,
      snoozedUntil: undefined,
      note: params.note ?? undefined,
    }

    if (params.action === "SNOOZED") {
      const snoozeMs = (params.snoozeMinutes ?? 10) * 60 * 1000
      updatedState.snoozedUntil = new Date(now.getTime() + snoozeMs).toISOString()
    }

    const updatedReminders: OrderRemindersMetadata = {
      ...existingReminders,
      [params.milestone]: updatedState,
    }

    await prisma.order_coordinations.update({
      where: { id: coord.id },
      data: {
        metadata: {
          ...existingMeta,
          reminders: updatedReminders,
        } as unknown as Prisma.InputJsonValue,
      },
    })
  }
}
