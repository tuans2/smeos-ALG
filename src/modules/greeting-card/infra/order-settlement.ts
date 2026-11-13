import { prisma } from "@/core/tenancy/infra/prisma"

type SettlementDb = Pick<typeof prisma, "orders">

/**
 * Đơn đã giao và đã thu đủ → `COMPLETED`, bằng một câu cập nhật có điều kiện trên dòng hiện tại.
 * Gọi sau mỗi lần ghi giao hàng và sau mỗi lần ghi thu tiền: khi hai việc xảy ra cùng lúc, việc ghi
 * sau luôn thấy trạng thái của việc ghi trước nên đơn không kẹt ở "Đã giao — chờ thu đủ".
 */
export async function completeIfSettled(organizationId: string, orderId: string, db: SettlementDb = prisma): Promise<boolean> {
  const moved = await db.orders.updateMany({
    where: { id: orderId, organization_id: organizationId, status: "DELIVERED", delivery_status: "DELIVERED", balance_vnd: { lte: 0 } },
    data: { status: "COMPLETED" },
  })
  return moved.count > 0
}
