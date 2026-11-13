/**
 * Availability Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma imports.
 * Belongs to Domain Layer of Availability Module.
 */

import type { ProductBookingRecord } from "../availability-mode"

export interface CreateBlockInput {
  organizationId: string
  productId: string
  orderId?: string | null | undefined
  checkInDate: string
  checkOutDate: string
  note?: string | null | undefined
}

export interface ProductWithAvailability {
  id: string
  code: string
  name: string
  category: string | null
  status: string
  availabilityConfig: unknown
  inventoryStatus?: string | undefined
  quantityAvailable?: number | null | undefined
}

export interface BookingOrderInfo {
  id: string
  status: string
}

export interface IAvailabilityRepository {
  /** Lấy danh sách booking trong khoảng ngày của một hoặc tất cả sản phẩm */
  listBookings(
    organizationId: string,
    fromDate: string,
    toDate: string,
    productId?: string | undefined
  ): Promise<ProductBookingRecord[]>

  /** Thêm block thủ công hoặc từ đơn hàng — null nếu trùng lịch */
  createBooking(input: CreateBlockInput): Promise<string | null>

  /** Xóa manual block của admin (chỉ block có order_id = null) */
  deleteManualBlock(organizationId: string, blockId: string): Promise<boolean>

  /** Tìm booking theo orderId */
  findBookingByOrderId(
    organizationId: string,
    orderId: string
  ): Promise<BookingOrderInfo | null>

  /** Hủy booking tự động khi đơn hàng bị hủy */
  cancelByOrderId(organizationId: string, orderId: string): Promise<void>

  /** Lấy danh sách sản phẩm cùng cấu hình khả dụng của tổ chức */
  listProductsWithAvailability(
    organizationId: string
  ): Promise<ProductWithAvailability[]>

  /** Cập nhật delivery_window của đơn hàng */
  updateOrderDeliveryWindow(
    organizationId: string,
    orderId: string,
    deliveryWindow: Record<string, unknown>
  ): Promise<void>

  /** Kiểm tra sản phẩm thuộc tổ chức */
  productBelongsToOrganization?(
    organizationId: string,
    productId: string
  ): Promise<boolean>
}
