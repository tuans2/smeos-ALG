import { publicOrderBodySchema, publicQuoteBodySchema } from "@/modules/greeting-card/contracts/public-order-schema"
import type { OpenApiOperation, OpenApiResponse } from "@/core/http/openapi"

import * as req from "./requests"
import * as res from "./responses-greeting"

/**
 * Operation Thẻ chào công khai (audit API đợt 6): phiên khách `/public/brochure/{sendCode}/*`, theo dõi đơn
 * `/public/brochure/tracking/{code}/*`, catalog Thẻ chào `/public/greeting-catalog/{id}/*`. Phiên khách gác bằng
 * cookie chủ phiên `fl_b_{sendCode}` (cấp ở `claim`/`unlock`): người khác → 404, không lộ phiên tồn tại.
 */
type Op = Omit<OpenApiOperation, "tags" | "responses"> & { ok: [number, OpenApiResponse] }
const op = (tag: string, o: Op): OpenApiOperation => {
  const { ok, ...rest } = o
  return { ...rest, tags: [tag], responses: { [ok[0]]: ok[1] } }
}
const SESSION = "Thẻ chào — phiên khách"
const TRACKING = "Thẻ chào — theo dõi đơn"
const CATALOG = "Thẻ chào — catalog"
const OWNER = ["brochureOwner"]
const ownerOrPhone = "Người xem là chủ link (`?link=` + cookie chủ phiên) hoặc gửi `phoneLast4` (4 số cuối SĐT người đặt; 5 lần/15 phút/IP, 10 lần/ngày/mã)."

const S = (path: string) => `/public/brochure/{sendCode}${path}`
const T = (path: string) => `/public/brochure/tracking/{code}${path}`
const C = (path: string) => `/public/greeting-catalog/{id}${path}`

export const GREETING_OPERATIONS: OpenApiOperation[] = [
  op(SESSION, { method: "post", path: S("/claim"), operationId: "brochureClaim", summary: "Nhận phiên — trình duyệt đầu tiên mở link thành chủ phiên",
    description: "Đặt cookie chủ phiên. Phiên đã có chủ khác → 404. 30 lần/phút/IP.", security: [], ok: [200, { description: "Đã nhận phiên", schema: res.brochureClaimResponse }], errors: [404, 429] }),
  op(SESSION, { method: "get", path: S(""), operationId: "brochureView", summary: "Xem bộ sưu tập, tiệm, mẫu đã chọn, đơn và hướng dẫn chuyển khoản",
    description: "Link hết hạn/đóng/không có → 404. 120 lần/phút/IP.", security: OWNER, ok: [200, { description: "Trang khách", schema: res.brochureViewResponse }], errors: [404, 429] }),
  op(SESSION, { method: "post", path: S("/open"), operationId: "brochureOpen", summary: "Ghi nhận khách đã mở link", description: "30 lần/phút/IP.",
    security: OWNER, ok: [200, { description: "`opened: true` khi đây là lần mở đầu", schema: res.brochureOpenResponse }], errors: [404, 429] }),
  op(SESSION, { method: "post", path: S("/event"), operationId: "brochureEvent", summary: "Ghi sự kiện hành trình khách (xem, thả tim, bỏ qua mẫu…)",
    description: "240 lần/10 phút/IP.", security: OWNER, body: req.brochureEventBody, ok: [200, { description: "Đã ghi", schema: res.brochureEventResponse }], errors: [400, 404, 413, 429] }),
  op(SESSION, { method: "post", path: S("/select"), operationId: "brochureSelect", summary: "Chọn mẫu", description: "30 lần/phút/IP.",
    security: OWNER, body: req.brochureSelectBody, ok: [200, { description: "Ảnh chụp mẫu đã chọn", schema: res.brochureSelectResponse }], errors: [400, 404, 409, 413, 429] }),
  op(SESSION, { method: "post", path: S("/check-availability"), operationId: "brochureCheckAvailability", summary: "Kiểm còn hàng / còn chỗ theo ngày",
    description: "120 lần/phút/IP.", security: OWNER, body: req.brochureAvailabilityBody, ok: [200, { description: "Kết quả", schema: res.availabilityResponse }], errors: [400, 404, 413, 429] }),
  op(SESSION, { method: "post", path: S("/inquiry"), operationId: "brochureInquiry", summary: "Khách hỏi về một mẫu (mở hội thoại với tiệm)",
    description: "Ô bẫy `website`. 10 lần/10 phút/IP.", security: OWNER, body: req.brochureInquiryBody, ok: [201, { description: "Đã gửi", schema: res.inquiryResponse }], errors: [400, 404, 413, 429] }),
  op(SESSION, { method: "post", path: S("/quote"), operationId: "brochureQuote", summary: "Báo giá theo lựa chọn hiện tại",
    description: "Lựa chọn sai trả trong `errors` (vẫn 200). 60 lần/phút/IP.", security: OWNER, body: publicQuoteBodySchema, ok: [200, { description: "Báo giá", schema: res.quoteResponse }], errors: [400, 404, 413, 429] }),
  op(SESSION, { method: "post", path: S("/order"), operationId: "brochureOrder", summary: "Gửi đơn",
    description: "Idempotent theo phiên (gửi đồng thời chỉ ra một đơn). Máy chủ báo giá lại; hết hàng → 409; tối đa 5 đơn/giờ/SĐT → 429; ô bẫy `website` → 400. 10 lần/10 phút/IP.",
    security: OWNER, body: publicOrderBodySchema, ok: [201, { description: "Đơn đã tạo", schema: res.brochureOrderResponse }], errors: [400, 404, 409, 413, 422, 429] }),
  op(SESSION, { method: "post", path: S("/payment-proof"), operationId: "brochurePaymentProof", summary: "Tải ảnh chuyển khoản", description: "Ảnh JPEG/PNG/WebP, kiểm nội dung tệp. 5 lần/phút/IP.",
    security: OWNER, multipart: req.paymentProofForm, ok: [200, { description: "Ảnh đã lưu (URL ký có hạn)", schema: res.paymentProofResponse }], errors: [400, 404, 413, 422, 429] }),
  op(SESSION, { method: "post", path: S("/payment-notify"), operationId: "brochurePaymentNotify", summary: "Báo đã chuyển khoản",
    description: "Tiệm bật bắt buộc ảnh chuyển khoản mà chưa tải → 422. 10 lần/phút/IP.", security: OWNER, body: req.paymentNotifyBody,
    ok: [200, { description: "Đã báo tiệm", schema: res.paymentNotifyResponse }], errors: [404, 409, 413, 422, 429] }),
  op(SESSION, { method: "get", path: S("/history"), operationId: "brochureHistory", summary: "Các đơn đặt từ cùng một link (đặt thêm)", description: "60 lần/phút/IP.",
    security: OWNER, ok: [200, { description: "Lịch sử", schema: res.brochureHistoryResponse }], errors: [404, 429] }),
  op(SESSION, { method: "post", path: S("/unlock"), operationId: "brochureUnlock", summary: "Mở lại phiên trên máy khác bằng 4 số cuối SĐT người đặt",
    description: "Đặt cookie chủ phiên. Sai → 404. 5 lần/15 phút/IP, 10 lần/ngày/mã.", security: [], body: req.brochureUnlockBody,
    ok: [200, { description: "Đã mở khoá", schema: res.brochureUnlockResponse }], errors: [400, 404, 413, 429] }),
  op(SESSION, { method: "post", path: S("/reorder"), operationId: "brochureReorder", summary: "Đặt thêm — tạo link mới cùng bộ sưu tập",
    description: "Đặt cookie chủ phiên của link mới. 10 lần/10 phút/IP.", security: OWNER, ok: [201, { description: "Link mới", schema: res.brochureReorderResponse }], errors: [404, 409, 429] }),

  op(TRACKING, { method: "get", path: T(""), operationId: "trackingView", summary: "Theo dõi đơn",
    description: "Không có `?link=` của chủ phiên: bản rút gọn (`verified: false`, không ảnh người nhận, không thông tin đổi). 60 lần/phút/IP.",
    security: [], query: req.trackingLinkQuery, ok: [200, { description: "Đơn", schema: res.trackingResponse }], errors: [400, 404, 429] }),
  op(TRACKING, { method: "post", path: T(""), operationId: "trackingVerify", summary: "Xác minh bằng 4 số cuối SĐT người đặt để xem đủ thông tin",
    description: "Sai → 404. 5 lần/15 phút/IP, 10 lần/ngày/mã.", security: [], body: req.trackingVerifyBody, ok: [200, { description: "Đơn (đã xác minh)", schema: res.trackingResponse }], errors: [400, 404, 413, 429] }),
  op(TRACKING, { method: "post", path: T("/approve-photo"), operationId: "trackingApprovePhoto", summary: "Khách xác nhận ảnh thành phẩm",
    description: "Chỉ chủ link của đơn. Tiệm chưa gửi ảnh / đơn đã huỷ → 409. 10 lần/phút/IP.", security: OWNER, query: req.trackingLinkQuery,
    ok: [200, { description: "Đã xác nhận", schema: res.approvePhotoResponse }], errors: [400, 404, 409, 429] }),
  op(TRACKING, { method: "post", path: T("/change-request"), operationId: "trackingChangeRequest", summary: "Yêu cầu đổi thông tin giao (người nhận, giờ, địa chỉ, lời chúc…)",
    description: `${ownerOrPhone} Đang có yêu cầu chờ / quá hạn đổi → 409. 10 lần/10 phút/IP.`, security: [], query: req.trackingLinkQuery, body: req.changeRequestBody,
    ok: [201, { description: "Yêu cầu chờ tiệm duyệt", schema: res.changeRequestResponse }], errors: [400, 404, 409, 413, 429] }),
  op(TRACKING, { method: "post", path: T("/substitute-response"), operationId: "trackingSubstituteResponse", summary: "Khách trả lời đề xuất thay mẫu",
    description: `${ownerOrPhone} 10 lần/10 phút/IP.`, security: [], query: req.trackingLinkQuery, body: req.substituteAnswerBody,
    ok: [200, { description: "Đề xuất sau khi trả lời", schema: res.substituteResponseResponse }], errors: [400, 404, 409, 413, 429] }),
  op(TRACKING, { method: "post", path: T("/flower-substitute-response"), operationId: "trackingFlowerSubstituteResponse", summary: "Khách trả lời đề xuất đổi một nguyên liệu trong mẫu",
    description: `${ownerOrPhone} 10 lần/10 phút/IP.`, security: [], query: req.trackingLinkQuery, body: req.flowerSubstituteAnswerBody,
    ok: [200, { description: "Đề xuất sau khi trả lời", schema: res.flowerSubstituteResponseResponse }], errors: [400, 404, 409, 413, 429] }),

  op(CATALOG, { method: "post", path: C("/check-availability"), operationId: "greetingCatalogCheckAvailability", summary: "Kiểm còn hàng một mẫu của catalog",
    description: "120 lần/phút/IP.", security: [], body: req.greetingCatalogAvailabilityBody, ok: [200, { description: "Kết quả", schema: res.availabilityResponse }], errors: [400, 404, 413, 429] }),
  op(CATALOG, { method: "post", path: C("/event"), operationId: "greetingCatalogEvent", summary: "Ghi sự kiện kênh (xem, mở chi tiết, mở form, thả tim)",
    description: "`ORDER` chỉ ghi phía máy chủ. 60 lần/10 phút/IP.", security: [], body: req.greetingCatalogEventBody, ok: [202, { description: "Đã nhận", schema: res.catalogEventResponse }], errors: [400, 404, 413, 429] }),
  op(CATALOG, { method: "post", path: C("/inquiry"), operationId: "greetingCatalogInquiry", summary: "Khách hỏi về một mẫu", description: "Ô bẫy `website`. 10 lần/10 phút/IP.",
    security: [], body: req.greetingCatalogInquiryBody, ok: [201, { description: "Đã gửi", schema: res.inquiryResponse }], errors: [400, 404, 413, 429] }),
  op(CATALOG, { method: "post", path: C("/quote"), operationId: "greetingCatalogQuote", summary: "Báo giá một mẫu của catalog", description: "60 lần/phút/IP.",
    security: [], body: req.greetingCatalogQuoteBody, ok: [200, { description: "Báo giá", schema: res.quoteResponse }], errors: [400, 404, 413, 429] }),
  op(CATALOG, { method: "post", path: C("/order"), operationId: "greetingCatalogOrder", summary: "Đặt đơn từ catalog Thẻ chào",
    description: "Tạo link riêng cho đơn và đặt cookie chủ phiên của link đó. 10 lần/10 phút/IP.", security: [], body: req.greetingCatalogOrderBody,
    ok: [201, { description: "Đơn đã tạo", schema: res.catalogOrderResponse }], errors: [400, 404, 409, 413, 422, 429] }),
]
