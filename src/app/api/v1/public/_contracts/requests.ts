import { z } from "zod"

import { LEAD_MESSAGE_MAX, LEAD_NAME_MAX } from "@/modules/acquisition/domain/lead-rules"
import { INQUIRY_MESSAGE_MAX, INQUIRY_NAME_MAX } from "@/modules/crm/domain/product-inquiry"
import { publicOrderBodySchema, publicQuoteBodySchema } from "@/modules/greeting-card/contracts/public-order-schema"
import { CATALOG_EVENT_TYPES } from "@/modules/greeting-card/domain/catalog-channel"
import { CUSTOMER_JOURNEY_EVENTS } from "@/modules/greeting-card/domain/customer-journey-events"
import { ADDRESS_PART_MAX } from "@/modules/greeting-card/domain/delivery-address"
import { DELIVERY_NOTE_MAX, MAP_URL_MAX } from "@/modules/greeting-card/domain/delivery-note"
import { FLOWER_NOTE_MAX } from "@/modules/greeting-card/domain/flower-substitute"
import { ORDER_FIELD_MAX } from "@/modules/greeting-card/domain/greeting-card-rules"
import { CHANGE_NOTE_MAX } from "@/modules/greeting-card/domain/order-change-request"
import { SUBSTITUTE_NOTE_MAX } from "@/modules/greeting-card/domain/substitute-proposal"

/**
 * Lược đồ thân/query của route `/api/v1/public/*` — nguồn duy nhất cho route lẫn OpenAPI
 * (`public-openapi.ts`, audit API đợt 6, PO 07/11/2026). Chuyển NGUYÊN VĂN từ route, không đổi luật kiểm.
 * Trang khách Thẻ chào dùng khoá camelCase (`productId`, `phoneLast4`…) — hợp đồng cũ, giữ nguyên.
 */

// ── Tiện ích & webhook ────────────────────────────────────────────────────────────────────────
/** Báo cáo vi phạm CSP do trình duyệt gửi (`application/csp-report`) — chỉ đọc vài trường để ghi log. */
export const cspReportBody = z.object({ "csp-report": z.record(z.string(), z.unknown()).optional() })

export const driveFolderQuery = z.object({ folder_id: z.string() })
export const driveThumbProxyQuery = z.object({ folder_id: z.string().optional(), file_id: z.string().optional() })

/** Hình dạng webhook SePay (https://docs.sepay.vn) — chỉ giữ trường cần cho đối soát. */
export const sepayWebhookBody = z.object({
  id: z.union([z.number().int(), z.string().min(1).max(64)]),
  transferType: z.string().max(10),
  transferAmount: z.number().nonnegative().max(100_000_000_000),
  content: z.string().max(2000).default(""),
  accountNumber: z.string().max(40).nullish(),
  transactionDate: z.string().max(40).nullish(),
  referenceCode: z.string().max(100).nullish(),
})

/** Sự kiện OA Zalo (chỉ các trường SMEOS đọc) — thân thô ≤ 64 KB, ký bằng `X-ZEvent-Signature`. */
export const zaloOaEventBody = z.looseObject({
  app_id: z.string(),
  event_name: z.string(),
  timestamp: z.string(),
  sender: z.object({ id: z.string() }).optional(),
  message: z.object({ text: z.string().optional() }).optional(),
})

// ── Catalog công khai — BẢN SAO lược đồ của route đóng băng (`catalog-freeze.test.ts`) ──────────────
// Route không đổi; `tests/unit/public/public-catalog-contract.test.ts` gửi cùng bộ mẫu tới route thật và
// tới bản sao để giữ hai bên khớp.
const utmField = z.string().max(100).optional()
export const catalogLeadBody = z.object({
  name: z.string().max(LEAD_NAME_MAX * 2),
  phone: z.string().max(20),
  message: z.string().max(LEAD_MESSAGE_MAX * 2).optional(),
  consent: z.boolean(),
  ref: z.string().max(20).optional(),
  utm: z.object({ source: utmField, medium: utmField, campaign: utmField }).optional(),
  verificationToken: z.string().max(4096).optional(),
  /** Ô bẫy máy tự điền — có giá trị → 400 */
  website: z.string().max(200).optional(),
})

export const catalogOrderBody = z.object({
  productId: z.string().max(64),
  quantity: z.number().int(),
  name: z.string().max(200),
  phone: z.string().max(20),
  address: z.string().max(600),
  deliveryDate: z.string().max(10).optional(),
  timeSlot: z.string().max(40).optional(),
  note: z.string().max(1000).optional(),
  verificationToken: z.string().max(4096).optional(),
  /** Ô bẫy máy tự điền — có giá trị → 400 */
  website: z.string().max(200).optional(),
})

// ── Thẻ chào — chuyển nguyên văn từ route (B5: có test khoá hành vi `tests/tenant/public-contract-greeting-*.test.ts`) ──
// brochure/[sendCode]/select/route.ts
export const brochureSelectBody = z.object({ productId: z.string().min(1).max(64) })

// brochure/[sendCode]/event/route.ts
export const brochureEventBody = z.object({
  event: z.enum(CUSTOMER_JOURNEY_EVENTS),
  productId: z.string().min(1).max(64).optional(),
})

// brochure/[sendCode]/unlock/route.ts
export const brochureUnlockBody = z.object({ phoneLast4: z.string().regex(/^\d{4}$/) })

// brochure/[sendCode]/check-availability/route.ts
export const brochureAvailabilityBody = z.object({
  productId: z.string().min(1).max(64),
  industryKey: z.string().max(64).optional().nullable(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  deliveryTimeSlot: z.string().max(64).optional(),
  variantId: z.string().max(64).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
})

// brochure/[sendCode]/inquiry/route.ts
export const brochureInquiryBody = z.object({
  productId: z.string().min(1).max(64),
  customerName: z.string().max(INQUIRY_NAME_MAX * 2),
  customerPhone: z.string().max(20),
  message: z.string().max(INQUIRY_MESSAGE_MAX * 2),
  variantName: z.string().max(120).optional(),
  /** Ô bẫy máy tự điền */
  website: z.string().max(200).optional(),
})

// brochure/tracking/[code]/route.ts
export const trackingVerifyBody = z.object({ phoneLast4: z.string().regex(/^\d{4}$/, "Nhập đúng 4 số cuối") })

// brochure/tracking/[code]/change-request/route.ts
const changeRequestAddressPart = z.string().max(ADDRESS_PART_MAX)
export const changeRequestBody = z.object({
  /** Khách mở trang không từ link của đơn → chứng minh bằng 4 số cuối SĐT người đặt. */
  phoneLast4: z.string().regex(/^\d{4}$/).optional(),
  deliveryDate: z.string().max(10).optional(),
  deliveryTimeSlot: z.string().max(ORDER_FIELD_MAX.timeSlot).optional(),
  recipientName: z.string().max(ORDER_FIELD_MAX.name).optional(),
  recipientPhone: z.string().max(20).optional(),
  addressParts: z.object({ houseNumber: changeRequestAddressPart, street: changeRequestAddressPart, ward: changeRequestAddressPart, district: changeRequestAddressPart.optional(), province: changeRequestAddressPart }).optional(),
  shippingZoneId: z.string().max(40).optional(),
  cardMessage: z.string().max(ORDER_FIELD_MAX.cardMessage).optional(),
  deliveryNote: z.string().max(DELIVERY_NOTE_MAX).optional(),
  mapUrl: z.string().max(MAP_URL_MAX).optional(),
  note: z.string().max(CHANGE_NOTE_MAX).optional(),
})

// brochure/tracking/[code]/flower-substitute-response/route.ts
export const flowerSubstituteAnswerBody = z.object({
  /** Khách mở trang không từ link của đơn → chứng minh bằng 4 số cuối SĐT người đặt. */
  phoneLast4: z.string().regex(/^\d{4}$/).optional(),
  proposalId: z.string().uuid(),
  choice: z.enum(["ACCEPT", "DECLINE"]),
  note: z.string().max(FLOWER_NOTE_MAX).optional(),
})

// brochure/tracking/[code]/substitute-response/route.ts
export const substituteAnswerBody = z.object({
  /** Khách mở trang không từ link của đơn → chứng minh bằng 4 số cuối SĐT người đặt. */
  phoneLast4: z.string().regex(/^\d{4}$/).optional(),
  proposalId: z.string().uuid(),
  choice: z.enum(["OPTION", "SHOP_DECIDES", "CANCEL"]),
  productId: z.string().max(64).optional(),
  note: z.string().max(SUBSTITUTE_NOTE_MAX).optional(),
})

// greeting-catalog/[id]/check-availability/route.ts
export const greetingCatalogAvailabilityBody = z.object({
  productId: z.string().min(1).max(64),
  industryKey: z.string().max(64).optional().nullable(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày YYYY-MM-DD").optional(),
  deliveryTimeSlot: z.string().max(64).optional(),
  variantId: z.string().max(64).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
})

// greeting-catalog/[id]/event/route.ts
export const greetingCatalogEventBody = z.object({
  type: z.enum(CATALOG_EVENT_TYPES).exclude(["ORDER"]),
  channel: z.string().max(32).optional(),
  visitorId: z.string().min(8).max(64),
  /** Bắt buộc với LIKE/UNLIKE — mẫu được thả/bỏ tim */
  productId: z.string().min(1).max(64).optional(),
}).refine((b) => (b.type === "LIKE" || b.type === "UNLIKE" ? Boolean(b.productId) : true), { path: ["productId"] })

// greeting-catalog/[id]/inquiry/route.ts
export const greetingCatalogInquiryBody = z.object({
  productId: z.string().min(1).max(64),
  customerName: z.string().max(INQUIRY_NAME_MAX * 2),
  customerPhone: z.string().max(20),
  message: z.string().max(INQUIRY_MESSAGE_MAX * 2),
  variantName: z.string().max(120).optional(),
  /** Ô bẫy máy tự điền */
  website: z.string().max(200).optional(),
})

// greeting-catalog/[id]/order/route.ts
export const greetingCatalogOrderBody = publicOrderBodySchema.extend({
  productId: z.string().min(1).max(64),
  tracking: z.object({ channel: z.string().max(32).optional(), visitorId: z.string().min(8).max(64) }).optional(),
})

// greeting-catalog/[id]/quote/route.ts
export const greetingCatalogQuoteBody = publicQuoteBodySchema.extend({ productId: z.string().min(1).max(64) })

// ── Thẻ chào — thân không kiểm bằng zod ở route (chỉ mô tả cho OpenAPI) ─────────────────────────────
/** `payment-notify`: route đọc `proofAssetId` nếu có, không kiểm lược đồ. */
export const paymentNotifyBody = z.object({ proofAssetId: z.string().optional() })
/** `payment-proof` (multipart): `file` là ảnh chuyển khoản; `purpose` khác `BALANCE` tính là cọc. */
export const paymentProofForm = z.object({ file: z.file(), purpose: z.enum(["DEPOSIT", "BALANCE"]).optional() })
/** Trang theo dõi mở từ link riêng của đơn: `?link=<mã link>` + cookie chủ phiên → xem đủ thông tin. */
export const trackingLinkQuery = z.object({ link: z.string().optional() })

// ── Thẻ Gia Công — chuyển nguyên văn từ route (B5: `tests/tenant/public-contract-subcontract.test.ts`) ──
const VIETNAM_PHONE_RE = /^(0|\+84)(3[2-9]|5[6-9]|7[0689]|8[1-9]|9[0-9])\d{7}$/

// subcontract/[orderCode]/route.ts
export const subcontractActionBody = z.object({
  action: z.enum(["CLAIM", "CANCEL", "COMMIT", "DELETE_QC"]),
  branchId: z.string().min(1),
  photoUrl: z.string().optional(),
})

// subcontract/[orderCode]/request-bypass/route.ts
export const subcontractBypassBody = z.object({
  branchId: z.string().min(1),
  step: z.enum(["QC", "SHIPPER", "POD"]),
  reason: z.string().trim().min(5, "Lý do xin bỏ qua tối thiểu 5 ký tự").max(300),
})

// subcontract/[orderCode]/submit-shipper/route.ts
export const subcontractShipperBody = z.object({
  branchId: z.string().trim().min(1, "Thiếu mã chi nhánh"),
  shipperName: z.string().trim().min(2, "Tên shipper tối thiểu 2 ký tự").max(80),
  shipperPhone: z
    .string()
    .trim()
    .regex(VIETNAM_PHONE_RE, "Số điện thoại không hợp lệ (vd: 0912345678)"),
  shipperNote: z.string().trim().max(200).optional(),
})

/** `GET`: mã chi nhánh được mời + token ký (`t`, hoặc header `x-subcontract-token`). */
export const subcontractViewQuery = z.object({ branch: z.string(), t: z.string().optional() })
/** `upload-qc` (multipart): ảnh thành phẩm JPG/PNG/WebP ≤ 10 MB, AI đối chiếu với ảnh mẫu trước khi lưu. */
export const subcontractQcForm = z.object({ file: z.file(), branchId: z.string() })
/** `submit-delivery` (multipart): ảnh giao hàng ≤ 10 MB + ghi chú. */
export const subcontractDeliveryForm = z.object({ file: z.file(), branchId: z.string(), note: z.string().optional() })
