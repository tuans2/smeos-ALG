import { prisma } from "@/core/tenancy/infra/prisma"
import { dateToIsoDay, isoDayToDate } from "@/modules/availability/domain/booking-day"
import type { BookingSpan } from "../domain/product-availability-config"

type Db = typeof prisma

/**
 * Chỉ đọc lịch đặt chỗ cho trang Thẻ Chào. Mọi lần GHI đi qua `AvailabilityRepository.createBooking`
 * (khoá theo sản phẩm, chống đặt trùng — H8); các hàm ghi cũ ở đây không ai gọi và đi vòng qua
 * khoá đó nên đã gỡ (rà soát M5, 22/10/2026).
 */
export class ProductBookingRepository {
  constructor(private readonly db: Db = prisma) {}

  /** Lấy toàn bộ booking ACTIVE của sản phẩm trong khoảng ngày tìm kiếm (±90 ngày). */
  async getActiveBookings(
    organizationId: string,
    productId: string,
    fromDate: string,
    toDate: string,
  ): Promise<BookingSpan[]> {
    const rows = await this.db.product_bookings.findMany({
      where: {
        organization_id: organizationId,
        product_id: productId,
        status: "ACTIVE",
        // Chồng lịch: check_in_date < toDate AND check_out_date > fromDate
        check_in_date: { lt: isoDayToDate(toDate) },
        check_out_date: { gt: isoDayToDate(fromDate) },
      },
      select: { check_in_date: true, check_out_date: true },
      orderBy: { check_in_date: "asc" },
    })
    return rows.map((r) => ({
      checkInDate: dateToIsoDay(r.check_in_date),
      checkOutDate: dateToIsoDay(r.check_out_date),
    }))
  }
}

let _productBookingRepositorySingleton: ProductBookingRepository | null = null
export function getProductBookingRepository(): ProductBookingRepository {
  if (!_productBookingRepositorySingleton) _productBookingRepositorySingleton = new ProductBookingRepository()
  return _productBookingRepositorySingleton
}
