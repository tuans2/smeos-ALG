import { prisma } from "@/core/tenancy/infra/prisma"
import { Prisma } from "@/generated/prisma/client"
import { ERASED_CUSTOMER_NAME, ERASED_MARKER } from "@/modules/organization/domain/tenant-purge-policy"

/**
 * Xoá dữ liệu cá nhân của MỘT khách theo yêu cầu (ADR-014 D-P5, bước P-7a) — ẩn danh xuyên bảng theo sổ dữ liệu cá nhân
 * (`/// @pii` trong `schema.prisma`), một giao dịch, chỉ trong tổ chức của phiên. Giữ dòng tài chính: đơn, dòng đơn,
 * phiếu thu, thông tin hoá đơn VAT; hồ sơ khách còn lại dưới tên `Khách đã xoá` để chứng từ vẫn trỏ được. Đồng ý nhận
 * tin bị thu hồi (giữ dòng làm bằng chứng). Trả số dòng đã đổi theo bảng — không có dữ liệu cá nhân.
 */
export type ErasureCounts = Record<string, number>

export interface ErasureOptions {
  /**
   * Giữ địa chỉ, người nhận, lời thiệp, SĐT điều phối của đơn CHƯA KẾT THÚC (audit User Journey UJ-28, PO 12/11/2026
   * UQ15): xoá giữa lúc đang giao làm thợ / người giao mất địa chỉ. Số đơn còn chờ trả ở `orders_waiting`; bộ quét
   * `completePendingErasures` xoá nốt khi đơn đã đóng.
   */
  keepOpenOrders?: boolean
}

/** Đơn đã kết thúc — xoá dữ liệu giao nhận được. */
const CLOSED_ORDER_STATUSES = ["COMPLETED", "CANCELLED"] as const

export async function eraseCustomerData(organizationId: string, customerId: string, now: Date, options: ErasureOptions = {}): Promise<ErasureCounts> {
  return prisma.$transaction((tx) => eraseCustomerDataIn(tx, organizationId, customerId, now, options))
}

/** Như `eraseCustomerData` nhưng trong giao dịch của người gọi (khôi phục riêng một tổ chức chạy lại yêu cầu xoá). */
export async function eraseCustomerDataIn(
  tx: Prisma.TransactionClient, organizationId: string, customerId: string, now: Date, options: ErasureOptions = {},
): Promise<ErasureCounts> {
  {
    const org = { organization_id: organizationId }
    const mine = { ...org, customer_id: customerId }
    const orders = await tx.orders.findMany({ where: mine, select: { id: true, status: true } })
    const isClosed = (status: string) => (CLOSED_ORDER_STATUSES as readonly string[]).includes(status)
    const openOrderIds = options.keepOpenOrders ? orders.filter((o) => !isClosed(o.status)).map((o) => o.id) : []
    const orderIds = orders.map((o) => o.id).filter((id) => !openOrderIds.includes(id))
    const ofOrders = { ...org, order_id: { in: orderIds } }
    const conversationIds = (await tx.chat_conversations.findMany({ where: mine, select: { id: true } })).map((c) => c.id)

    const counts: ErasureCounts = {}
    const add = (table: string, n: number) => {
      if (n > 0) counts[table] = (counts[table] ?? 0) + n
    }

    // SQL thô: lớp mã hoá của client Prisma tính lại `phone_hash` từ dấu `ERASED` thành "" — khách thứ hai bị xoá trong
    // cùng tổ chức sẽ trùng khoá duy nhất `(organization_id, phone_hash)`. Ở đây băm và 4 số cuối về NULL thật.
    add("customers", await tx.$executeRaw`UPDATE "customers" SET name = ${ERASED_CUSTOMER_NAME}, phone = ${ERASED_MARKER},
      phone_hash = NULL, phone_last4 = NULL, email = NULL, address = NULL, notes = NULL, tags = '{}', preferred_flowers = '{}',
      preferred_colors = '{}' WHERE organization_id = ${organizationId} AND id = ${customerId}`)
    add("customer_occasions", (await tx.customer_occasions.deleteMany({ where: mine })).count)
    add("customer_interactions", (await tx.customer_interactions.deleteMany({ where: mine })).count)
    add("customer_consents", (await tx.customer_consents.updateMany({ where: { ...mine, granted: true }, data: { granted: false, revoked_at: now } })).count)
    add("leads", (await tx.leads.updateMany({
      where: mine,
      data: { name: ERASED_CUSTOMER_NAME, phone: ERASED_MARKER, phone_hash: null, phone_last4: null, message: null },
    })).count)
    add("greeting_sessions", (await tx.greeting_sessions.updateMany({
      // Phiên Thẻ chào của đơn còn mở giữ SĐT khách tới khi đơn đóng (UJ-28)
      where: openOrderIds.length > 0 ? { ...mine, OR: [{ order_id: null }, { order_id: { notIn: openOrderIds } }] } : mine,
      data: { customer_name: null, customer_phone: null, customer_phone_hash: null, customer_phone_last4: null },
    })).count)
    add("chat_messages", (await tx.chat_messages.deleteMany({ where: { ...org, conversation_id: { in: conversationIds } } })).count)
    add("chat_conversations", (await tx.chat_conversations.updateMany({ where: mine, data: { customer_id: null } })).count)
    add("quotations", (await tx.quotations.updateMany({ where: mine, data: { notes: null } })).count)
    add("orders", (await tx.orders.updateMany({
      where: { ...mine, id: { in: orderIds } },
      data: { card_message: null, internal_note: null, delivery_address: Prisma.DbNull },
    })).count)
    add("order_recipients", (await tx.order_recipients.updateMany({
      where: ofOrders,
      data: { recipient_name: null, recipient_phone: null, address_line: null, address_parts: Prisma.DbNull },
    })).count)
    add("order_coordinations", (await tx.order_coordinations.updateMany({
      where: ofOrders,
      data: { customer_phone: null, customer_phone_hash: null, pod_recipient_name: null },
    })).count)
    add("orders_waiting", openOrderIds.length)
    return counts
  }
}
