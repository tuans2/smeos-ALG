import { conflict } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

/**
 * Lịch đặt chỗ (`product_bookings`) theo vòng đời đơn — audit User Journey UJ-23 (A1, 12/11/2026). Trước đây
 * `releaseOrderBooking` không ai gọi: đơn huỷ rồi mà phòng/khung giờ vẫn `ACTIVE`, khách sau bị báo "đã có người đặt".
 * Mọi đường huỷ đơn gọi `releaseOrderBookings` cùng chỗ với `returnStock`; khôi phục đơn gọi `retakeOrderBookings`.
 * Khoá tay của Điều hành (`order_id = null`) không bị đụng.
 */

/** Trả mọi đặt chỗ đang giữ của đơn. Có `db` (giao dịch huỷ) thì chạy trong đó — huỷ lỗi thì không trả. */
export async function releaseOrderBookings(organizationId: string, orderId: string, db?: Tx): Promise<number> {
  const res = await (db ?? prisma).product_bookings.updateMany({
    where: { organization_id: organizationId, order_id: orderId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  })
  return res.count
}

/**
 * Giữ lại đặt chỗ khi đơn đã huỷ được khôi phục: mỗi sản phẩm lấy lại dòng mới nhất của đơn. Khoảng ngày đã có đặt
 * chỗ khác đang giữ → 409, không khôi phục (cùng khoá theo sản phẩm với `AvailabilityRepository.createBooking`).
 */
export async function retakeOrderBookings(tx: Tx, organizationId: string, orderId: string): Promise<number> {
  const rows = await tx.product_bookings.findMany({
    where: { organization_id: organizationId, order_id: orderId },
    orderBy: { created_at: "desc" },
    select: { id: true, product_id: true, status: true, check_in_date: true, check_out_date: true },
  })
  const latest = new Map<string, (typeof rows)[number]>()
  for (const row of rows) if (!latest.has(row.product_id)) latest.set(row.product_id, row)

  let taken = 0
  for (const row of latest.values()) {
    if (row.status === "ACTIVE") continue
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${row.product_id}::text, 0))`
    const clash = await tx.product_bookings.findFirst({
      where: {
        organization_id: organizationId,
        product_id: row.product_id,
        status: "ACTIVE",
        id: { not: row.id },
        check_in_date: { lt: row.check_out_date },
        check_out_date: { gt: row.check_in_date },
      },
      select: { id: true },
    })
    if (clash) throw conflict("Khoảng ngày của đơn đã có khách khác đặt — đổi ngày hoặc tạo đơn mới thay vì khôi phục.")
    await tx.product_bookings.updateMany({ where: { id: row.id, organization_id: organizationId }, data: { status: "ACTIVE" } })
    taken += 1
  }
  return taken
}
