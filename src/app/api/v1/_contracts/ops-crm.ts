import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-crm"
import * as res from "./responses-crm"

/** Operation khách hàng `/crm/*` (OpenAPI nội bộ, PO 07/11/2026). */
const CRM = "Khách hàng"
const ID = "Khách của tổ chức khác → 404."

export const CRM_OPERATIONS: OpenApiOperation[] = [
  op(CRM, { method: "get", path: "/crm/customers", operationId: "listCustomers", summary: "Danh sách khách hàng", cap: "Q1", query: req.listCustomersQuery,
    description: "Sắp theo ngày đặc biệt gần nhất.", ok: [200, { description: "Hồ sơ khách và tổng số", schema: res.customersResponse }] }),
  op(CRM, { method: "post", path: "/crm/customers", operationId: "createCustomer", summary: "Tạo khách hàng", cap: "Q2", body: req.createCustomerBody,
    description: "Số điện thoại Việt Nam được chuẩn hoá; đã có trong tổ chức → 409.",
    ok: [201, { description: "Hồ sơ khách", schema: res.customerResponse }], errors: [...BODY_ERRORS, 409] }),
  op(CRM, { method: "get", path: "/crm/customers/{id}", operationId: "getCustomer", summary: "Hồ sơ một khách", cap: "Q1", description: ID,
    ok: [200, { description: "Hồ sơ khách", schema: res.customerResponse }], errors: [404] }),
  op(CRM, { method: "patch", path: "/crm/customers/{id}", operationId: "updateCustomer", summary: "Sửa thông tin khách", cap: "Q3", body: req.updateCustomerBody, description: ID,
    ok: [200, { description: "Hồ sơ khách sau khi sửa", schema: res.customerResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(CRM, { method: "delete", path: "/crm/customers/{id}", operationId: "deleteCustomer", summary: "Xoá khách hàng", cap: "Q4", description: ID,
    ok: [200, { description: "Đã xoá", schema: res.deleteCustomerResponse }], errors: [404] }),
  op(CRM, { method: "get", path: "/crm/customers/{id}/master-index", operationId: "getCustomerMasterIndex", summary: "Hồ sơ đầy đủ của khách (SSOT)", cap: "Q1", description: ID,
    ok: [200, { description: "Hồ sơ khách", schema: res.customerMasterIndexResponse }], errors: [404] }),
  op(CRM, { method: "post", path: "/crm/customers/{id}/occasions", operationId: "addCustomerOccasion", summary: "Thêm dịp kỷ niệm", cap: "Q6", body: req.addOccasionBody, description: ID,
    ok: [201, { description: "Dịp đã thêm", schema: res.occasionResponse }], errors: [...BODY_ERRORS, 404] }),
  op(CRM, { method: "post", path: "/crm/customers/{id}/consent", operationId: "updateCustomerConsent", summary: "Ghi đồng ý / thu hồi nhận tin tiếp thị theo kênh", cap: "Q9", body: req.consentBody,
    description: ID, ok: [200, { description: "Bản ghi đồng ý, có mốc thời gian", schema: res.consentResponse }], errors: [...BODY_ERRORS, 404] }),
  op(CRM, { method: "get", path: "/crm/customers/{id}/orders", operationId: "listCustomerOrders", summary: "Đơn đã đặt của khách, mọi nguồn", cap: "Q1 + R1",
    description: `Đơn gắn khách hoặc đơn chưa gắn khách có SĐT người đặt trùng; trong phạm vi chi nhánh; tối đa 50, mới nhất trước. ${ID}`,
    ok: [200, { description: "Đơn", schema: res.customerOrdersResponse }], errors: [404] }),
  op(CRM, { method: "get", path: "/crm/customers/export", operationId: "exportCustomers", summary: "Xuất danh sách khách (Excel hoặc JSON)", cap: "R13", query: req.exportCustomersQuery,
    ok: [200, { description: "Tệp `.xlsx` (mặc định) hoặc `.json` (`format=json`)", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }] }),
  op(CRM, { method: "get", path: "/crm/reminders/upcoming", operationId: "listUpcomingReminders", summary: "Dịp kỷ niệm sắp tới của khách", cap: "Q7", query: req.remindersQuery,
    ok: [200, { description: "Dịp sắp tới, gợi ý hoa và giọng điệu", schema: res.upcomingRemindersResponse }] }),
]
