/**
 * availability-mode.ts — Khái niệm và cấu hình khả dụng cốt lõi đa ngành.
 * Pure TypeScript — không import Prisma.
 */

export type AvailabilityMode =
  | "STOCK_QUANTITY"    // Bán lẻ, Thời trang, Hoa tươi (tồn kho / bật tắt)
  | "DAILY_CAPACITY"   // Quà thủ công, Tiệm hoa sự kiện (năng lực chế tác/ngày)
  | "BOOKING_CALENDAR" // Homestay, Khách sạn, Lưu trú (lịch đặt theo khoảng ngày)
  | "SCHEDULE_SLOTS"   // Dịch vụ, Spa, Đặt bàn F&B (lịch ca / khung giờ)

export interface BookingSpan {
  checkInDate: string
  checkOutDate: string
}

export interface ProductBookingRecord {
  id: string
  productId: string
  productName: string
  orderId?: string | null
  orderCode?: string | null
  customerName?: string | null
  customerPhone?: string | null
  checkInDate: string
  checkOutDate: string
  note?: string | null
  status: "ACTIVE" | "CANCELLED"
  createdAt: string
  orderStatus?: string | null
  totalVnd?: number | null
  paidVnd?: number | null
  checkInTimeSlot?: string | null
}

export interface DayAvailabilitySummary {
  date: string // "YYYY-MM-DD"
  isBlocked: boolean
  isBooked: boolean
  bookingCount: number
  capacityPercent?: number // cho DAILY_CAPACITY
  bookings: Array<{
    id: string
    orderId?: string | null
    orderCode?: string | null
    customerName?: string | null
    note?: string | null
  }>
}
