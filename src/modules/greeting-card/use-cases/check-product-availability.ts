/**
 * check-product-availability.ts — Use-case kiểm tra khả dụng sản phẩm đa ngành.
 *
 * Điều phối theo AvailabilityMode:
 *   STOCK_QUANTITY    → đọc product_inventory (đã có)
 *   DAILY_CAPACITY    → wrap fullSlotsOn() (đã có)
 *   BOOKING_CALENDAR  → query product_bookings
 *   SCHEDULE_SLOTS    → đếm đơn theo slot
 */
import { AvailabilityCheckRepository } from "@/modules/greeting-card/infra/availability-check-repository"
import {
  parseAvailabilityConfig,
  hasCalendarConflict,
  validateNights,
  countNights,
  isManuallyBlocked,
  type BookingCalendarConfig,
  type ScheduleSlotsConfig,
  type AvailabilityMode,
} from "../domain/product-availability-config"
import { notFound } from "@/core/http/errors"
import { ProductBookingRepository } from "../infra/product-booking-repository"
import { GreetingCardRepository } from "../infra/greeting-card-repository"
import { fullSlotsOn } from "./slot-availability"
import { loadPublicSession } from "./brochure-session-access"

export interface AvailabilityCheckRequest {
  organizationId: string
  productId: string
  industryKey?: string | null | undefined
  // BOOKING_CALENDAR
  checkInDate?: string | undefined
  checkOutDate?: string | undefined
  // DAILY_CAPACITY
  deliveryDate?: string | undefined
  deliveryTimeSlot?: string | undefined
  // STOCK_QUANTITY
  variantId?: string | undefined
  quantity?: number | undefined
}

export interface AvailabilityCheckResult {
  available: boolean | null
  mode: AvailabilityMode
  // BOOKING_CALENDAR
  unavailableDates?: string[] | undefined
  nextAvailableDate?: string | null | undefined
  // DAILY_CAPACITY
  fullSlots?: string[] | undefined
  // STOCK_QUANTITY
  remainingQuantity?: number | null | undefined
  // Thông báo cho khách
  message?: string | undefined
  // Validation errors (nếu có)
  errors?: Record<string, string> | undefined
}

const LOOKUP_DAYS = 90 // số ngày tìm kiếm lịch tới

export async function checkProductAvailability(
  req: AvailabilityCheckRequest,
  db = new AvailabilityCheckRepository(),
  bookingRepo = new ProductBookingRepository(),
): Promise<AvailabilityCheckResult> {
  // 1. Đọc cấu hình sản phẩm
  const product = await db.findProduct(req.organizationId, req.productId)

  if (!product) return { available: false, mode: "STOCK_QUANTITY", message: "Sản phẩm không tồn tại" }
  // Mẫu tạm ngưng hoặc đã lưu trữ không nhận đơn (checklist ALG 2.3)
  if (product.status === "PAUSED" || product.status === "ARCHIVED") return { available: false, mode: "STOCK_QUANTITY", message: "Mẫu đang tạm ngưng nhận đơn" }

  const config = parseAvailabilityConfig(product.availability_config, req.industryKey)
  // Ngày chặn thủ công áp cho mọi chế độ (checklist ALG 2.8); lịch phòng tự xử lý trong nhánh riêng
  if (config.mode !== "BOOKING_CALENDAR" && req.deliveryDate && isManuallyBlocked(req.deliveryDate, config)) {
    return { available: false, mode: config.mode, message: "Mẫu này không nhận đơn giao ngày đã chọn — vui lòng chọn ngày khác hoặc mẫu khác" }
  }

  // 2. Dispatch theo mode
  switch (config.mode) {
    case "BOOKING_CALENDAR":
      return checkBookingCalendar(req, config, bookingRepo)

    case "DAILY_CAPACITY":
      return checkDailyCapacity(req, db)

    case "SCHEDULE_SLOTS":
      return checkScheduleSlots(req, config, db)

    case "STOCK_QUANTITY":
    default: {
      const row = product.inventory?.find(
        (r: { branch_id: string | null; status: string; quantity_available: number | null }) =>
          r.branch_id === product.branch_id,
      )
      if (!row) return { available: true, mode: "STOCK_QUANTITY", remainingQuantity: null }
      if (row.status === "OUT_OF_STOCK") return {
        available: false, mode: "STOCK_QUANTITY", remainingQuantity: 0,
        message: "Sản phẩm tạm hết hàng — vui lòng chọn mẫu khác hoặc liên hệ cửa hàng",
      }
      const qty = row.quantity_available
      return {
        available: row.status === "PRE_ORDER_ONLY" || qty === null || qty > 0,
        mode: "STOCK_QUANTITY",
        remainingQuantity: qty,
        message: qty !== null && qty > 0 && qty <= 3 ? `Chỉ còn ${qty} sản phẩm` : undefined,
      }
    }
  }
}

// ─── BOOKING_CALENDAR (Homestay) ──────────────────────────────────────────────

async function checkBookingCalendar(
  req: AvailabilityCheckRequest,
  config: BookingCalendarConfig,
  bookingRepo: ProductBookingRepository,
): Promise<AvailabilityCheckResult> {
  const today = new Date().toISOString().slice(0, 10)
  const fromDate = today
  const toDate = addDays(today, LOOKUP_DAYS)

  // Lấy tất cả booking trong 90 ngày tới
  const existingBookings = await bookingRepo.getActiveBookings(
    req.organizationId, req.productId, fromDate, toDate
  )

  // Tập hợp ngày không khả dụng cho calendar UI
  const unavailableDates = buildUnavailableDates(existingBookings, config, fromDate, toDate)

  // 1. Kiểm tra ngày check-in có bị rơi vào ngày kín phòng / bảo trì không
  if (req.checkInDate && (unavailableDates.includes(req.checkInDate) || isManuallyBlocked(req.checkInDate, config))) {
    const nextAvailableDate = findNextAvailableDate(existingBookings, config, today)
    return {
      available: false,
      mode: "BOOKING_CALENDAR",
      unavailableDates,
      nextAvailableDate,
      errors: { checkInDate: "Ngày nhận phòng này phòng đã kín hoặc đang bảo trì" },
      message: "Ngày nhận phòng này đã có khách hoặc đang bảo trì",
    }
  }

  // 2. Nếu chưa chọn ngày hoặc thiếu ngày check-out
  if (!req.checkInDate || !req.checkOutDate) {
    return {
      available: null,
      mode: "BOOKING_CALENDAR",
      unavailableDates,
      message: !req.checkInDate
        ? "Vui lòng chọn ngày nhận phòng"
        : "Vui lòng chọn ngày trả phòng để kiểm tra",
    }
  }

  // 3. Kiểm tra ngày có bị block thủ công không
  const errors: Record<string, string> = {}
  if (isManuallyBlocked(req.checkInDate, config)) {
    errors.checkInDate = "Ngày này đã bị đóng cửa hoặc đang bảo trì"
  }

  // 4. Kiểm tra số đêm
  const nights = countNights(req.checkInDate, req.checkOutDate)
  const nightError = validateNights(nights, config)
  if (nightError) errors.nights = nightError

  // 5. Kiểm tra chồng lịch trong khoảng [checkInDate, checkOutDate)
  const newSpan = { checkInDate: req.checkInDate, checkOutDate: req.checkOutDate }
  const hasConflict = hasCalendarConflict(newSpan, existingBookings)
  if (hasConflict) {
    errors.checkInDate = `Phòng đã có khách trong khoảng ngày này`
  }

  const available = Object.keys(errors).length === 0

  // Tìm ngày gần nhất còn trống nếu không available
  const nextAvailableDate = available
    ? null
    : findNextAvailableDate(existingBookings, config, today)

  return {
    available,
    mode: "BOOKING_CALENDAR",
    unavailableDates,
    nextAvailableDate,
    errors: available ? undefined : errors,
    message: available
      ? `Phòng còn trống cho ${nights} đêm lưu trú`
      : errors.checkInDate || "Phòng đã được đặt trong khoảng ngày này",
  }
}

// ─── DAILY_CAPACITY (Hoa, F&B) ────────────────────────────────────────────────

async function checkDailyCapacity(
  req: AvailabilityCheckRequest,
  db: AvailabilityCheckRepository,
): Promise<AvailabilityCheckResult> {
  // Dùng lại fullSlotsOn() đã có — wrap vào interface mới
  const shopSettings = await db.findOrganizationSettings(req.organizationId)
  const fullSlots = await fullSlotsOn(req.organizationId, req.deliveryDate, shopSettings)
  const isFull = req.deliveryTimeSlot ? fullSlots.includes(req.deliveryTimeSlot) : false
  return {
    available: !isFull,
    mode: "DAILY_CAPACITY",
    fullSlots,
    message: isFull ? `Khung giờ ${req.deliveryTimeSlot ?? ""} đã kín đơn trong ngày này` : undefined,
  }
}

// ─── SCHEDULE_SLOTS (Dịch vụ) ─────────────────────────────────────────────────

async function checkScheduleSlots(
  req: AvailabilityCheckRequest,
  config: ScheduleSlotsConfig,
  db: AvailabilityCheckRepository,
): Promise<AvailabilityCheckResult> {
  if (!req.deliveryDate || !req.deliveryTimeSlot) {
    return { available: true, mode: "SCHEDULE_SLOTS" }
  }
  const slot = config.slots.find((s) => s.label === req.deliveryTimeSlot || s.id === req.deliveryTimeSlot)
  if (!slot) return { available: true, mode: "SCHEDULE_SLOTS" }

  // Đếm số đơn đã có trong ngày này
  const count = await db.countActiveOrdersOnDate(req.organizationId, req.deliveryDate)

  const available = count < slot.maxPerSlot
  return {
    available,
    mode: "SCHEDULE_SLOTS",
    message: available
      ? (slot.maxPerSlot - count <= 2 ? `Chỉ còn ${slot.maxPerSlot - count} slot` : undefined)
      : `Khung ${slot.label} đã đủ lịch hôm nay`,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Tạo mảng các ngày bị block để hiện trên calendar UI khách. */
function buildUnavailableDates(
  bookings: readonly { checkInDate: string; checkOutDate: string }[],
  config: BookingCalendarConfig,
  fromDate: string,
  toDate: string,
): string[] {
  const set = new Set<string>()
  // Ngày trong booking spans
  for (const b of bookings) {
    let cur = b.checkInDate
    while (cur < b.checkOutDate && cur <= toDate) {
      if (cur >= fromDate) set.add(cur)
      cur = addDays(cur, 1)
    }
  }
  // Admin manual blocks
  for (const d of config.manualBlockedDates ?? []) {
    if (d >= fromDate && d <= toDate) set.add(d)
  }
  return Array.from(set).sort()
}

/** Tìm ngày check-in gần nhất còn trống (dựa trên minNights). */
function findNextAvailableDate(
  bookings: readonly { checkInDate: string; checkOutDate: string }[],
  config: BookingCalendarConfig,
  fromDate: string,
): string | null {
  let candidate = addDays(fromDate, config.leadDays)
  for (let i = 0; i < LOOKUP_DAYS; i++) {
    const span = { checkInDate: candidate, checkOutDate: addDays(candidate, config.minNights) }
    if (!hasCalendarConflict(span, bookings) && !isManuallyBlocked(candidate, config)) {
      return candidate
    }
    candidate = addDays(candidate, 1)
  }
  return null
}

/** Kiểm tra khả dụng sản phẩm từ link public catalog (an toàn đa tenant qua catalogId). */
export async function checkPublicCatalogProductAvailability(
  catalogId: string,
  req: Omit<AvailabilityCheckRequest, "organizationId">,
  repo = new GreetingCardRepository(),
): Promise<AvailabilityCheckResult> {
  const catalog = await repo.getPublicCatalogById(catalogId)
  if (!catalog) throw notFound()

  const item = catalog.items.find((i) => i.product.id === req.productId)
  if (!item) throw notFound()

  const orgSettings = (catalog.organization.settings as Record<string, unknown>) ?? {}
  const orgIndustry = typeof orgSettings.industry === "string" ? orgSettings.industry : null
  // Ngành luôn theo tiệm — client gửi ngành khác từng đổi được chế độ khả dụng mặc định (rà soát cụm E)
  const industryKey = orgIndustry

  return checkProductAvailability({
    ...req,
    organizationId: catalog.organization.id,
    industryKey,
  })
}

/** Kiểm tra khả dụng sản phẩm từ link chào gửi khách /b/[sendCode]. */
export async function checkPublicBrochureProductAvailability(
  sendCode: string,
  req: Omit<AvailabilityCheckRequest, "organizationId">,
  repo = new GreetingCardRepository(),
): Promise<AvailabilityCheckResult> {
  const session = await loadPublicSession(sendCode, repo)
  const orgSettings = (session.organization?.settings as Record<string, unknown>) ?? {}
  const orgIndustry = typeof orgSettings.industry === "string" ? orgSettings.industry : null
  // Ngành luôn theo tiệm — client gửi ngành khác từng đổi được chế độ khả dụng mặc định (rà soát cụm E)
  const industryKey = orgIndustry

  return checkProductAvailability({
    ...req,
    organizationId: session.organization_id,
    industryKey,
  })
}

