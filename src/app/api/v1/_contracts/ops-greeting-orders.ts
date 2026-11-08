import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-greeting-orders"
import * as res from "./responses-greeting-orders"

/** Operation đơn Thẻ chào `/greeting-card/orders/*` (OpenAPI nội bộ, PO 07/11/2026). */
const ORDERS = "Thẻ chào — đơn hàng"
const PAY = "Thẻ chào — thu tiền"
const OPS = "Thẻ chào — Điều phối"
const ID = " Đơn của tổ chức khác hoặc ngoài phạm vi Sale/chi nhánh → 404."
const ACT = [...BODY_ERRORS, 404, 409, 422]
const p = "/greeting-card/orders/{id}"

export const GREETING_ORDER_OPERATIONS: OpenApiOperation[] = [
  op(ORDERS, { method: "get", path: "/greeting-card/orders", operationId: "listGreetingOrders", summary: "Đơn Thẻ chào", cap: "R1", query: req.gcOrdersQuery,
    description: "Sale chỉ xem khách của mình theo cài đặt hiển thị (`sale_id` bị bỏ qua). Kèm ảnh chuyển khoản, tiền còn phải hoàn, sản phẩm.",
    ok: [200, { description: "Trang đơn", schema: res.gcOrdersResponse }], errors: [400] }),
  op(ORDERS, { method: "post", path: `${p}/cancel`, operationId: "cancelGreetingOrder", summary: "Huỷ đơn (bắt buộc lý do)", cap: "R6", body: req.gcCancelBody,
    description: `Đơn đang giao cần \`confirmInTransit\`.${ID}`, ok: [200, { description: "Đơn đã huỷ", schema: res.gcCancelResponse }], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/discount-request`, operationId: "requestGreetingDiscount", summary: "Sale xin giảm giá cho đơn", cap: "R2", body: req.discountRequestBody,
    description: ID.trim(), ok: [201, { description: "Yêu cầu đã gửi Điều hành", schema: res.discountRequestResponse }], errors: ACT }),
  op(ORDERS, { method: "get", path: `${p}/vat`, operationId: "getGreetingOrderSlip", summary: "Phiếu đơn: VAT, hoá đơn, sản phẩm, ghi chú", cap: "R1", description: ID.trim(),
    ok: [200, { description: "Phiếu đơn", schema: res.orderSlipResponse }], errors: [404] }),
  op(ORDERS, { method: "put", path: `${p}/vat`, operationId: "setGreetingOrderVat", summary: "Bật/tắt VAT 8%/10%, lưu thông tin hoá đơn", cap: "R11", body: req.gcVatBody,
    description: `Máy chủ tính lại tổng và phần còn thu.${ID}`, ok: [200, { description: "VAT sau khi lưu", schema: res.gcVatResponse }], errors: ACT }),
  op(ORDERS, { method: "get", path: `${p}/substitute`, operationId: "getProductSubstituteOptions", summary: "Mẫu thay thế có thể đề xuất cho khách", cap: "R3", description: ID.trim(),
    ok: [200, { description: "Mẫu gợi ý và đề xuất gần nhất", schema: res.substituteOptionsResponse }], errors: [404] }),
  op(ORDERS, { method: "post", path: `${p}/substitute`, operationId: "proposeProductSubstitute", summary: "Đề xuất mẫu thay thế cho khách chọn", cap: "R3", body: req.substituteBody,
    description: ID.trim(), ok: [201, { description: "Đề xuất", schema: res.substituteProposalResponse }], errors: ACT }),
  op(ORDERS, { method: "get", path: `${p}/flower-substitute`, operationId: "getFlowerSubstituteOptions", summary: "Dòng hoa có thể thay", cap: "R3", description: ID.trim(),
    ok: [200, { description: "Công thức và đề xuất gần nhất", schema: res.flowerSubstituteOptionsResponse }], errors: [404] }),
  op(ORDERS, { method: "post", path: `${p}/flower-substitute`, operationId: "proposeFlowerSubstitute", summary: "Đề xuất thay một loại hoa (kèm ảnh)", cap: "R3", body: req.flowerSubstituteBody,
    description: ID.trim(), ok: [201, { description: "Đề xuất", schema: res.flowerSubstituteProposalResponse }], errors: ACT }),

  op(PAY, { method: "post", path: `${p}/quote`, operationId: "quoteGreetingOrder", summary: "Báo giá đơn đặt mẫu chưa niêm yết giá", cap: "R11", body: req.gcQuoteBody,
    description: ID.trim(), ok: [200, { description: "Tổng mới", schema: res.gcQuoteResponse }], errors: ACT }),
  op(PAY, { method: "post", path: `${p}/confirm-order`, operationId: "confirmGreetingOrder", summary: "Điều hành nhận đơn mới", cap: "R11", body: req.confirmOrderBody,
    description: ID.trim(), ok: [200, { description: "Đơn đã nhận", schema: res.confirmOrderResponse }], errors: ACT }),
  op(PAY, { method: "delete", path: `${p}/confirm-order`, operationId: "rejectGreetingOrder", summary: "Điều hành từ chối đơn mới (bắt buộc lý do)", cap: "R11", body: req.rejectNewOrderBody,
    description: "Ghi đề xuất huỷ chờ xử lý tiền đã thu." + ID, ok: [200, { description: "Đề xuất huỷ", schema: res.rejectProposalResponse }], errors: ACT }),
  op(PAY, { method: "post", path: `${p}/confirm-payment`, operationId: "confirmGreetingPayment", summary: "Điều hành xác nhận tiền khách đã trả", cap: "R11", body: req.confirmPaymentBody,
    description: "Đơn chuỗi ở chế độ tự động mời chi nhánh ngay (`dispatch`); `manualDispatch` để tự chọn." + ID,
    ok: [200, { description: "Khoản thu và kết quả mời chi nhánh", schema: res.paymentConfirmedResponse }], errors: ACT }),
  op(PAY, { method: "post", path: `${p}/reject-reported-payment`, operationId: "rejectReportedPayment", summary: "Từ chối báo đã chuyển khoản của khách", cap: "R11",
    body: req.rejectReportedPaymentBody, description: ID.trim(), ok: [200, { description: "Đã từ chối", schema: res.rejectReportedPaymentResponse }], errors: ACT }),
  op(PAY, { method: "post", path: `${p}/refund`, operationId: "refundGreetingOrder", summary: "Hoàn tiền cho khách", cap: "R10", body: req.refundBody,
    description: ID.trim(), ok: [200, { description: "Đã hoàn", schema: res.refundResponse }], errors: ACT }),
  op(PAY, { method: "post", path: `${p}/confirm-deposit`, operationId: "coordinatorConfirmDeposit", summary: "Điều phối xác nhận tiền cọc", cap: "R4",
    body: req.confirmDepositBody, description: "Cần `R11`, hoặc chính sách tiệm cho Điều phối duyệt cọc (đơn gấp / quá hạn xử lý); không được → 422." + ID,
    ok: [200, { description: "Khoản thu và kết quả mời chi nhánh", schema: res.paymentConfirmedResponse }], errors: ACT }),
  op(PAY, { method: "post", path: `${p}/confirm-balance`, operationId: "coordinatorConfirmBalance", summary: "Điều phối xác nhận phần còn lại", cap: "R4",
    body: req.confirmBalanceBody, description: "Theo chính sách thu phần còn lại của tiệm; không được → 422." + ID,
    ok: [200, { description: "Khoản thu", schema: res.balanceConfirmedResponse }], errors: ACT }),

  op(OPS, { method: "post", path: `${p}/accept`, operationId: "coordinatorAcceptOrder", summary: "Điều phối nhận đơn", cap: "R4", body: req.acceptOrderBody,
    description: ID.trim(), ok: [200, { description: "Đơn", schema: res.orderRefResponse }], errors: ACT }),
  op(OPS, { method: "post", path: `${p}/reject`, operationId: "coordinatorRejectOrder", summary: "Điều phối từ chối nhận đơn (bắt buộc lý do)", cap: "R4", body: req.rejectOrderBody,
    description: ID.trim(), ok: [200, { description: "Đề xuất huỷ", schema: res.rejectProposalResponse }], errors: ACT }),
  op(OPS, { method: "post", path: `${p}/assign-florist`, operationId: "assignGreetingFlorist", summary: "Phân công thợ cắm hoa", cap: "R4", body: req.floristBody,
    description: ID.trim(), ok: [200, { description: "Đơn", schema: res.orderRefResponse }], errors: ACT }),
  op(OPS, { method: "post", path: `${p}/product-photo`, operationId: "uploadProductPhoto", summary: "Ảnh thành phẩm (hoặc bỏ qua có lý do)", cap: "R3", body: req.photoBody,
    description: ID.trim(), ok: [200, { description: "Đơn", schema: res.orderRefResponse }], errors: ACT }),
  op(OPS, { method: "post", path: `${p}/dispatch-shipping`, operationId: "dispatchShipping", summary: "Giao cho đơn vị vận chuyển", cap: "R5", body: req.shipBody,
    description: ID.trim(), ok: [200, { description: "Đơn", schema: res.orderRefResponse }], errors: ACT }),
  op(OPS, { method: "post", path: `${p}/recipient-photo`, operationId: "uploadRecipientPhoto", summary: "Ảnh người nhận (hoặc bỏ qua có lý do)", cap: "R5", body: req.photoBody,
    description: ID.trim(), ok: [200, { description: "Đơn", schema: res.orderRefResponse }], errors: ACT }),
  op(OPS, { method: "post", path: `${p}/delivery-failed`, operationId: "markDeliveryFailed", summary: "Báo giao không thành công", cap: "R5", body: req.deliveryFailedBody,
    description: "`chargeFee` cộng phí giao lại vào đơn." + ID, ok: [200, { description: "Phí và tổng mới", schema: res.deliveryFailedResponse }], errors: ACT }),
  op(OPS, { method: "get", path: `${p}/chain-dispatch`, operationId: "getChainDispatch", summary: "Chi nhánh phù hợp nhất để mời nhận gia công", cap: "R4",
    description: "Xếp theo khoảng cách, khu vực, điểm chất lượng, việc đang làm; kèm trạng thái mời và phí gia công gợi ý." + ID,
    ok: [200, { description: "Gợi ý và trạng thái", schema: res.chainDispatchStateResponse }], errors: [404] }),
  op(OPS, { method: "post", path: `${p}/chain-dispatch`, operationId: "startChainDispatch", summary: "Mời các chi nhánh đã chọn nhận gia công", cap: "R4", body: req.chainDispatchBody,
    description: "Đã mời hoặc đã có chi nhánh nhận → 409." + ID, ok: [200, { description: "Kết quả gửi theo chi nhánh", schema: res.chainDispatchStartResponse }], errors: ACT }),
  op(OPS, { method: "get", path: `${p}/craft-fee`, operationId: "suggestCraftFee", summary: "Phí gia công gợi ý theo chính sách tiệm", cap: "R4", description: ID.trim(),
    ok: [200, { description: "Phí và cách tính", schema: res.craftFeeResponse }], errors: [404] }),
]
