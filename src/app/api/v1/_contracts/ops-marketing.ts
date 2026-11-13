import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-marketing"
import * as res from "./responses-marketing"

/** Operation khách hàng & marketing (OpenAPI nội bộ, PO 07/11/2026). */
const LEAD = "Khách tiềm năng"
const MKT = "Chiến dịch & chỉ số marketing"
const CRM = "Nhóm khách hàng & tương tác"
const OCC = "Dịp bán hàng"
const SHIP = "Giao hàng — shipper"
const NF = "Của tổ chức khác → 404."
const PAGE = "`limit` 1–100 (mặc định 50), `offset` ≥ 0; sai → 400."
const FIELD_MAP = "Sai → 400, `details` là bản đồ trường → thông báo (không phải `details.issues`)."
const interactionBody = req.recordCustomerInteractionInputSchema.omit({ customerId: true })

export const MARKETING_OPERATIONS: OpenApiOperation[] = [
  op(LEAD, { method: "get", path: "/leads", operationId: "listLeads", summary: "Khách tiềm năng kèm đếm theo trạng thái", cap: "Q1", query: req.leadsQuery,
    description: "`status` có thể nhiều giá trị cách dấu phẩy (`IN_PROGRESS` = `CONTACTED`); lạ → 400. `limit` 1–100 (mặc định 20), sai → 400. Phân trang con trỏ (`nextCursor`). Thân không bọc `{ data }`.",
    ok: [200, { description: "Khách tiềm năng", schema: res.leadsResponse }], errors: [400] }),
  op(LEAD, { method: "post", path: "/leads", operationId: "createStaffLead", summary: "Nhân viên thêm khách tiềm năng", cap: "Q2", body: req.createLeadBody,
    description: "Thiếu tên, số điện thoại hoặc lý do → 400.", ok: [201, { description: "Khách tiềm năng", schema: res.leadCreatedResponse }], errors: BODY_ERRORS }),
  op(LEAD, { method: "patch", path: "/leads/{id}", operationId: "updateLead", summary: "Đổi trạng thái chăm sóc / người phụ trách", cap: "Q3", body: req.updateLeadBody,
    description: `Chuyển trạng thái không hợp lệ → 400. ${NF} Thân không bọc \`{ data }\`.`, ok: [200, { description: "Khách tiềm năng", schema: res.leadResponse }], errors: [...BODY_ERRORS, 404] }),

  op(MKT, { method: "get", path: "/campaigns", operationId: "listCampaigns", summary: "Chiến dịch marketing", cap: "M1", query: req.campaignsQuery,
    description: "`status`/`objective` lạ → 400. Phân trang con trỏ.", ok: [200, { description: "Chiến dịch", schema: res.campaignsResponse }], errors: [400] }),
  op(MKT, { method: "post", path: "/campaigns", operationId: "createCampaign", summary: "Tạo chiến dịch", cap: "M3", body: req.createCampaignSchema,
    description: FIELD_MAP, ok: [201, { description: "Chiến dịch", schema: res.campaignResponse }], errors: BODY_ERRORS }),
  op(MKT, { method: "get", path: "/campaigns/{id}", operationId: "getCampaign", summary: "Chi tiết chiến dịch", cap: "M1", description: NF,
    ok: [200, { description: "Chiến dịch", schema: res.campaignDetailResponse }], errors: [404] }),
  op(MKT, { method: "patch", path: "/campaigns/{id}", operationId: "updateCampaign", summary: "Sửa chiến dịch", cap: "M3", body: req.updateCampaignSchema,
    description: `${FIELD_MAP} ${NF}`, ok: [200, { description: "Chiến dịch", schema: res.campaignResponse }], errors: [...BODY_ERRORS, 404] }),
  op(MKT, { method: "get", path: "/marketing-center/kpis", operationId: "getMarketingKpis", summary: "Chỉ số marketing theo khung thời gian", cap: "M1 hoặc Q1", query: req.kpisQuery,
    description: "`time_window` mặc định `30D`; lạ → 400.", ok: [200, { description: "Chỉ số", schema: res.kpisResponse }], errors: [400] }),

  op(CRM, { method: "get", path: "/customer-segments", operationId: "listCustomerSegments", summary: "Nhóm khách hàng", cap: "M4 hoặc Q1", query: req.segmentsQuery,
    description: PAGE, ok: [200, { description: "Nhóm khách", schema: res.segmentsResponse }], errors: [400] }),
  op(CRM, { method: "post", path: "/customer-segments", operationId: "createCustomerSegment", summary: "Tạo nhóm khách (động theo điều kiện hoặc tĩnh)", cap: "M4",
    body: req.createCustomerSegmentInputSchema, description: FIELD_MAP, ok: [201, { description: "Nhóm khách", schema: res.segmentResponse }], errors: BODY_ERRORS }),
  op(CRM, { method: "get", path: "/customer-segments/{id}", operationId: "getCustomerSegment", summary: "Chi tiết nhóm khách", cap: "M4 hoặc Q1", description: NF,
    ok: [200, { description: "Nhóm khách", schema: res.segmentResponse }], errors: [404] }),
  op(CRM, { method: "patch", path: "/customer-segments/{id}", operationId: "updateCustomerSegment", summary: "Sửa nhóm khách", cap: "M4", body: req.updateCustomerSegmentInputSchema,
    description: `${FIELD_MAP} ${NF}`, ok: [200, { description: "Nhóm khách", schema: res.segmentResponse }], errors: [...BODY_ERRORS, 404] }),
  op(CRM, { method: "delete", path: "/customer-segments/{id}", operationId: "deleteCustomerSegment", summary: "Xoá nhóm khách", cap: "M4", description: NF,
    ok: [200, { description: "Đã xoá", schema: res.segmentDeletedResponse }], errors: [404] }),
  op(CRM, { method: "get", path: "/customer-segments/{id}/customers", operationId: "listSegmentCustomers", summary: "Khách thuộc nhóm", cap: "M4 hoặc Q1", query: req.segmentCustomersQuery,
    description: `${PAGE} ${NF}`, ok: [200, { description: "Khách", schema: res.segmentCustomersResponse }], errors: [400, 404] }),
  op(CRM, { method: "get", path: "/customers", operationId: "listCareCustomers", summary: "Tất cả khách (chăm sóc khách)", cap: "M4 hoặc Q1", query: req.customersQuery,
    description: "Mới nhất cập nhật trước. `limit` 1–100 (mặc định 25), `cursor` lấy từ `next_cursor`; sai → 400. `search`: tên, mã, 4 số cuối hoặc đủ số điện thoại.",
    ok: [200, { description: "Khách", schema: res.customersPageResponse }], errors: [400] }),
  op(CRM, { method: "get", path: "/customer-interactions", operationId: "listCustomerInteractions", summary: "Nhật ký tương tác khách", cap: "Q1", query: req.interactionsQuery,
    description: `\`channel\`/\`direction\` lạ → 400. ${PAGE}`, ok: [200, { description: "Tương tác", schema: res.interactionsResponse }], errors: [400] }),
  op(CRM, { method: "get", path: "/customers/{id}/interactions", operationId: "listCustomerInteractionsOfCustomer", summary: "Tương tác của một khách", cap: "Q1", query: req.customerInteractionsQuery,
    description: `\`channel\`/\`direction\` lạ → 400. ${PAGE}`, ok: [200, { description: "Tương tác", schema: res.interactionsResponse }], errors: [400] }),
  op(CRM, { method: "post", path: "/customers/{id}/interactions", operationId: "recordCustomerInteraction", summary: "Ghi một lần liên hệ khách", cap: "M4 hoặc Q1", body: interactionBody,
    description: `\`direction\` mặc định \`OUTBOUND\`. ${FIELD_MAP} ${NF}`, ok: [201, { description: "Tương tác", schema: res.interactionResponse }], errors: [...BODY_ERRORS, 404] }),

  op(OCC, { method: "get", path: "/occasions", operationId: "listOccasions", summary: "Danh mục dịp bán hàng", cap: "F1",
    description: "`next_cursor` luôn `null` (trả hết).", ok: [200, { description: "Dịp", schema: res.occasionsResponse }] }),
  op(OCC, { method: "post", path: "/occasions", operationId: "createOccasion", summary: "Thêm dịp riêng của tổ chức", cap: "F2", body: req.createOccasionBody,
    description: "Mã trùng → 409.", ok: [201, { description: "Dịp", schema: res.occasionResponse }], errors: [...BODY_ERRORS, 409] }),
  op(OCC, { method: "patch", path: "/occasions/{id}", operationId: "updateOccasion", summary: "Sửa / tắt dịp", cap: "F2", body: req.updateOccasionBody,
    description: `Thân rỗng → 400. ${NF}`, ok: [200, { description: "Dịp", schema: res.occasionResponse }], errors: [...BODY_ERRORS, 404] }),

  op(SHIP, { method: "get", path: "/delivery/my-runs", operationId: "listShipperRuns", summary: "Đơn được giao cho shipper đang đăng nhập", cap: "R18",
    description: "Ghép theo số điện thoại của shipper; chưa có số → `phoneMissing: true`. Không có giá hay ghi chú nội bộ. Thân không bọc `{ data }`.",
    ok: [200, { description: "Đơn cần giao", schema: res.shipperRunsResponse }] }),
  op(SHIP, { method: "post", path: "/delivery/my-runs/{id}", operationId: "reportShipperRun", summary: "Báo đã lấy hàng, đang giao, giao xong hoặc thất bại", cap: "R18", body: req.shipperRunEventBody,
    description: "Đơn không giao cho mình → 404.", ok: [200, { description: "Kết quả", schema: res.shipperRunReportResponse }], errors: [...BODY_ERRORS, 404] }),
]
