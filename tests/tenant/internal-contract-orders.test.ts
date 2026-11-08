import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-orders"
import { POST as assign } from "@/app/api/v1/orders/[id]/assign/route"
import { POST as cancel } from "@/app/api/v1/orders/[id]/cancel/route"
import { POST as deliverBeforePay } from "@/app/api/v1/orders/[id]/deliver-before-pay/route"
import { GET as events } from "@/app/api/v1/orders/[id]/events/route"
import { POST as closeInfoRequest } from "@/app/api/v1/orders/[id]/info-requests/[requestId]/route"
import { GET as orderInfoRequests, POST as createInfoRequest } from "@/app/api/v1/orders/[id]/info-requests/route"
import { POST as reportWork } from "@/app/api/v1/orders/[id]/my-work/route"
import { POST as pay } from "@/app/api/v1/orders/[id]/payments/route"
import { GET as print } from "@/app/api/v1/orders/[id]/print/route"
import { POST as quote } from "@/app/api/v1/orders/[id]/quote/route"
import { GET as getOrder, PATCH as patchOrder } from "@/app/api/v1/orders/[id]/route"
import { GET as getVat, PUT as putVat } from "@/app/api/v1/orders/[id]/vat/route"
import { POST as decide } from "@/app/api/v1/orders/approval-requests/[requestId]/decision/route"
import { GET as approvalRequests } from "@/app/api/v1/orders/approval-requests/route"
import { GET as coordinationQueue } from "@/app/api/v1/orders/coordination-queue/route"
import { GET as getDbpSettings, PUT as putDbpSettings } from "@/app/api/v1/orders/deliver-before-pay-settings/route"
import { GET as getEntryActions, PUT as putEntryActions } from "@/app/api/v1/orders/entry-actions/route"
import { GET as exportOrders } from "@/app/api/v1/orders/export/route"
import { GET as openInfoRequests } from "@/app/api/v1/orders/info-requests/route"
import { GET as leadQueue } from "@/app/api/v1/orders/lead-queue/route"
import { GET as myWork } from "@/app/api/v1/orders/my-work/route"
import { GET as listOrders, POST as createOrder } from "@/app/api/v1/orders/route"
import { GET as workbench } from "@/app/api/v1/orders/workbench/route"
import { POST as convert } from "@/app/api/v1/quotations/[id]/convert/route"
import { GET as revisions } from "@/app/api/v1/quotations/[id]/revisions/route"
import { GET as getQuotation, PATCH as patchQuotation } from "@/app/api/v1/quotations/[id]/route"
import { POST as send } from "@/app/api/v1/quotations/[id]/send/route"
import { GET as listQuotations, POST as createQuotation } from "@/app/api/v1/quotations/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi đơn hàng và báo giá (OpenAPI nội bộ, PO 07/11/2026) — CSDL thật, lược đồ strict. */
const BASE = "http://localhost/api/v1"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })

describe("hợp đồng — đơn hàng và báo giá", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send_ = (path: string, method: string, body: unknown) => withSession(`${BASE}${path}`, t.token, { method, body: JSON.stringify(body) })
  const draft = (price = 1_000_000) => ingestOrder(t.ctx, { source: "MANUAL", items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: price }] })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-don")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đơn: tạo, đọc, sửa, giao việc, sự kiện, in, yêu cầu bổ sung, việc của thợ, huỷ, xuất", async () => {
    const created = await expectContract(
      await createOrder(
        send_("/orders", "POST", {
          items: [{ description: "Giỏ hoa", quantity: 2, unitPriceVnd: 450_000 }],
          cardMessage: "Chúc mừng sinh nhật",
          deliveryWindow: { date: "2026-12-01", timeSlot: "9-11h" },
          deliveryAddress: { recipientName: "Chị Lan", phone: "0900000000", street: "12 Lê Lợi", district: "Quận 1" },
        })
      ),
      201,
      R.orderResponse,
      "order"
    )
    const id = (created.order as { id: string }).id
    await expectContract(await listOrders(get("/orders?limit=10")), 200, R.ordersResponse, "orders")
    await expectContract(await getOrder(get(`/orders/${id}`), ps({ id })), 200, R.orderDetailResponse, "order-detail")
    await expectContract(await patchOrder(send_(`/orders/${id}`, "PATCH", { internalNote: "Gói giấy kraft" }), ps({ id })), 200, R.orderResponse, "order")
    await expectContract(await assign(send_(`/orders/${id}/assign`, "POST", { assigneeId: t.userId, difficulty: "kho" }), ps({ id })), 200, R.orderResponse, "order")
    await expectContract(await events(get(`/orders/${id}/events`), ps({ id })), 200, R.orderEventsResponse, "order-events")
    await expectContract(await print(get(`/orders/${id}/print`), ps({ id })), 200, R.printResponse, "print")
    await expectContract(await orderInfoRequests(get(`/orders/${id}/info-requests`), ps({ id })), 200, R.infoRequestsResponse, "info-requests")
    const info = await expectContract(
      await createInfoRequest(send_(`/orders/${id}/info-requests`, "POST", { field: "giftNote", label: "Ghi chú quà", reason: "Khách chưa chốt", requestedFrom: "Khách" }), ps({ id })),
      201,
      R.infoRequestResponse,
      "info-request"
    )
    const requestId = (info.data as { id: string }).id
    await expectContract(
      await closeInfoRequest(send_(`/orders/${id}/info-requests/${requestId}`, "POST", { outcome: "RECEIVED" }), ps({ id, requestId })),
      200,
      R.okResponse,
      "info-request-closed"
    )
    await expectContract(await openInfoRequests(get("/orders/info-requests")), 200, R.infoRequestsResponse, "open-info-requests")
    await expectContract(await myWork(get("/orders/my-work")), 200, R.floristQueueResponse, "my-work")
    await expectContract(await myWork(get("/orders/my-work?scope=team")), 200, R.floristQueueResponse, "my-work")
    await expectContract(await reportWork(send_(`/orders/${id}/my-work`, "POST", { action: "START" }), ps({ id })), 200, R.floristWorkResponse, "florist-work")

    const other = await draft()
    await expectContract(await cancel(send_(`/orders/${other.id}/cancel`, "POST", { reason: "Khách đổi ý" }), ps({ id: other.id })), 200, R.orderResponse, "order")
    const xlsx = await exportOrders(get("/orders/export?from_date=2026-01-01"))
    expect(xlsx.status).toBe(200)
    expect(xlsx.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  })

  it("thu tiền & duyệt: báo giá đơn, VAT, thu tiền, giao trước thu sau, hạn mức, bàn làm việc", async () => {
    const quoted = await draft(0)
    await expectContract(await quote(send_(`/orders/${quoted.id}/quote`, "POST", { totalVnd: 900_000, note: "Giá mùa lễ" }), ps({ id: quoted.id })), 200, R.quoteOrderResponse, "quote")
    await expectContract(await getVat(get(`/orders/${quoted.id}/vat`), ps({ id: quoted.id })), 200, R.orderVatResponse, "vat")
    await expectContract(
      await putVat(send_(`/orders/${quoted.id}/vat`, "PUT", { enabled: true, rate: 8, company_name: "Công ty A", tax_code: "0123456789" }), ps({ id: quoted.id })),
      200,
      R.orderVatResponse,
      "vat"
    )
    await expectContract(await pay(send_(`/orders/${quoted.id}/payments`, "POST", { amountVnd: 300_000, method: "CASH" }), ps({ id: quoted.id })), 201, R.orderPaymentResponse, "payment")

    // Trần công nợ 0 → yêu cầu giao trước luôn chờ Điều hành (kể cả trong chính sách thu tiền của tiệm)
    await expectContract(await getDbpSettings(get("/orders/deliver-before-pay-settings")), 200, R.deliverBeforePaySettingsResponse, "dbp-settings")
    await expectContract(
      await putDbpSettings(send_("/orders/deliver-before-pay-settings", "PUT", { allowSelfDecide: false, customerDebtCapVnd: 0 })),
      200,
      R.deliverBeforePaySettingsResponse,
      "dbp-settings"
    )
    const unpaid = await draft()
    const asked = await expectContract(
      await deliverBeforePay(send_(`/orders/${unpaid.id}/deliver-before-pay`, "POST", { reason: "Khách quen, chuyển khoản tối nay" }), ps({ id: unpaid.id })),
      201,
      R.deliverBeforePayResponse,
      "dbp-request"
    )
    const requestId = (asked.request as { id: string }).id
    await expectContract(await approvalRequests(get("/orders/approval-requests?status=PENDING")), 200, R.approvalRequestsResponse, "approval-requests")
    await expectContract(
      await decide(send_(`/orders/approval-requests/${requestId}/decision`, "POST", { approve: false, note: "Chưa đủ điều kiện" }), ps({ requestId })),
      200,
      R.decisionResponse,
      "decision"
    )
    await expectContract(await getEntryActions(get("/orders/entry-actions")), 200, R.entryActionsResponse, "entry-actions")
    await expectContract(
      await putEntryActions(send_("/orders/entry-actions", "PUT", { default: { contact: true }, bySource: { CATALOG: { order: false, contact: true } } })),
      200,
      R.entryActionsResponse,
      "entry-actions"
    )
    await expectContract(await workbench(get("/orders/workbench")), 200, R.workbenchResponse, "workbench")
    await expectContract(await coordinationQueue(get("/orders/coordination-queue")), 200, R.coordinationQueueResponse, "coordination-queue")
    await expectContract(await leadQueue(get("/orders/lead-queue")), 200, R.leadQueueResponse, "lead-queue")
  })

  it("báo giá: tạo, liệt kê, đọc, sửa, phiên bản, gửi, chuyển thành đơn", async () => {
    const created = await expectContract(
      await createQuotation(send_("/quotations", "POST", { items: [{ name: "Lẵng hoa khai trương", qty: 1, unitPrice: 1_500_000 }], shippingFee: 50_000, notes: "Giao sáng" })),
      201,
      R.quotationResponse,
      "quotation"
    )
    const id = (created.data as { id: string }).id
    await expectContract(await listQuotations(get("/quotations?limit=5")), 200, R.quotationsResponse, "quotations")
    await expectContract(await getQuotation(get(`/quotations/${id}`), ps({ id })), 200, R.quotationResponse, "quotation")
    await expectContract(
      await patchQuotation(send_(`/quotations/${id}`, "PATCH", { discountAmount: 100_000, items: [{ name: "Lẵng hoa khai trương", variantLabel: "Size lớn", qty: 1, unitPrice: 1_800_000 }] }), ps({ id })),
      200,
      R.quotationResponse,
      "quotation"
    )
    await expectContract(await revisions(get(`/quotations/${id}/revisions`), ps({ id })), 200, R.quotationRevisionsResponse, "quotation-revisions")
    await expectContract(await send(send_(`/quotations/${id}/send`, "POST", {}), ps({ id })), 200, R.quotationResponse, "quotation")
    await expectContract(await convert(send_(`/quotations/${id}/convert`, "POST", {}), ps({ id })), 200, R.convertQuotationResponse, "quotation-convert")
  })
})
