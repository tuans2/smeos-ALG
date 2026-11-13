/**
 * Khách xin đổi thông tin đơn Thẻ chào sau khi đặt (PO 08/10/2026): ngày/giờ giao, người nhận,
 * địa chỉ (+ khu vực giao), lời nhắn thiệp, ghi chú cho người giao, link bản đồ.
 * Luồng: khách gửi trên trang theo dõi → nhân viên (R3) duyệt/từ chối → đơn cập nhật + lịch sử.
 * - KHOÁ từ lúc bắt đầu cắm hoa (PO chốt) — sau đó khách gọi cửa hàng.
 * - Đổi khu vực giao: phí TĂNG thì cộng phần chênh vào tổng; phí GIẢM thì giữ nguyên tổng (PO chốt).
 * Pure TypeScript.
 */
import { isValidVnPhone, normalizePhone, ORDER_FIELD_MAX, validateDeliveryDate } from "./greeting-card-rules"
import { composeAddress, validateAddressParts, type AddressParts } from "./delivery-address"
import { deliveryNoteErrors, normalizeMapUrl } from "./delivery-note"
import { deliveryScheduleError } from "./delivery-schedule"
import type { ShippingConfig } from "./brochure-pricing"
import { holidayOn, scheduleForDate, type HolidayDay } from "./holiday-policy"

export const CHANGE_NOTE_MAX = 500
export type ChangeStatus = "PENDING" | "APPROVED" | "REJECTED"

/** Thông tin đổi được — cũng là ảnh chụp "trước" / "sau" lưu cùng yêu cầu. */
export interface OrderChangeSnapshot {
  deliveryDate: string
  deliveryTimeSlot: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  addressParts: AddressParts | null
  shippingZoneId: string | null
  shippingZoneName: string | null
  cardMessage: string
  deliveryNote: string
  mapUrl: string
}

export type ChangeField = "schedule" | "recipientName" | "recipientPhone" | "deliveryAddress" | "shippingZone" | "cardMessage" | "deliveryNote" | "mapUrl"

export const CHANGE_FIELD_LABEL: Record<ChangeField, string> = {
  schedule: "Ngày giờ giao",
  recipientName: "Tên người nhận",
  recipientPhone: "SĐT người nhận",
  deliveryAddress: "Địa chỉ giao",
  shippingZone: "Khu vực giao",
  cardMessage: "Lời nhắn thiệp",
  deliveryNote: "Ghi chú cho người giao",
  mapUrl: "Link bản đồ",
}

export interface ChangeItem {
  field: ChangeField
  label: string
  before: string
  after: string
}

/** Khách chỉ gửi ô muốn đổi; ô không gửi giữ nguyên. */
export interface OrderChangeInput {
  deliveryDate?: string | undefined
  deliveryTimeSlot?: string | undefined
  recipientName?: string | undefined
  recipientPhone?: string | undefined
  addressParts?: AddressParts | undefined
  shippingZoneId?: string | undefined
  cardMessage?: string | undefined
  deliveryNote?: string | undefined
  mapUrl?: string | undefined
  /** Lời nhắn thêm cho cửa hàng về yêu cầu này */
  note?: string | undefined
}

export interface OrderChangePayload {
  status: ChangeStatus
  before: OrderChangeSnapshot
  after: OrderChangeSnapshot
  changes: ChangeItem[]
  note: string | null
  requestedAt: string
  decidedBy?: string | undefined
  decidedAt?: string | undefined
  decisionNote?: string | undefined
  /** Phí giao dự kiến cộng thêm, tính lúc khách gửi (để nhân viên và khách thấy trước). */
  expectedFeeDeltaVnd?: number | undefined
  /** Phần phí giao cộng thêm thật khi duyệt (0 nếu phí giảm/không đổi). */
  feeDeltaVnd?: number | undefined
}

/** Lý do không cho đổi (tiếng Việt), hoặc `null` nếu còn đổi được. */
export function changeLockReason(o: { status: string; productionStatus: string; deliveryStatus: string }): string | null {
  if (o.status === "CANCELLED") return "Đơn hàng đã huỷ"
  if (o.status === "COMPLETED" || o.deliveryStatus === "DELIVERED") return "Đơn hàng đã giao xong"
  // Giao không thành công: khách được hẹn lại giờ/địa chỉ dù hoa đã cắm xong (trừ lời nhắn thiệp — xem `cardMessageLocked`)
  if (o.deliveryStatus === "FAILED") return null
  if (o.deliveryStatus === "DISPATCHED" || o.deliveryStatus === "DELIVERING" || (o.productionStatus !== "WAITING" && o.productionStatus !== "ASSIGNED")) {
    return "Cửa hàng đã bắt đầu chế tác nên không đổi thông tin trên trang được nữa. Vui lòng gọi cửa hàng để được hỗ trợ."
  }
  return null
}

/** Thiệp in kèm hoa từ lúc bắt đầu cắm — sau đó không đổi lời nhắn được nữa (kể cả khi hẹn giao lại). */
export function cardMessageLocked(o: { productionStatus: string }): boolean {
  return o.productionStatus !== "WAITING" && o.productionStatus !== "ASSIGNED"
}

const show = (s: string, empty = "(trống)") => (s.trim() ? s.trim() : empty)
const scheduleText = (s: OrderChangeSnapshot) => `${s.deliveryDate} · ${s.deliveryTimeSlot || "Trong ngày"}`

/** Danh sách thay đổi giữa hai ảnh chụp (bỏ ô không đổi). */
export function diffSnapshots(before: OrderChangeSnapshot, after: OrderChangeSnapshot): ChangeItem[] {
  const out: ChangeItem[] = []
  const add = (field: ChangeField, b: string, a: string) => {
    if (b !== a) out.push({ field, label: CHANGE_FIELD_LABEL[field], before: b, after: a })
  }
  add("schedule", scheduleText(before), scheduleText(after))
  add("recipientName", before.recipientName, after.recipientName)
  add("recipientPhone", before.recipientPhone, after.recipientPhone)
  add("deliveryAddress", before.deliveryAddress, after.deliveryAddress)
  if ((before.shippingZoneId ?? "") !== (after.shippingZoneId ?? "")) {
    out.push({ field: "shippingZone", label: CHANGE_FIELD_LABEL.shippingZone, before: show(before.shippingZoneName ?? ""), after: show(after.shippingZoneName ?? "") })
  }
  add("cardMessage", show(before.cardMessage), show(after.cardMessage))
  add("deliveryNote", show(before.deliveryNote), show(after.deliveryNote))
  if (before.mapUrl !== after.mapUrl) out.push({ field: "mapUrl", label: CHANGE_FIELD_LABEL.mapUrl, before: before.mapUrl ? "Đã có link" : "(trống)", after: after.mapUrl ? "Link mới" : "(bỏ link)" })
  return out
}

export type ChangeBuildResult =
  | { ok: true; after: OrderChangeSnapshot; changes: ChangeItem[]; note: string | null }
  | { ok: false; errors: Record<string, string> }

/** Kiểm tra + dựng ảnh chụp "sau" từ yêu cầu của khách. Cùng luật với form đặt hoa. */
export function buildOrderChange(
  before: OrderChangeSnapshot,
  input: OrderChangeInput,
  shipping: ShippingConfig,
  now: Date = new Date(),
  options: { cardLocked?: boolean | undefined; holidays?: readonly HolidayDay[] | undefined } = {},
): ChangeBuildResult {
  const errors: Record<string, string> = {}
  const after: OrderChangeSnapshot = { ...before }

  if (input.deliveryDate !== undefined || input.deliveryTimeSlot !== undefined) {
    after.deliveryDate = (input.deliveryDate ?? before.deliveryDate).trim()
    after.deliveryTimeSlot = (input.deliveryTimeSlot ?? before.deliveryTimeSlot).trim()
    if (after.deliveryDate !== before.deliveryDate || after.deliveryTimeSlot !== before.deliveryTimeSlot) {
      const err = validateDeliveryDate(after.deliveryDate, now)
        ?? (after.deliveryTimeSlot
          ? deliveryScheduleError(after.deliveryDate, after.deliveryTimeSlot, scheduleForDate(shipping, holidayOn(after.deliveryDate, options.holidays ?? [])), now)
          : "Vui lòng chọn khung giờ giao hoa")
      if (err) errors.deliveryDate = err
    }
  }
  if (input.recipientName !== undefined) {
    after.recipientName = input.recipientName.trim()
    if (!after.recipientName) errors.recipientName = "Vui lòng nhập họ tên người nhận hoa"
    else if (after.recipientName.length > ORDER_FIELD_MAX.name) errors.recipientName = `Họ tên tối đa ${ORDER_FIELD_MAX.name} ký tự`
  }
  if (input.recipientPhone !== undefined) {
    after.recipientPhone = normalizePhone(input.recipientPhone)
    if (!isValidVnPhone(after.recipientPhone)) errors.recipientPhone = "Số điện thoại người nhận không hợp lệ (10 số)"
  }
  if (input.addressParts) {
    Object.assign(errors, validateAddressParts(input.addressParts))
    const composed = composeAddress(input.addressParts)
    if (composed !== before.deliveryAddress) {
      after.deliveryAddress = composed
      after.addressParts = { ...input.addressParts }
    }
  }
  if (input.shippingZoneId !== undefined && input.shippingZoneId !== (before.shippingZoneId ?? "")) {
    const zone = shipping.zones.find((z) => z.id === input.shippingZoneId)
    if (!zone) errors.shippingZoneId = "Khu vực giao không còn áp dụng. Vui lòng chọn lại."
    else {
      after.shippingZoneId = zone.id
      after.shippingZoneName = zone.name
    }
  }
  if (input.cardMessage !== undefined) {
    after.cardMessage = input.cardMessage.trim()
    if (after.cardMessage.length > ORDER_FIELD_MAX.cardMessage) errors.cardMessage = `Lời nhắn thiệp tối đa ${ORDER_FIELD_MAX.cardMessage} ký tự`
    else if (options.cardLocked && after.cardMessage !== before.cardMessage) errors.cardMessage = "Thiệp đã in kèm hoa nên không đổi lời nhắn được nữa"
  }
  Object.assign(errors, deliveryNoteErrors(input))
  if (input.deliveryNote !== undefined) after.deliveryNote = input.deliveryNote.trim()
  if (input.mapUrl !== undefined) after.mapUrl = normalizeMapUrl(input.mapUrl) ?? ""

  const note = input.note?.trim() || null
  if (note && note.length > CHANGE_NOTE_MAX) errors.note = `Lời nhắn tối đa ${CHANGE_NOTE_MAX} ký tự`
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const changes = diffSnapshots(before, after)
  if (changes.length === 0) return { ok: false, errors: { body: "Bạn chưa thay đổi thông tin nào" } }
  return { ok: true, after, changes, note }
}

/**
 * Phí giao cộng thêm khi đổi khu vực: chỉ phần TĂNG (phí giảm giữ nguyên tổng — PO chốt).
 * Đơn chờ báo giá (tổng 0) hoặc đơn đủ mức miễn phí giao → 0.
 */
export function shippingFeeDelta(
  quote: {
    awaitingQuote?: boolean | undefined; subtotalVnd?: number | undefined; discountVnd?: number | undefined; shippingFeeVnd?: number | undefined
    /** Đơn dùng ưu đãi "Miễn phí giao hoa" */
    waivesShipping?: boolean | undefined
  },
  newZoneFeeVnd: number | null,
  shipping: Pick<ShippingConfig, "freeShippingOverVnd" | "freeShippingAll">,
): number {
  if (quote.awaitingQuote || newZoneFeeVnd === null || quote.waivesShipping || shipping.freeShippingAll === true) return 0
  const afterDiscount = (quote.subtotalVnd ?? 0) - (quote.discountVnd ?? 0)
  const free = shipping.freeShippingOverVnd !== null && afterDiscount >= shipping.freeShippingOverVnd
  const newFee = free ? 0 : newZoneFeeVnd
  return Math.max(0, newFee - (quote.shippingFeeVnd ?? 0))
}

type Loose = Record<string, unknown>
const rec = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const str = (v: unknown): string => (typeof v === "string" ? v : "")

/** Ảnh chụp thông tin đổi được từ các cột JSON của đơn (dữ liệu cũ thiếu ô → chuỗi rỗng). */
export function snapshotFromOrder(o: { delivery_window: unknown; delivery_address: unknown; card_message: string | null; pricing_rule_ref: unknown }): OrderChangeSnapshot {
  const win = rec(o.delivery_window)
  const addr = rec(o.delivery_address)
  const zone = rec(rec(o.pricing_rule_ref).shippingZone)
  const parts = rec(addr.parts)
  return {
    deliveryDate: str(win.date),
    deliveryTimeSlot: str(win.timeSlot),
    recipientName: str(addr.recipientName),
    recipientPhone: str(addr.phone),
    deliveryAddress: str(addr.street),
    addressParts: addr.parts
      ? { houseNumber: str(parts.houseNumber), street: str(parts.street), ward: str(parts.ward), province: str(parts.province), ...(str(parts.district) ? { district: str(parts.district) } : {}) }
      : null,
    shippingZoneId: str(zone.id) || null,
    shippingZoneName: str(zone.name) || str(addr.zone) || null,
    cardMessage: o.card_message ?? "",
    deliveryNote: str(addr.notes),
    mapUrl: str(addr.mapUrl),
  }
}

/** Ghi ảnh chụp "sau" ngược vào các cột của đơn (giữ nguyên khoá khác trong `delivery_address`). */
export function orderColumnsFromSnapshot(currentAddress: unknown, s: OrderChangeSnapshot, currentWindow?: unknown) {
  const rest = { ...rec(currentAddress) }
  for (const key of ["notes", "mapUrl", "parts", "zone"]) delete rest[key]
  return {
    // Giữ khoá khác của `delivery_window` (vd. `failures` — các lần giao không thành công)
    delivery_window: { ...rec(currentWindow), date: s.deliveryDate, timeSlot: s.deliveryTimeSlot },
    delivery_address: {
      ...rest,
      recipientName: s.recipientName,
      phone: s.recipientPhone,
      street: s.deliveryAddress,
      ...(s.addressParts ? { parts: { ...s.addressParts } } : {}),
      ...(s.shippingZoneName ? { zone: s.shippingZoneName } : {}),
      ...(s.deliveryNote ? { notes: s.deliveryNote } : {}),
      ...(s.mapUrl ? { mapUrl: s.mapUrl } : {}),
    },
    card_message: s.cardMessage || null,
  }
}

/** Bản cho trang theo dõi công khai: SĐT chỉ còn 3 số cuối (trang theo dõi không trả SĐT). */
export function changesForCustomer(changes: ChangeItem[]): ChangeItem[] {
  const mask = (p: string) => (p.replace(/\D/g, "").length >= 3 ? `••• ${p.replace(/\D/g, "").slice(-3)}` : "•••")
  return changes.map((c) => (c.field === "recipientPhone" ? { ...c, before: mask(c.before), after: mask(c.after) } : c))
}

/** Phụ phí ngày lễ cộng thêm khi khách dời ngày giao: chỉ phần TĂNG so với phụ phí đã tính (giảm thì giữ nguyên tổng). */
export function holidaySurchargeDelta(pricingRef: unknown, newSurchargeVnd: number): number {
  const prev = rec(pricingRef).holidaySurchargeVnd
  return Math.max(0, newSurchargeVnd - (typeof prev === "number" && prev > 0 ? prev : 0))
}

/** Phần báo giá đã lưu của đơn (`pricing_rule_ref`) dùng để tính phí giao chênh khi đổi khu vực. */
export function quoteFactsOf(pricingRef: unknown) {
  const ref = rec(pricingRef)
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)
  return {
    awaitingQuote: ref.awaitingQuote === true,
    subtotalVnd: n(ref.subtotalVnd),
    discountVnd: n(ref.discountVnd),
    shippingFeeVnd: n(ref.shippingFeeVnd),
    waivesShipping: rec(rec(ref.policies).promotion).kind === "FREE_SHIPPING",
  }
}
