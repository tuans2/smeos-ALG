import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { ProductBookingRecord } from "../domain/availability-mode"
import { dateToIsoDay, isoDayToDate } from "../domain/booking-day"

import type {
  IAvailabilityRepository,
  CreateBlockInput,
  ProductWithAvailability,
} from "../domain/repositories/availability-repository.interface"

export type { CreateBlockInput, ProductWithAvailability }

type Db = typeof prisma

export class AvailabilityRepository implements IAvailabilityRepository {
  constructor(private readonly db: Db = prisma) {}

  /** Lấy danh sách booking trong khoảng ngày của một hoặc tất cả sản phẩm */
  async listBookings(
    organizationId: string,
    fromDate: string,
    toDate: string,
    productId?: string | undefined,
  ): Promise<ProductBookingRecord[]> {
    const rows = await this.db.product_bookings.findMany({
      where: {
        organization_id: organizationId,
        status: "ACTIVE",
        ...(productId ? { product_id: productId } : {}),
        check_in_date: { lt: isoDayToDate(toDate) },
        check_out_date: { gt: isoDayToDate(fromDate) },
      },
      include: { product: { select: { name: true } } },
      orderBy: { check_in_date: "asc" },
    })

    // Lấy thông tin đơn hàng nếu có order_id
    const orderIds = rows
      .map((r) => r.order_id)
      .filter((id): id is string => Boolean(id))

    const orderMap = new Map<
      string,
      {
        code: string
        customerName: string
        customerPhone: string
        orderStatus: string
        totalVnd: number
        paidVnd: number
        checkInTimeSlot: string | null
      }
    >()
    if (orderIds.length > 0) {
      const orders = await this.db.orders.findMany({
        where: { organization_id: organizationId, id: { in: orderIds } },
        select: {
          id: true,
          code: true,
          status: true,
          total_vnd: true,
          paid_vnd: true,
          delivery_window: true,
          customer: { select: { name: true, phone: true } },
        },
      })
      for (const o of orders) {
        const win = (o.delivery_window as Record<string, string> | null) || {}
        orderMap.set(o.id, {
          code: o.code,
          customerName: o.customer?.name ?? "",
          customerPhone: o.customer?.phone ?? "",
          orderStatus: o.status,
          totalVnd: Number(o.total_vnd),
          paidVnd: Number(o.paid_vnd),
          checkInTimeSlot: win.timeSlot || null,
        })
      }
    }

    return rows.map((r) => {
      const ord = r.order_id ? orderMap.get(r.order_id) : undefined
      return {
        id: r.id,
        productId: r.product_id,
        productName: r.product.name,
        orderId: r.order_id,
        orderCode: ord?.code ?? null,
        customerName: ord?.customerName ?? null,
        customerPhone: ord?.customerPhone ?? null,
        orderStatus: ord?.orderStatus ?? null,
        totalVnd: ord?.totalVnd ?? null,
        paidVnd: ord?.paidVnd ?? null,
        checkInTimeSlot: ord?.checkInTimeSlot ?? null,
        checkInDate: dateToIsoDay(r.check_in_date),
        checkOutDate: dateToIsoDay(r.check_out_date),
        note: r.note,
        status: r.status,
        createdAt: r.created_at.toISOString(),
      }
    })
  }

  /**
   * Thêm block thủ công hoặc từ đơn hàng — `null` nếu khoảng ngày chồng lên một đặt chỗ ACTIVE
   * khác của cùng sản phẩm. Khoá tư vấn theo sản phẩm (pg_advisory_xact_lock) tuần tự hoá mọi lần
   * ghi của một phòng giữa các instance, nên hai khách thanh toán cùng lúc không cùng giữ được
   * một phòng (rà soát 21/10/2026, H8). Chưa đặt ràng buộc EXCLUDE ở CSDL: Prisma không khai được
   * nên ràng buộc chỉ sống trong SQL migration viết tay và dễ trôi giữa các môi trường.
   */
  async createBooking(input: CreateBlockInput): Promise<string | null> {
    const checkIn = isoDayToDate(input.checkInDate)
    const checkOut = isoDayToDate(input.checkOutDate)
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.productId}::text, 0))`
      const clash = await tx.product_bookings.findFirst({
        where: {
          organization_id: input.organizationId,
          product_id: input.productId,
          status: "ACTIVE",
          check_in_date: { lt: checkOut },
          check_out_date: { gt: checkIn },
        },
        select: { id: true },
      })
      if (clash) return null
      const row = await tx.product_bookings.create({
        data: {
          organization_id: input.organizationId,
          product_id: input.productId,
          order_id: input.orderId ?? null,
          check_in_date: checkIn,
          check_out_date: checkOut,
          note: input.note ?? null,
          status: "ACTIVE",
        },
        select: { id: true },
      })
      return row.id
    })
  }

  /** Khoảng ngày có chồng lên đặt chỗ ACTIVE nào của sản phẩm không (kiểm trước khi tạo đơn). */
  async hasActiveOverlap(organizationId: string, productId: string, checkInDate: string, checkOutDate: string): Promise<boolean> {
    const clash = await this.db.product_bookings.findFirst({
      where: {
        organization_id: organizationId,
        product_id: productId,
        status: "ACTIVE",
        check_in_date: { lt: isoDayToDate(checkOutDate) },
        check_out_date: { gt: isoDayToDate(checkInDate) },
      },
      select: { id: true },
    })
    return clash !== null
  }

  /** Sản phẩm có thuộc tổ chức không — `productId` đến từ body, không được tin. */
  async productBelongsToOrganization(organizationId: string, productId: string): Promise<boolean> {
    const row = await this.db.products.findFirst({
      where: { id: productId, organization_id: organizationId },
      select: { id: true },
    })
    return row !== null
  }

  /** Xóa manual block của admin (chỉ block có order_id = null) */
  async deleteManualBlock(organizationId: string, blockId: string): Promise<boolean> {
    const res = await this.db.product_bookings.updateMany({
      where: { organization_id: organizationId, id: blockId, order_id: null },
      data: { status: "CANCELLED" },
    })
    return res.count > 0
  }

  /** Tìm booking theo orderId */
  async findBookingByOrderId(organizationId: string, orderId: string): Promise<{ id: string; status: string } | null> {
    return this.db.product_bookings.findFirst({
      where: { organization_id: organizationId, order_id: orderId },
      select: { id: true, status: true },
    })
  }

  /** Hủy booking tự động khi đơn hàng bị hủy */
  async cancelByOrderId(organizationId: string, orderId: string): Promise<void> {
    await this.db.product_bookings.updateMany({
      where: { organization_id: organizationId, order_id: orderId },
      data: { status: "CANCELLED" },
    })
  }

  /** Lấy danh sách sản phẩm cùng cấu hình khả dụng của tổ chức */
  async listProductsWithAvailability(organizationId: string): Promise<Array<{
    id: string
    code: string
    name: string
    category: string | null
    status: string
    availabilityConfig: unknown
    inventoryStatus?: string | undefined
    quantityAvailable?: number | null | undefined
  }>> {
    const products = await this.db.products.findMany({
      where: { organization_id: organizationId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        status: true,
        availability_config: true,
        inventory: { where: { organization_id: organizationId }, select: { status: true, quantity_available: true } },
      },
      orderBy: { name: "asc" },
    })

    // Tồn của cả tổ chức = gộp mọi chi nhánh (audit BL-16: trước đây lấy MỘT dòng bất kỳ — tiệm nhiều chi
    // nhánh thấy tồn của một chi nhánh ngẫu nhiên). Bỏ nhánh dự phòng SQL thô cho dev server cũ.
    return products.map((p) => {
      const stock = aggregateInventory(p.inventory)
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        status: p.status,
        availabilityConfig: p.availability_config,
        inventoryStatus: stock.status,
        quantityAvailable: stock.quantity,
      }
    })
  }

  /** Cập nhật delivery_window của đơn hàng (dùng khi tự phục hồi checkOutDate cho đơn Homestay) */
  async updateOrderDeliveryWindow(
    organizationId: string,
    orderId: string,
    deliveryWindow: Record<string, unknown>,
  ): Promise<void> {
    await this.db.orders.updateMany({
      where: { organization_id: organizationId, id: orderId },
      data: { delivery_window: deliveryWindow as Prisma.InputJsonValue },
    })
  }
}

let defaultAvailabilityRepository: IAvailabilityRepository | null = null

export function getAvailabilityRepository(): IAvailabilityRepository {
  if (!defaultAvailabilityRepository) {
    defaultAvailabilityRepository = new AvailabilityRepository()
  }
  return defaultAvailabilityRepository!
}

/** Gộp tồn nhiều chi nhánh: còn hàng nếu một chi nhánh còn; số lượng = tổng các chi nhánh có theo dõi số lượng. */
export function aggregateInventory(rows: ReadonlyArray<{ status: string; quantity_available: number | null }>): {
  status: string | undefined
  quantity: number | null | undefined
} {
  if (rows.length === 0) return { status: undefined, quantity: undefined }
  const tracked = rows.filter((r) => r.quantity_available !== null)
  const status = rows.find((r) => r.status === "IN_STOCK")?.status ?? rows.find((r) => r.status === "PRE_ORDER_ONLY")?.status ?? rows[0]!.status
  return { status, quantity: tracked.length === 0 ? null : tracked.reduce((sum, r) => sum + (r.quantity_available ?? 0), 0) }
}
