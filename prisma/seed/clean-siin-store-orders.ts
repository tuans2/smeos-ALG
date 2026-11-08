/**
 * Dọn dẹp toàn bộ dữ liệu đơn hàng và phiên đặt hàng thử nghiệm của Siin Store.
 *
 * Phạm vi:
 *   • Đơn hàng chính (orders) và tất cả bảng phụ thuộc (order_items, order_coordinations,
 *     order_payments, order_events, order_qc_records, order_exceptions, order_assignments...)
 *   • Phiên đặt hàng và nháp Thẻ Chào (greeting_sessions, greeting_journey_events,
 *     greeting_messages, greeting_notifications, greeting_payment_events...)
 *   • TUYỆT ĐỐI BẢO TOÀN: Thông tin tổ chức (Siin Store), tài khoản nhân sự,
 *     Business Profile, Brand Profile, danh mục sản phẩm hoa và kho ảnh assets.
 */

import { prisma } from "../../src/core/tenancy/infra/prisma"
import { setPurgeReason } from "../../src/core/tenancy/infra/purge-reason"
import { MOCLAN_CONSTANTS } from "./dev-moclan-data"

export async function cleanSiinStoreOrders(): Promise<void> {
  console.log("🧹 [cleanSiinStoreOrders] Bắt đầu dọn dẹp đơn hàng Siin Store...")

  const org = await prisma.organizations.findFirst({
    where: {
      OR: [
        { id: MOCLAN_CONSTANTS.ORG_ID },
        { slug: "siin-store" },
        { name: "Siin Store" },
      ],
    },
  })

  if (!org) {
    console.log("  ⚠️ Không tìm thấy tổ chức Siin Store trong cơ sở dữ liệu. Bỏ qua.")
    return
  }

  const orgId = org.id
  console.log(`  🏢 Tổ chức: ${org.name} (ID: ${orgId}, slug: ${org.slug})`)

  const initialOrdersCount = await prisma.orders.count({ where: { organization_id: orgId } })
  const initialSessionsCount = await prisma.greeting_sessions.count({ where: { organization_id: orgId } })

  console.log(`  📊 Hiện có: ${initialOrdersCount} đơn hàng, ${initialSessionsCount} phiên Thẻ Chào.`)

  if (initialOrdersCount === 0 && initialSessionsCount === 0) {
    console.log("  ✅ Không có dữ liệu đơn hàng nào cần xóa.")
    return
  }

  await prisma.$transaction(async (tx) => {
    // Nhật ký bất biến (ADR-013 D-I4): xoá order_events và xoá dây chuyền từ orders cần lý do purge trong giao dịch
    await setPurgeReason(tx, "test_data_cleanup")

    // 1. Dọn dẹp các bảng phụ thuộc Thẻ Chào (Greeting Card)
    const delJourney = await tx.greeting_journey_events.deleteMany({ where: { organization_id: orgId } })
    const delMsgReads = await tx.greeting_message_reads.deleteMany({ where: { organization_id: orgId } })
    const delMsgs = await tx.greeting_messages.deleteMany({ where: { organization_id: orgId } })
    const delNotifs = await tx.greeting_notifications.deleteMany({ where: { organization_id: orgId } })
    const delPaymentsEvt = await tx.greeting_payment_events.deleteMany({ where: { organization_id: orgId } })

    await tx.greeting_catalog_events.updateMany({
      where: { organization_id: orgId, order_id: { not: null } },
      data: { order_id: null },
    })

    await tx.vouchers.updateMany({
      where: { organization_id: orgId, order_id: { not: null } },
      data: { order_id: null, is_used: false, used_at: null },
    })

    const delSessions = await tx.greeting_sessions.deleteMany({ where: { organization_id: orgId } })

    // 2. Dọn dẹp các bảng phụ thuộc Đơn hàng (Orders)
    const delItems = await tx.order_items.deleteMany({ where: { organization_id: orgId } })
    const delAssignments = await tx.order_assignments.deleteMany({ where: { organization_id: orgId } })
    const delEvents = await tx.order_events.deleteMany({ where: { organization_id: orgId } })
    const delCoords = await tx.order_coordinations.deleteMany({ where: { organization_id: orgId } })
    const delQc = await tx.order_qc_records.deleteMany({ where: { organization_id: orgId } })
    const delExceptions = await tx.order_exceptions.deleteMany({ where: { organization_id: orgId } })
    const delPayments = await tx.order_payments.deleteMany({ where: { organization_id: orgId } })
    const delInfoReqs = await tx.order_info_requests.deleteMany({ where: { organization_id: orgId } })
    const delChangeReqs = await tx.order_change_requests.deleteMany({ where: { organization_id: orgId } })

    // 3. Xóa bảng đơn hàng chính
    const delOrders = await tx.orders.deleteMany({ where: { organization_id: orgId } })

    console.log(`  ✓ Đã xóa ${delOrders.count} đơn hàng (orders)`)
    console.log(`  ✓ Đã xóa ${delItems.count} dòng chi tiết đơn (order_items)`)
    console.log(`  ✓ Đã xóa ${delCoords.count} bản ghi điều phối (order_coordinations)`)
    console.log(`  ✓ Đã xóa ${delPayments.count} giao dịch sổ thu (order_payments)`)
    console.log(`  ✓ Đã xóa ${delEvents.count} sự kiện đơn (order_events)`)
    console.log(`  ✓ Đã xóa ${delAssignments.count} phân công cắm hoa (order_assignments)`)
    console.log(`  ✓ Đã xóa ${delQc.count} bản ghi kiểm duyệt QC (order_qc_records)`)
    console.log(`  ✓ Đã xóa ${delExceptions.count} sự cố ngoại lệ (order_exceptions)`)
    console.log(`  ✓ Đã xóa ${delInfoReqs.count} yêu cầu thông tin & ${delChangeReqs.count} yêu cầu đổi đơn`)
    console.log(`  ✓ Đã xóa ${delSessions.count} phiên Thẻ Chào (greeting_sessions)`)
    console.log(`  ✓ Đã xóa ${delJourney.count} nhật ký tương tác khách (greeting_journey_events)`)
    console.log(`  ✓ Đã xóa ${delMsgs.count} tin nhắn nội bộ (${delMsgReads.count} lượt đọc)`)
    console.log(`  ✓ Đã xóa ${delNotifs.count} thông báo (greeting_notifications)`)
    console.log(`  ✓ Đã xóa ${delPaymentsEvt.count} giao dịch ngân hàng Thẻ Chào (greeting_payment_events)`)
  })

  console.log("✅ [cleanSiinStoreOrders] Hoàn tất dọn dẹp sạch sẽ cơ sở dữ liệu đơn hàng Siin Store!")
}

if (process.argv[1]?.endsWith("clean-siin-store-orders.ts") || process.argv[1]?.endsWith("clean-siin-store-orders.js")) {
  cleanSiinStoreOrders()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err)
      await prisma.$disconnect()
      process.exit(1)
    })
}
