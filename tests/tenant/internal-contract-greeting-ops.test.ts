import { randomUUID } from "node:crypto"

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import * as B from "@/app/api/v1/_contracts/responses-greeting-boards"
import * as O from "@/app/api/v1/_contracts/responses-greeting-ops"
import * as R from "@/app/api/v1/_contracts/responses-greeting"
import { POST as decideCancel } from "@/app/api/v1/greeting-card/cancellation-requests/[id]/decision/route"
import { POST as followUp } from "@/app/api/v1/greeting-card/cancellation-requests/[id]/follow-up/route"
import { GET as listCancels, POST as proposeCancel } from "@/app/api/v1/greeting-card/cancellation-requests/route"
import { PATCH as patchBranch } from "@/app/api/v1/greeting-card/chain-branches/[branchCode]/route"
import { POST as importBranches } from "@/app/api/v1/greeting-card/chain-branches/bulk-import/route"
import { GET as listBranches } from "@/app/api/v1/greeting-card/chain-branches/route"
import { POST as decideChange } from "@/app/api/v1/greeting-card/change-requests/[id]/decision/route"
import { GET as board } from "@/app/api/v1/greeting-card/coordinator-board/route"
import { GET as work } from "@/app/api/v1/greeting-card/coordinator-work/route"
import { POST as decideDiscount } from "@/app/api/v1/greeting-card/discount-requests/[id]/decision/route"
import { GET as inbox } from "@/app/api/v1/greeting-card/inbox/route"
import { POST as testNotify } from "@/app/api/v1/greeting-card/integrations/notifications/test/route"
import { PUT as putNotify } from "@/app/api/v1/greeting-card/integrations/notifications/route"
import { DELETE as disableWebhook, POST as rotateWebhook } from "@/app/api/v1/greeting-card/integrations/payment-webhook/route"
import { GET as integrations } from "@/app/api/v1/greeting-card/integrations/route"
import { GET as getStaffNotify, PUT as putStaffNotify } from "@/app/api/v1/greeting-card/integrations/staff-notifications/route"
import { GET as telegram } from "@/app/api/v1/greeting-card/integrations/telegram-dispatch/route"
import { GET as zalo } from "@/app/api/v1/greeting-card/integrations/zalo-dispatch/route"
import { POST as markRead } from "@/app/api/v1/greeting-card/messages/read/route"
import { GET as recipients } from "@/app/api/v1/greeting-card/messages/recipients/route"
import { GET as thread, POST as sendMessage } from "@/app/api/v1/greeting-card/messages/route"
import { POST as discountRequest } from "@/app/api/v1/greeting-card/orders/[id]/discount-request/route"
import { POST as handleEvent } from "@/app/api/v1/greeting-card/payment-events/[id]/handle/route"
import { GET as paymentEvents } from "@/app/api/v1/greeting-card/payment-events/route"
import { GET as getVisibility, PUT as putVisibility } from "@/app/api/v1/greeting-card/sale-visibility/route"
import { GET as pipeline } from "@/app/api/v1/greeting-card/tracking-pipeline/route"
import { POST as decideDismiss } from "@/app/api/v1/greeting-card/tracking/decide-dismiss/route"
import { POST as dismiss } from "@/app/api/v1/greeting-card/tracking/dismiss/route"
import { POST as restore } from "@/app/api/v1/greeting-card/tracking/restore/route"
import { GET as tracking } from "@/app/api/v1/greeting-card/tracking/route"
import { GET as timeline } from "@/app/api/v1/greeting-card/tracking/timeline/route"
import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { submitOrderChange } from "@/modules/greeting-card/use-cases/order-change"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi Thẻ chào — Hộp việc, theo dõi, tin nhắn, yêu cầu, tích hợp (OpenAPI nội bộ, PO 07/11/2026). */
const BASE = "http://localhost/api/v1/greeting-card"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })
const DATE = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)

describe("hợp đồng — Thẻ chào: vận hành", () => {
  let t: Tenant
  let productId: string
  let phoneSeq = 0
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  async function newOrder() {
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: `c-${randomUUID().slice(0, 6)}`, name: "C", productIds: [productId], createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, productId)
    const phone = `09123456${String(phoneSeq++).padStart(2, "0")}`
    const order = await submitBrochureOrder(link.sendCode, {
      customerName: "Khách", customerPhone: phone, recipientName: "Người nhận", recipientPhone: "0912345678", confirmedTerms: true,
      selectedPromotionId: "promo-free-card", deliveryDate: DATE, deliveryTimeSlot: "08:00 - 10:00", deliveryAddress: "1 Lê Lợi, Q1", cardMessage: "Chúc mừng",
    })
    return { ...order, phone, sessionId: link.sessionId }
  }

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-van-hanh-tc")
    productId = (await new ProductRepository().create(t.ctx, { code: "VH-1", name: "Bó hồng", attributes: { price: 500000 } })).id
  })
  afterEach(() => vi.unstubAllGlobals())
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Hộp việc, bảng Điều phối, pipeline, theo dõi (mọi góc nhìn), dòng thời gian, bỏ/khôi phục theo dõi", async () => {
    const a = await newOrder()
    await newOrder()
    await expectContract(await inbox(get("/inbox")), 200, O.inboxResponse, "gc-inbox")
    await expectContract(await board(get(`/coordinator-board?date=${DATE}`)), 200, B.coordinatorBoardResponse, "gc-board")
    await expectContract(await work(get("/coordinator-work")), 200, B.coordinatorWorkResponse, "gc-work")
    await expectContract(await pipeline(get("/tracking-pipeline")), 200, B.trackingPipelineResponse, "gc-pipeline")
    const today = new Date().toISOString().slice(0, 10)
    for (const query of ["view=list", "view=queue", "view=kanban", `view=calendar&from=${today}&to=${DATE}`, "view=dashboard"]) {
      await expectContract(await tracking(get(`/tracking?${query}`)), 200, B.trackingResponse, "gc-tracking")
    }
    await expectContract(await timeline(get(`/tracking/timeline?order_id=${a.orderId}`)), 200, R.timelineResponse, "gc-timeline")
    // Có R6: bỏ trực tiếp; khôi phục; đề xuất của Sale rồi Điều hành quyết
    await expectContract(
      await dismiss(send("/tracking/dismiss", "POST", { id: a.orderId, type: "ORDER", reason_id: "duplicate", reason_text: "Đơn trùng" })),
      200,
      R.dismissProposalResponse,
      "gc-dismiss"
    )
    await expectContract(await restore(send("/tracking/restore", "POST", { id: a.orderId, type: "ORDER", reason: "Nhầm" })), 200, R.restoredResponse, "gc-restore")
    const sale = await addStaffWithSession(t, "sale", "sale-de-xuat-bo")
    const proposal = withSession(`${BASE}/tracking/dismiss`, sale.token, { method: "POST", body: JSON.stringify({ id: a.orderId, type: "ORDER", reason_id: "duplicate", reason_text: "Đơn trùng" }) })
    expect((await dismiss(proposal)).status).toBe(200)
    await expectContract(await decideDismiss(send("/tracking/decide-dismiss", "POST", { id: a.orderId, type: "ORDER", approve: false })), 200, R.dismissDecisionResponse, "gc-decide-dismiss")
  })

  it("tin nhắn nội bộ, yêu cầu huỷ/đổi/giảm giá", async () => {
    const o = await newOrder()
    await expectContract(await recipients(get("/messages/recipients")), 200, R.recipientsResponse, "gc-recipients")
    const sent = await expectContract(
      await sendMessage(send("/messages", "POST", { order_id: o.orderId, to: { kind: "ROLE", role: "COORDINATOR" }, body: "Khách hẹn giao sớm" })),
      201,
      R.messageSentResponse,
      "gc-message"
    )
    await expectContract(await thread(get(`/messages?order_id=${o.orderId}`)), 200, R.threadResponse, "gc-thread")
    await expectContract(await markRead(send("/messages/read", "POST", { message_ids: [(sent.data as { id: string }).id] })), 200, R.messagesReadResponse, "gc-read")

    const discount = await discountRequest(send(`/orders/${o.orderId}/discount-request`, "POST", { percent: 10, reason: "Khách quen" }), ps({ id: o.orderId }))
    const discountId = ((await discount.json()) as { data: { id: string } }).data.id
    // Không tự duyệt phiếu của mình: một Điều hành khác duyệt giảm giá và huỷ đơn
    const boss = await addStaffWithSession(t, "dieu_hanh", "dieu-hanh-duyet")
    const bossSend = (path: string, body: unknown) => withSession(`${BASE}${path}`, boss.token, { method: "POST", body: JSON.stringify(body) })
    await expectContract(await decideDiscount(bossSend(`/discount-requests/${discountId}/decision`, { approve: true, note: "Đồng ý" }), ps({ id: discountId })), 200, R.discountDecisionResponse, "gc-discount-decision")

    const change = await submitOrderChange(new Request("http://localhost/api"), o.orderCode, { phoneLast4: o.phone.slice(-4) }, { deliveryNote: "Gửi bảo vệ" })
    await expectContract(await decideChange(send(`/change-requests/${change.id}/decision`, "POST", { approve: true }), ps({ id: change.id })), 200, R.changeDecisionResponse, "gc-change-decision")

    const proposed = await expectContract(
      await proposeCancel(send("/cancellation-requests", "POST", { order_id: o.orderId, type: "CANCEL_ONLY", reason: "Khách đổi ý" })),
      201,
      R.cancellationProposalResponse,
      "gc-cancel-proposal"
    )
    await expectContract(await listCancels(get("/cancellation-requests")), 200, R.cancellationsResponse, "gc-cancels")
    const requestId = (proposed.data as { id: string }).id
    await expectContract(await decideCancel(bossSend(`/cancellation-requests/${requestId}/decision`, { approve: true, note: "Đồng ý huỷ" }), ps({ id: requestId })), 200, R.cancellationDecisionResponse, "gc-cancel-decision")
  })

  it("việc sau huỷ: hoàn tiền", async () => {
    const o = await newOrder()
    // Giữ bất biến orders_money_check: balance_vnd = total_vnd − paid_vnd
    const { total_vnd } = await prisma.orders.findUniqueOrThrow({ where: { id: o.orderId }, select: { total_vnd: true } })
    await prisma.orders.update({ where: { id: o.orderId }, data: { paid_vnd: 150_000, balance_vnd: total_vnd.minus(150_000) } })
    const proposed = await proposeCancel(send("/cancellation-requests", "POST", { order_id: o.orderId, type: "FULL_REFUND", reason: "Khách huỷ", refund_amount_vnd: 150_000 }))
    const requestId = ((await proposed.json()) as { data: { id: string } }).data.id
    const boss = await addStaffWithSession(t, "dieu_hanh", "dieu-hanh-hoan")
    const decision = withSession(`${BASE}/cancellation-requests/${requestId}/decision`, boss.token, { method: "POST", body: JSON.stringify({ approve: true }) })
    expect((await decideCancel(decision, ps({ id: requestId }))).status).toBe(200)
    await expectContract(await followUp(send(`/cancellation-requests/${requestId}/follow-up`, "POST", { note: "Đã chuyển khoản hoàn" }), ps({ id: requestId })), 200, R.cancellationFollowUpResponse, "gc-follow-up")
  })

  it("tích hợp, quyền xem của Sale, giao dịch ngân hàng, chi nhánh chuỗi", async () => {
    await expectContract(await integrations(get("/integrations")), 200, O.integrationStatusResponse, "gc-integrations")
    await expectContract(await rotateWebhook(send("/integrations/payment-webhook", "POST")), 201, O.webhookKeyResponse, "gc-webhook-key")
    await expectContract(await disableWebhook(send("/integrations/payment-webhook", "DELETE")), 200, O.webhookDisabledResponse, "gc-webhook-off")
    await expectContract(
      await putNotify(send("/integrations/notifications", "PUT", { enabled: true, channel: "ESMS", credentials: { apiKey: "khoa-thu", secretKey: "bi-mat-thu", brandname: "TIEMHOA" } })),
      200,
      O.notifySettingsResponse,
      "gc-notify"
    )
    // Nhà cung cấp SMS giả lập — không gọi mạng thật
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ CodeResult: "100" }), { status: 200, headers: { "content-type": "application/json" } })))
    await expectContract(await testNotify(send("/integrations/notifications/test", "POST", { phone: "0912345678" })), 200, O.notifyTestResponse, "gc-notify-test")
    await expectContract(await getStaffNotify(get("/integrations/staff-notifications")), 200, O.staffNotifySettingsResponse, "gc-staff-notify")
    await expectContract(await putStaffNotify(send("/integrations/staff-notifications", "PUT", { enabled: true, channels: ["APP_INBOX"] })), 200, O.staffNotifySavedResponse, "gc-staff-notify-saved")
    const operator = await createTenant("van-hanh-nen-tang-tc")
    await new PlatformOperatorRepository().grant(operator.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)
    const policy = withSession(`${BASE}/integrations/staff-notifications/saas-policy`, operator.token, {
      method: "PUT", body: JSON.stringify({ target_organization_id: t.organizationId, allowed_channels: ["APP_INBOX", "TELEGRAM"] }),
    })
    await expectContract(await telegram(get("/integrations/telegram-dispatch")), 200, O.telegramDispatchResponse, "gc-telegram")
    await expectContract(await zalo(get("/integrations/zalo-dispatch")), 200, O.zaloDispatchResponse, "gc-zalo")
    await expectContract(await getVisibility(get("/sale-visibility")), 200, O.saleVisibilityResponse, "gc-visibility")
    await expectContract(await putVisibility(send("/sale-visibility", "PUT", { mode: "OWN" })), 200, O.saleVisibilityResponse, "gc-visibility")

    const event = await prisma.greeting_payment_events.create({
      data: { organization_id: t.organizationId, provider: "SEPAY", external_id: "tx-1", amount_vnd: 300_000, content: "CK khong ma", status: "UNMATCHED" },
    })
    await expectContract(await paymentEvents(get("/payment-events?status=UNMATCHED")), 200, O.paymentEventsResponse, "gc-payment-events")
    await expectContract(await handleEvent(send(`/payment-events/${event.id}/handle`, "POST", { note: "Khách chuyển nhầm, đã hoàn" }), ps({ id: event.id })), 200, O.paymentEventHandledResponse, "gc-event-handled")

    await makeChainOrganization(t)
    await expectContract(
      await importBranches(send("/chain-branches/bulk-import", "POST", {
        branches: [{ branchId: "CN-Q3", branchName: "Chi nhánh Quận 3", address: "5 Võ Văn Tần", district: "Quận 3", province: "TP.HCM", latitude: 10.77, longitude: 106.69, channels: { phone: "0909000111" } }],
      })),
      200,
      O.chainBranchImportResponse,
      "gc-branch-import"
    )
    await expectContract(await listBranches(get("/chain-branches")), 200, O.chainBranchesResponse, "gc-branches")
    await expectContract(await patchBranch(send("/chain-branches/CN-Q3", "PATCH", { is_active: false }), ps({ branchCode: "CN-Q3" })), 200, O.chainBranchPatchResponse, "gc-branch-patch")
  })
})
