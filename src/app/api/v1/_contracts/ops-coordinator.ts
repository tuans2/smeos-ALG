import { z } from "zod"

import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-coordinator"
import * as ops from "./responses-coordinator-ops"
import * as res from "./responses-coordinator"

/** Operation Điều phối `/coordinator/*` (OpenAPI nội bộ, PO 07/11/2026). */
const ORDERS = "Điều phối — đơn"
const CHAIN = "Điều phối — chuỗi gia công"
const PARTNERS = "Điều phối — đối tác"
const REMIND = "Điều phối — nhắc việc"
const ACT = [...BODY_ERRORS, 404, 409, 422]
const NF = " Đơn của tổ chức khác → 404."
const p = "/coordinator/orders/{id}"
const order = (description: string) => ({ description, schema: res.coordinatorOrderResponse })

export const COORDINATOR_OPERATIONS: OpenApiOperation[] = [
  op(ORDERS, { method: "get", path: "/coordinator/orders", operationId: "listCoordinatorOrders", summary: "Đơn Điều phối theo bước", cap: "R1",
    query: z.object({ stage: z.string().optional(), limit: z.string().regex(/^\d+$/).optional() }), description: "`limit` 1–200, mặc định 100.",
    ok: [200, { description: "Đơn", schema: res.coordinatorOrdersResponse }], errors: [400] }),
  op(ORDERS, { method: "post", path: "/coordinator/orders", operationId: "createCoordinatorOrder", summary: "Nhận đơn vào Điều phối", cap: "R2", body: req.createOrderSchema,
    description: "Địa chỉ giao bắt buộc đủ 4 tầng; tự sinh yêu cầu bổ sung khi thiếu thông tin.", ok: [201, order("Đơn đã tạo")], errors: ACT }),
  op(ORDERS, { method: "get", path: p, operationId: "getCoordinatorOrder", summary: "Đơn ở góc nhìn Điều phối", cap: "R1", description: NF.trim(),
    ok: [200, order("Đơn")], errors: [404] }),
  op(ORDERS, { method: "patch", path: `${p}/stage`, operationId: "updateCoordinatorStage", summary: "Chuyển bước", cap: "R3", body: req.updateStageSchema,
    description: "Bước không hợp lệ từ bước hiện tại → 422." + NF, ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "patch", path: `${p}/custom-fields`, operationId: "updateCoordinatorCustomFields", summary: "Sửa trường tuỳ biến của đơn", cap: "R3",
    body: req.updateCustomFieldsSchema, description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "get", path: `${p}/payments`, operationId: "listCoordinatorPayments", summary: "Khoản thu/hoàn của đơn", cap: "R1", description: NF.trim(),
    ok: [200, { description: "Khoản thu", schema: ops.coordinatorPaymentsResponse }], errors: [404] }),
  op(ORDERS, { method: "post", path: `${p}/payments`, operationId: "recordCoordinatorPayment", summary: "Ghi khoản thu (cọc/phần còn lại) hoặc hoàn tiền", cap: "R9 hoặc R10",
    body: req.recordPaymentSchema, description: "`kind=REFUND` cần `R10`, còn lại `R9`." + NF, ok: [201, order("Đơn sau khi ghi")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/payments/{paymentId}/decision`, operationId: "decideCoordinatorPayment", summary: "Duyệt / từ chối khoản thu chờ xác nhận", cap: "R11",
    body: req.paymentDecisionBody, description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/assign-partner`, operationId: "assignCoordinatorPartner", summary: "Giao đơn cho đối tác gia công", cap: "R4", body: req.assignPartnerSchema,
    description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/production`, operationId: "recordProductionUpdate", summary: "Ghi tiến độ sản xuất", cap: "R3", body: req.productionUpdateSchema,
    description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/qc`, operationId: "recordQcInspection", summary: "Ghi kết quả kiểm tra chất lượng", cap: "R3", body: req.qcInspectionSchema,
    description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/delivery`, operationId: "recordDeliveryUpdate", summary: "Ghi tiến độ giao hàng", cap: "R5", body: req.deliveryUpdateSchema,
    description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/exceptions`, operationId: "openCoordinatorException", summary: "Mở sự cố cho đơn", cap: "R3", body: req.openExceptionSchema,
    description: NF.trim(), ok: [201, order("Đơn kèm sự cố")], errors: ACT }),
  op(ORDERS, { method: "post", path: "/coordinator/exceptions/{id}/resolve", operationId: "resolveCoordinatorException", summary: "Đóng sự cố", cap: "R3",
    body: req.resolveExceptionSchema, description: "Sự cố của tổ chức khác → 404.", ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/close`, operationId: "closeCoordinatorOrder", summary: "Đóng đơn (đánh giá đối tác, ghi chú)", cap: "R3", body: req.closeOrderSchema,
    description: NF.trim(), ok: [200, order("Đơn")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/cancel`, operationId: "cancelCoordinatorOrder", summary: "Huỷ đơn (bắt buộc lý do)", cap: "R6", body: req.cancelOrderSchema,
    description: NF.trim(), ok: [200, order("Đơn đã huỷ")], errors: ACT }),
  op(ORDERS, { method: "post", path: `${p}/dispatch-to-chat`, operationId: "dispatchOrderToChat", summary: "Gửi thẻ đơn sang chat với cửa hàng đối tác", cap: "R3",
    body: req.dispatchToChatBody, description: "Cửa hàng không phải đối tác đang hoạt động → 404." + NF,
    ok: [200, { description: "Hội thoại và tin vừa gửi", schema: ops.dispatchToChatResponse }], errors: ACT }),

  op(CHAIN, { method: "post", path: `${p}/approve-bypass`, operationId: "decideBypassRequest", summary: "Duyệt / từ chối chi nhánh xin bỏ qua bằng chứng (ảnh QC, shipper, ảnh giao)",
    cap: "R3", body: req.bypassDecisionBody, description: "Duyệt trừ điểm chất lượng của chi nhánh. Không có yêu cầu đang chờ → 409." + NF,
    ok: [200, { description: "Kết quả", schema: ops.bypassDecisionResponse }], errors: ACT }),
  op(CHAIN, { method: "post", path: `${p}/approve-customer-photo`, operationId: "approveCustomerPhoto", summary: "Duyệt ảnh thành phẩm thay khách", cap: "R3",
    description: "Chưa có ảnh thành phẩm hoặc đơn đã huỷ → 409." + NF, ok: [200, { description: "Kết quả", schema: ops.customerPhotoResponse }], errors: [404, 409] }),
  op(CHAIN, { method: "post", path: `${p}/upload-qc-subcontract`, operationId: "uploadSubcontractQcPhoto", summary: "Điều phối tải ảnh thành phẩm thay chi nhánh", cap: "R3",
    multipart: req.photoUploadForm, description: "AI so ảnh với mẫu; không khớp → 422." + NF, ok: [200, { description: "Ảnh đã lưu", schema: ops.qcUploadResponse }], errors: ACT }),
  op(CHAIN, { method: "post", path: `${p}/set-shipper`, operationId: "setSubcontractShipper", summary: "Nhập shipper thay chi nhánh", cap: "R5", body: req.setShipperBody,
    description: "Đã có shipper → trả `alreadySubmitted`; khách chưa duyệt ảnh → 409." + NF, ok: [200, { description: "Shipper", schema: ops.setShipperResponse }], errors: ACT }),
  op(CHAIN, { method: "post", path: `${p}/confirm-delivery`, operationId: "confirmSubcontractDelivery", summary: "Xác nhận giao thành công (có ảnh hoặc không ảnh)", cap: "R5",
    body: req.confirmDeliveryBody, multipart: req.photoUploadForm,
    description: "Multipart kèm ảnh giao hàng (AI kiểm, không khớp → 422); JSON `confirmWithoutPhoto` chỉ khi tiệm cho bỏ ảnh (không → 409)." + NF,
    ok: [200, { description: "Kết quả", schema: ops.confirmDeliveryResponse }], errors: ACT }),
  op(CHAIN, { method: "post", path: `${p}/craft-fee-complaint`, operationId: "complainCraftFee", summary: "Ghi khiếu nại chất lượng, trừ phí gia công theo chính sách", cap: "R3",
    body: req.craftFeeComplaintBody, description: "Đơn chưa có chi nhánh nhận → 409." + NF, ok: [200, { description: "Phí còn phải trả", schema: ops.craftFeeComplaintResponse }], errors: ACT }),

  op(PARTNERS, { method: "get", path: "/coordinator/partners", operationId: "listCoordinatorPartners", summary: "Đối tác gia công hoặc cửa hàng đối tác của chuỗi", cap: "R1 hoặc F1",
    query: req.partnersQuery, ok: [200, { description: "Đối tác", schema: ops.chainPartnersResponse }] }),
  op(PARTNERS, { method: "post", path: "/coordinator/partners", operationId: "createCoordinatorPartner", summary: "Tạo cửa hàng đối tác (tài khoản mới) hoặc đối tác gia công ngoài", cap: "R4 hoặc F2",
    body: z.union([req.provisionPartnerBody, req.createPartnerSchema]),
    description: "Thân có `partnerStoreName`/`contactEmail` → tạo cửa hàng đối tác (`F2`, mật khẩu tạm trả MỘT lần); còn lại → đối tác gia công (`R4`).",
    ok: [201, { description: "Đối tác", schema: ops.createPartnerResponse }], errors: [...BODY_ERRORS, 409, 422] }),
  op(PARTNERS, { method: "post", path: "/coordinator/partners/link-existing", operationId: "linkExistingStore", summary: "Liên kết cửa hàng đã có tài khoản", cap: "F2",
    body: req.linkExistingBody, ok: [201, { description: "Liên kết", schema: ops.partnershipResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(PARTNERS, { method: "patch", path: "/coordinator/partners/{id}", operationId: "updateCoordinatorPartner", summary: "Sửa đối tác gia công", cap: "R4", body: req.updatePartnerSchema,
    description: "Đối tác của tổ chức khác → 404.", ok: [200, { description: "Đối tác", schema: ops.partnerResponse }], errors: [...BODY_ERRORS, 404] }),
  op(PARTNERS, { method: "patch", path: "/coordinator/partners/{id}/status", operationId: "setPartnershipStatus", summary: "Kích hoạt / tạm dừng / chấm dứt liên kết", cap: "F2",
    body: req.partnershipStatusBody, description: "Liên kết của chuỗi khác → 404.", ok: [200, { description: "Liên kết", schema: ops.partnershipResponse }], errors: [...BODY_ERRORS, 404] }),
  op(PARTNERS, { method: "patch", path: "/coordinator/partners/{id}/tools", operationId: "setPartnerTools", summary: "Công cụ mở cho cửa hàng đối tác", cap: "F2",
    body: req.partnerToolsBody, description: "Liên kết của chuỗi khác → 404.", ok: [200, { description: "Công cụ", schema: ops.partnerToolsResponse }], errors: [...BODY_ERRORS, 404] }),

  op(REMIND, { method: "get", path: "/coordinator/reminders", operationId: "getCoordinatorReminders", summary: "Nhắc việc theo mốc M0–M5", cap: "R1",
    ok: [200, { description: "Nhắc việc", schema: ops.remindersResponse }] }),
  op(REMIND, { method: "post", path: "/coordinator/reminders/acknowledge", operationId: "acknowledgeCoordinatorReminder", summary: "Đã xem / hoãn / bỏ một nhắc việc", cap: "R3",
    body: req.acknowledgeReminderBody, ok: [200, { description: "Kết quả", schema: ops.acknowledgeResponse }], errors: [...BODY_ERRORS, 404] }),
  op(REMIND, { method: "get", path: "/coordinator/settings/reminders", operationId: "getReminderPolicy", summary: "Mốc nhắc việc của tiệm", cap: "D1",
    ok: [200, { description: "Cấu hình", schema: ops.reminderPolicyResponse }] }),
  op(REMIND, { method: "put", path: "/coordinator/settings/reminders", operationId: "updateReminderPolicy", summary: "Sửa mốc nhắc việc của tiệm", cap: "R12", body: req.reminderPolicyBody,
    ok: [200, { description: "Cấu hình", schema: ops.reminderPolicyResponse }], errors: BODY_ERRORS }),
  op(REMIND, { method: "get", path: "/coordinator/templates/{id}/reminders", operationId: "getTemplateReminders", summary: "Mốc nhắc việc riêng của một mẫu", cap: "R1",
    description: "`{id}` là id sản phẩm (mẫu).", ok: [200, { description: "Mốc riêng", schema: ops.templateRemindersResponse }], errors: [404] }),
  op(REMIND, { method: "put", path: "/coordinator/templates/{id}/reminders", operationId: "updateTemplateReminders", summary: "Đặt mốc nhắc việc riêng của mẫu", cap: "R12",
    body: req.templateRemindersBody, description: "`null` = dùng cấu hình của tiệm.", ok: [200, { description: "Mốc riêng", schema: ops.templateRemindersResponse }], errors: [...BODY_ERRORS, 404] }),
]
