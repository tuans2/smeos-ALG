import type { RecipeFlower } from "./recipe-snapshot"
import type { AddressParts } from "./delivery-address"

/**
 * Domain Types for Greeting Card / Swipe Brochure Module (Thẻ Chào / Brochure).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */

export type GreetingCatalogType = "STANDARD" | "CLIENT"

export type GreetingSessionStatus =
  | "CREATED"
  | "OPENED"
  | "BROWSING"
  | "SELECTED"
  | "ORDER_SUBMITTED"
  | "PAYMENT_REPORTED"
  | "COMPLETED"

export type GreetingJourneyEventType =
  | "OPEN"
  | "SWIPE_NEXT"
  | "SWIPE_PREV"
  | "SELECT_PRODUCT"
  | "OPEN_ORDER_FORM"
  | "SUBMIT_ORDER"
  | "CLICK_PAID"
  | "TRACK_VIEW"
  | "ADMIN_CONFIRMED_PAYMENT"
  | "INTERNAL_NOTE"

export interface ProductSnapshot {
  id: string
  code: string
  name: string
  price: number
  imageUrl: string | null
  driveLink?: string | null | undefined
  description?: string | null | undefined
  flowersSummary?: string | null | undefined
  /** Công thức của mẫu lúc chốt — phiếu thợ và đề xuất thay hoa đọc (`recipe-snapshot.ts`) */
  flowers?: RecipeFlower[] | undefined
  selectedAt: string
}

export interface GreetingCatalogProduct {
  id: string
  code: string
  name: string
  /** `null` = chưa có giá trong Product Master → hiển thị "Liên hệ"; vẫn đặt được, cửa hàng báo giá sau. */
  price: number | null
  imageUrl: string | null
  /** Link Google Drive (attributes.drive_link) — fallback khi chưa có ảnh lưu trữ. */
  driveLink?: string | null | undefined
  description?: string | null | undefined
  meaning?: string | null | undefined
  occasion?: string | null | undefined
  style?: string | null | undefined
  /** Kiểu dáng tính phí chế tác (`attributes.craftStyle`, PO Q8) — chỉ dùng tính giá ngày lễ */
  craftStyle?: string | null | undefined
  flowersSummary?: string | null | undefined
  /** Công thức có cấu trúc (nội bộ, không trả cho trang khách) — chép vào ảnh chụp mẫu của đơn */
  recipe?: RecipeFlower[] | undefined
  /** Loại sản phẩm (bó, giỏ, kệ…) — từ Master Index */
  category?: string | null | undefined
  /** Màu chủ đạo — từ Master Index */
  color?: string | null | undefined
  /** Kích thước đã định dạng, ví dụ "Cao 60 cm · Rộng 40 cm" */
  dimensions?: string | null | undefined
  /** Kiểu gói lớp ngoài — từ Master Index */
  wrapStyle?: string | null | undefined
  sortOrder: number
  /** `false` = tạm hết hàng theo tồn kho chi nhánh — link riêng `/b` vẫn hiện kèm nhãn "Tạm hết", không đặt được. */
  available?: boolean | undefined
  /** Các size/biến thể bán online (đã có giá); rỗng = chỉ bán bản gốc. */
  variants?:
    | Array<{
        id: string
        name: string
        priceVnd: number
        peakPriceVnd?: number | null | undefined
        /** Kiểu "Khoảng giá": giá trị theo từng nhóm đặc điểm và ảnh riêng */
        values?: string[] | undefined
        imageUrl?: string | null | undefined
      }>
    | undefined
  /** Kiểu "Khoảng giá": các nhóm đặc điểm để khách chọn lần lượt */
  priceDimensions?: Array<{ label: string; values: string[] }> | undefined
  /** Kiểu giá (`products.attributes.pricing`); thiếu = FIXED. CONTACT = chỉ liên hệ, không đặt online. */
  priceMode?: "FIXED" | "RANGE" | "CONTACT" | undefined
  /** Giá cao nhất (kể cả cao điểm) — hiển thị "Từ … đến …" */
  priceMaxVnd?: number | null | undefined
  /** FIXED: giá ngày cao điểm; `null` = như giá thường */
  peakPriceVnd?: number | null | undefined
  /** Thứ 7, Chủ nhật tính cao điểm */
  weekendIsPeak?: boolean | undefined
  /** Tiệm tắt hiển thị giá (ALG 5.5): khách thấy "Liên hệ báo giá", đơn chờ cửa hàng báo giá */
  priceHidden?: boolean | undefined
}

export interface GreetingCatalogRecord {
  id: string
  organizationId: string
  code: string
  name: string
  type: GreetingCatalogType
  description?: string | null | undefined
  filters?: Record<string, unknown> | null | undefined
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  itemsCount?: number | undefined
}

export interface GreetingSessionRecord {
  id: string
  organizationId: string
  catalogId: string
  sendCode: string
  saleId: string
  customerName?: string | null | undefined
  customerPhone?: string | null | undefined
  status: GreetingSessionStatus
  selectedProductId?: string | null | undefined
  productSnapshot?: ProductSnapshot | null | undefined
  orderId?: string | null | undefined
  openedAt?: Date | null | undefined
  selectedAt?: Date | null | undefined
  lastActiveAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CustomerOrderSubmitInput {
  customerName: string
  customerPhone: string
  customerEmail?: string | undefined
  recipientName: string
  recipientPhone: string
  deliveryDate: string // YYYY-MM-DD
  checkOutDate?: string | undefined // YYYY-MM-DD (cho Homestay / BOOKING_CALENDAR)
  deliveryTimeSlot?: string | undefined
  deliveryAddress: string
  /** Địa chỉ tách 5 ô (form mới); `deliveryAddress` là dòng ghép đầy đủ để tương thích */
  addressParts?: AddressParts | undefined
  cardMessage?: string | undefined
  /** Ghi chú cho cửa hàng / thợ cắm hoa */
  senderNote?: string | undefined
  /** Ghi chú cho người giao hoa (gọi trước, gửi bảo vệ…) */
  deliveryNote?: string | undefined
  /** Link chia sẻ vị trí từ Google Maps (không bắt buộc) */
  mapUrl?: string | undefined
  /** Lựa chọn mua — server tính lại giá từ các lựa chọn này, không nhận giá từ client. */
  variantId?: string | undefined
  quantity?: number | undefined
  shippingZoneId?: string | undefined
  voucherCode?: string | undefined
  /** Mã thanh toán (DC30…) — đổi cách thu tiền, không giảm giá. */
  paymentCode?: string | undefined
  /** Ưu đãi khách chọn (01 ưu đãi theo spec #2) */
  selectedPromotionId?: string | undefined
  /** Khách xác nhận thỏa thuận & cam kết (spec #2, #5) */
  confirmedTerms?: boolean | undefined
  /** Ô bẫy ẩn chống máy tự điền — người thật luôn để trống. */
  website?: string | undefined
}

export interface BrochureOrderSummary {
  orderId: string
  orderCode: string
  sendCode: string
  customerName: string
  customerPhone: string
  recipientName: string
  deliveryDate: string
  deliveryAddress: string
  productSnapshot: ProductSnapshot
  totalVnd: number
  paidVnd: number
  balanceVnd: number
  status: string
  productionStatus: string
  deliveryStatus: string
  paymentReportedAt?: string | null | undefined
  finishedImageUrl?: string | null | undefined
  createdAt: string
}

/** Thông tin chuyển khoản hiển thị cho khách — luôn dựng ở server từ cài đặt của tiệm. */
export interface BrochurePaymentInstructions {
  /** FULL = trả đủ; DEPOSIT = đặt cọc theo chính sách tiệm; BALANCE = thu phần còn lại. */
  purpose: "FULL" | "DEPOSIT" | "BALANCE"
  /** Tổng giá trị đơn (để hiển thị "cọc X / tổng Y"). */
  orderTotalVnd: number
  qrUrl: string
  bankName: string
  accountNo: string
  accountName: string
  amount: number
  transferMemo: string
  /** Hạn giữ đơn chờ chuyển khoản (ISO) — trang khách hiện đếm ngược; null = không giữ hạn. */
  holdUntil?: string | null
  /** Hết `holdUntil` mà chưa nhận tiền, khách chưa báo đã chuyển → thanh toán thất bại, đơn tự huỷ. */
  cancelOnExpiry?: boolean
}

/** Phần phiên trả ra trang công khai — KHÔNG chứa SĐT khách, id tổ chức, id sale. */
export interface PublicBrochureSessionView {
  sendCode: string
  status: GreetingSessionStatus
  customerName: string | null
  selectedProductId: string | null
  productSnapshot: ProductSnapshot | null
}
