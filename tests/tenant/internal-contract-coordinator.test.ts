import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as O from "@/app/api/v1/_contracts/responses-coordinator-ops"
import * as R from "@/app/api/v1/_contracts/responses-coordinator"
import { POST as resolveException } from "@/app/api/v1/coordinator/exceptions/[id]/resolve/route"
import { POST as assignPartner } from "@/app/api/v1/coordinator/orders/[id]/assign-partner/route"
import { POST as cancelOrder } from "@/app/api/v1/coordinator/orders/[id]/cancel/route"
import { POST as closeOrder } from "@/app/api/v1/coordinator/orders/[id]/close/route"
import { PATCH as customFields } from "@/app/api/v1/coordinator/orders/[id]/custom-fields/route"
import { POST as delivery } from "@/app/api/v1/coordinator/orders/[id]/delivery/route"
import { POST as dispatchToChat } from "@/app/api/v1/coordinator/orders/[id]/dispatch-to-chat/route"
import { POST as openException } from "@/app/api/v1/coordinator/orders/[id]/exceptions/route"
import { POST as decidePayment } from "@/app/api/v1/coordinator/orders/[id]/payments/[paymentId]/decision/route"
import { GET as listPayments, POST as recordPayment } from "@/app/api/v1/coordinator/orders/[id]/payments/route"
import { POST as production } from "@/app/api/v1/coordinator/orders/[id]/production/route"
import { POST as qc } from "@/app/api/v1/coordinator/orders/[id]/qc/route"
import { GET as getOrder } from "@/app/api/v1/coordinator/orders/[id]/route"
import { PATCH as stage } from "@/app/api/v1/coordinator/orders/[id]/stage/route"
import { GET as listOrders, POST as createOrder } from "@/app/api/v1/coordinator/orders/route"
import { PATCH as patchPartner } from "@/app/api/v1/coordinator/partners/[id]/route"
import { PATCH as partnershipStatus } from "@/app/api/v1/coordinator/partners/[id]/status/route"
import { PATCH as partnerTools } from "@/app/api/v1/coordinator/partners/[id]/tools/route"
import { POST as linkExisting } from "@/app/api/v1/coordinator/partners/link-existing/route"
import { GET as listPartners, POST as createPartner } from "@/app/api/v1/coordinator/partners/route"
import { POST as acknowledge } from "@/app/api/v1/coordinator/reminders/acknowledge/route"
import { GET as reminders } from "@/app/api/v1/coordinator/reminders/route"
import { GET as getPolicy, PUT as putPolicy } from "@/app/api/v1/coordinator/settings/reminders/route"
import { GET as getTemplate, PUT as putTemplate } from "@/app/api/v1/coordinator/templates/[id]/reminders/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi Điều phối `/coordinator/*` — đơn, thanh toán, đối tác, nhắc việc (OpenAPI nội bộ, PO 07/11/2026). */
const BASE = "http://localhost/api/v1/coordinator"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })
const ORDER = {
  customerName: "Nguyễn Văn An", customerPhone: "0987654321", customerTier: "VIP", recipientName: "Trần Thị Bình", recipientPhone: "0901234567",
  deliveryAddress: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" },
  deliveryTargetTime: "17:00 hôm nay", deliveryTargetAt: new Date(Date.now() + 6 * 3600_000).toISOString(), productTitle: "Bó hoa hồng Pastel",
  unitPriceVnd: 850000, flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng", role: "Chủ đạo" }], cardMessage: "Chúc mừng sinh nhật!",
}

describe("hợp đồng — Điều phối", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const newOrder = async () => ((await (await createOrder(send("/orders", "POST", ORDER))).json()) as { order: { id: string } }).order.id
  const asset = async () =>
    (await new AssetRepository().create(t.ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${t.organizationId}/dieu-phoi/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: t.userId,
    })).id

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-dieu-phoi")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đơn: tạo, liệt kê, đọc, chuyển bước, trường tuỳ biến, đối tác, sản xuất, QC, giao, sự cố, đóng, huỷ", async () => {
    const created = await expectContract(await createOrder(send("/orders", "POST", ORDER)), 201, R.coordinatorOrderResponse, "co-order")
    const id = (created.order as { id: string }).id
    await expectContract(await listOrders(get("/orders?limit=10")), 200, R.coordinatorOrdersResponse, "co-orders")
    await expectContract(await getOrder(get(`/orders/${id}`), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")
    await expectContract(await customFields(send(`/orders/${id}/custom-fields`, "PATCH", { customFields: { ghiChu: "Giao cổng sau" } }), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")
    await expectContract(await stage(send(`/orders/${id}/stage`, "PATCH", { stage: "PLANNING", nextAction: "Chọn xưởng" }), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")
    const partner = await expectContract(
      await createPartner(send("/partners", "POST", { code: "XUONG-01", name: "Xưởng 01", phone: "0912345678", capacityDaily: 10 })),
      201,
      O.createPartnerResponse,
      "co-partner"
    )
    const partnerId = (partner.partner as { id: string }).id
    await expectContract(await patchPartner(send(`/partners/${partnerId}`, "PATCH", { code: "XUONG-01", name: "Xưởng số 1", phone: "0912345678" }), ps({ id: partnerId })), 200, O.partnerResponse, "co-partner")
    await expectContract(await listPartners(get("/partners?active=1")), 200, O.chainPartnersResponse, "co-partners")
    await expectContract(await assignPartner(send(`/orders/${id}/assign-partner`, "POST", { partnerId, agreedCraftFeeVnd: 150_000 }), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")
    const imageId = await asset()
    await expectContract(
      await production(send(`/orders/${id}/production`, "POST", { action: "MARK_READY", progressPercent: 100, finishedAssetIds: [imageId] }), ps({ id })),
      200,
      R.coordinatorOrderResponse,
      "co-order"
    )
    await expectContract(await qc(send(`/orders/${id}/qc`, "POST", { decision: "PASSED", notes: "Đẹp" }), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")
    const exception = await expectContract(
      await openException(send(`/orders/${id}/exceptions`, "POST", { type: "CUSTOMER_CHANGE", description: "Khách đổi giờ giao" }), ps({ id })),
      201,
      R.coordinatorOrderResponse,
      "co-order"
    )
    const exceptionId = (exception.order as { exceptions: { id: string }[] }).exceptions[0]?.id ?? ""
    await expectContract(await resolveException(send(`/exceptions/${exceptionId}/resolve`, "POST", { resolution: "Đã đổi giờ" }), ps({ id: exceptionId })), 200, R.coordinatorOrderResponse, "co-order")
    const pod = await asset()
    for (const extra of [{ event: "PICKED_UP" }, { event: "DELIVERED_SUCCESS", podAssetId: pod, recipientSignedName: "Bình" }]) {
      const body = { shipperName: "Anh Tâm", shipperPhone: "0909000111", ...extra }
      await expectContract(await delivery(send(`/orders/${id}/delivery`, "POST", body), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")
    }
    await expectContract(await recordPayment(send(`/orders/${id}/payments`, "POST", { kind: "DEPOSIT", amountVnd: 850_000, paymentMethod: "CASH" }), ps({ id })), 201, R.coordinatorOrderResponse, "co-order")
    await expectContract(await listPayments(get(`/orders/${id}/payments`), ps({ id })), 200, O.coordinatorPaymentsResponse, "co-payments")
    await expectContract(await closeOrder(send(`/orders/${id}/close`, "POST", { partnerRating: 5, notes: "Tốt" }), ps({ id })), 200, R.coordinatorOrderResponse, "co-order")

    const other = await newOrder()
    await expectContract(await cancelOrder(send(`/orders/${other}/cancel`, "POST", { reason: "Khách huỷ" }), ps({ id: other })), 200, R.coordinatorOrderResponse, "co-order")
  })

  it("khoản thu chờ xác nhận: duyệt", async () => {
    const id = await newOrder()
    // Phiếu do một nhân viên khác ghi — không tự duyệt phiếu của mình
    const staff = await addStaffWithSession(t, "dieu_phoi", "dieu-phoi-thu-tien")
    const pending = await prisma.order_payments.create({
      data: { organization_id: t.organizationId, order_id: id, kind: "DEPOSIT", amount_vnd: 200_000, status: "PENDING", collected_by: staff.userId, collected_at: new Date() },
    })
    await expectContract(
      await decidePayment(send(`/orders/${id}/payments/${pending.id}/decision`, "POST", { approve: true }), ps({ id, paymentId: pending.id })),
      200,
      R.coordinatorOrderResponse,
      "co-order"
    )
  })

  it("nhắc việc: danh sách, xác nhận, cấu hình của tiệm và của mẫu", async () => {
    const id = await newOrder()
    await expectContract(await reminders(get("/reminders")), 200, O.remindersResponse, "co-reminders")
    await expectContract(await acknowledge(send("/reminders/acknowledge", "POST", { orderId: id, milestone: "M0", action: "SNOOZED", snoozeMinutes: 15 })), 200, O.acknowledgeResponse, "co-ack")
    await expectContract(await getPolicy(get("/settings/reminders")), 200, O.reminderPolicyResponse, "co-policy")
    await expectContract(await putPolicy(send("/settings/reminders", "PUT", { m0MinutesAfterPaid: 20 })), 200, O.reminderPolicyResponse, "co-policy")
    const productId = (await new ProductRepository().create(t.ctx, { code: "MAU-1", name: "Mẫu nhắc việc", attributes: {} })).id
    await expectContract(await getTemplate(get(`/templates/${productId}/reminders`), ps({ id: productId })), 200, O.templateRemindersResponse, "co-template")
    await expectContract(await putTemplate(send(`/templates/${productId}/reminders`, "PUT", { m1MinutesBeforeDelivery: 90 }), ps({ id: productId })), 200, O.templateRemindersResponse, "co-template")
    await expectContract(await getTemplate(get(`/templates/${productId}/reminders`), ps({ id: productId })), 200, O.templateRemindersResponse, "co-template")
  })

  it("chuỗi: cửa hàng đối tác (tạo, liên kết, trạng thái, công cụ), gửi thẻ đơn sang chat", async () => {
    await makeChainOrganization(t)
    const provisioned = await expectContract(
      await createPartner(send("/partners", "POST", {
        partnerStoreName: "Tiệm Quận 7", partnerCode: "Q7", contactName: "Chị Hạnh", contactPhone: "0909123456", contactEmail: "q7@vi-du.test", province: "TP.HCM",
      })),
      201,
      O.createPartnerResponse,
      "co-provision"
    )
    const partnership = provisioned.data as { id: string; partnerOrgId: string }
    await expectContract(await listPartners(get("/partners")), 200, O.chainPartnersResponse, "co-chain-partners")
    await expectContract(await partnerTools(send(`/partners/${partnership.id}/tools`, "PATCH", { unlockedTools: ["catalog"] }), ps({ id: partnership.id })), 200, O.partnerToolsResponse, "co-tools")
    const id = await newOrder()
    await expectContract(
      await dispatchToChat(send(`/orders/${id}/dispatch-to-chat`, "POST", { targetPartnerOrgId: partnership.partnerOrgId }), ps({ id })),
      200,
      O.dispatchToChatResponse,
      "co-dispatch-chat"
    )
    await expectContract(await partnershipStatus(send(`/partners/${partnership.id}/status`, "PATCH", { status: "SUSPENDED", reason: "Tạm ngưng để kiểm hồ sơ" }), ps({ id: partnership.id })), 200, O.partnershipResponse, "co-status")
    await createTenant("tiem-co-san")
    await expectContract(
      await linkExisting(send("/partners/link-existing", "POST", { identifier: "tiem-co-san@vi-du.test", partnerCode: "CS1" })),
      201,
      O.partnershipResponse,
      "co-link"
    )
    expect(partnership.id).toBeTruthy()
  })
})
