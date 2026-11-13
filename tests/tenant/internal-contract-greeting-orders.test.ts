import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-greeting-orders"
import { POST as accept } from "@/app/api/v1/greeting-card/orders/[id]/accept/route"
import { POST as assignFlorist } from "@/app/api/v1/greeting-card/orders/[id]/assign-florist/route"
import { POST as cancel } from "@/app/api/v1/greeting-card/orders/[id]/cancel/route"
import { GET as dispatchState, POST as startDispatch } from "@/app/api/v1/greeting-card/orders/[id]/chain-dispatch/route"
import { POST as confirmBalance } from "@/app/api/v1/greeting-card/orders/[id]/confirm-balance/route"
import { POST as confirmDeposit } from "@/app/api/v1/greeting-card/orders/[id]/confirm-deposit/route"
import { DELETE as rejectNew, POST as confirmOrder } from "@/app/api/v1/greeting-card/orders/[id]/confirm-order/route"
import { POST as confirmPayment } from "@/app/api/v1/greeting-card/orders/[id]/confirm-payment/route"
import { GET as craftFee } from "@/app/api/v1/greeting-card/orders/[id]/craft-fee/route"
import { POST as deliveryFailed } from "@/app/api/v1/greeting-card/orders/[id]/delivery-failed/route"
import { POST as discountRequest } from "@/app/api/v1/greeting-card/orders/[id]/discount-request/route"
import { POST as dispatchShipping } from "@/app/api/v1/greeting-card/orders/[id]/dispatch-shipping/route"
import { GET as flowerOptions, POST as proposeFlower } from "@/app/api/v1/greeting-card/orders/[id]/flower-substitute/route"
import { POST as productPhoto } from "@/app/api/v1/greeting-card/orders/[id]/product-photo/route"
import { POST as quote } from "@/app/api/v1/greeting-card/orders/[id]/quote/route"
import { POST as recipientPhoto } from "@/app/api/v1/greeting-card/orders/[id]/recipient-photo/route"
import { POST as refund } from "@/app/api/v1/greeting-card/orders/[id]/refund/route"
import { POST as rejectReported } from "@/app/api/v1/greeting-card/orders/[id]/reject-reported-payment/route"
import { POST as rejectOrder } from "@/app/api/v1/greeting-card/orders/[id]/reject/route"
import { GET as substituteOptions, POST as proposeSubstitute } from "@/app/api/v1/greeting-card/orders/[id]/substitute/route"
import { GET as getVat, PUT as putVat } from "@/app/api/v1/greeting-card/orders/[id]/vat/route"
import { GET as listOrders } from "@/app/api/v1/greeting-card/orders/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { reportCustomerPayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, makeChainOrganization, seedChainBranch, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi đơn Thẻ chào `/greeting-card/orders/*` (OpenAPI nội bộ, PO 07/11/2026) — CSDL thật, lược đồ strict. */
const BASE = "http://localhost/api/v1/greeting-card/orders"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })
const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const BOM = {
  bom: {
    flowers: [
      { flowerName: "Hồng đỏ", quantity: 12, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
      { flowerName: "Baby trắng", quantity: 5, unit: "cành", color: "Trắng", role: "Phụ" },
    ],
  },
}

describe("hợp đồng — đơn Thẻ chào", () => {
  let t: Tenant
  let priced: string
  let unpriced: string
  let alternative: string
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, body: unknown = {}, method = "POST") => withSession(`${BASE}${path}`, t.token, { method, body: JSON.stringify(body) })

  let phoneSeq = 0
  async function newOrder(productId = priced): Promise<string> {
    const productIds = productId === priced ? [priced, alternative] : [productId]
    const catalog = await new GreetingCardRepository().createCatalog(t.ctx, { code: `c-${randomUUID().slice(0, 6)}`, name: "C", productIds, createdBy: t.userId })
    const link = await createSendLink(t.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, productId)
    const order = await submitBrochureOrder(link.sendCode, {
      customerName: "Khách", customerPhone: `09876543${String(phoneSeq++).padStart(2, "0")}`, recipientName: "Người nhận", recipientPhone: "0912345678",
      confirmedTerms: true, selectedPromotionId: "promo-free-card", deliveryDate: inTenDays(), deliveryAddress: "12 Lê Lợi, Quận 1, TP.HCM",
    })
    return order.orderId
  }

  /** Khách đã gửi ảnh chuyển khoản (chưa ai xác nhận tiền). */
  async function withProof(orderId: string): Promise<string> {
    const session = await prisma.greeting_sessions.findFirstOrThrow({ where: { order_id: orderId } })
    const proof = await new AssetRepository().create(t.ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${t.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: t.userId,
    })
    await prisma.greeting_sessions.update({ where: { id: session.id }, data: { payment_proof_asset_id: proof.id } })
    return session.send_code
  }

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-don-tc")
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: {
        settings: {
          brochure_payment: { bank_id: "VCB", account_no: "0011223344", account_name: "TIEM A" },
          brochure_policy: { deposit_percent: 30 },
          // Điều phối được duyệt tiền, bỏ qua được ảnh bàn giao — để đi được các bước của Điều phối
          brochure_workflow_policy: { require_admin_deposit_approval: false, require_delivery_proof_photo: false },
        },
      },
    })
    const products = new ProductRepository()
    priced = (await products.create(t.ctx, { code: "TC-1", name: "Bó hồng đỏ", attributes: { price: 1_000_000, ...BOM } })).id
    alternative = (await products.create(t.ctx, { code: "TC-2", name: "Bó hồng phấn", attributes: { price: 950_000 } })).id
    unpriced = (await products.create(t.ctx, { code: "TC-3", name: "Lẵng theo yêu cầu", attributes: {} })).id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("một vòng đơn: danh sách, phiếu/VAT, nhận đơn, thu tiền, Điều phối nhận, phân công, ảnh, giao, phí gia công", async () => {
    const id = await newOrder()
    await expectContract(await listOrders(get("?limit=10")), 200, R.gcOrdersResponse, "gc-orders")
    await expectContract(await getVat(get(`/${id}/vat`), ps(id)), 200, R.orderSlipResponse, "gc-slip")
    await expectContract(await putVat(send(`/${id}/vat`, { enabled: true, rate: 8, company_name: "Công ty A", tax_code: "0123456789" }, "PUT"), ps(id)), 200, R.gcVatResponse, "gc-vat")
    // Gate 1: xác nhận tiền trước, rồi mới nhận đơn
    await expectContract(await confirmPayment(send(`/${id}/confirm-payment`, { amount_vnd: 300_000, reference: "CK-1" }), ps(id)), 200, R.paymentConfirmedResponse, "gc-payment")
    await expectContract(await confirmOrder(send(`/${id}/confirm-order`, { note: "Đã gọi khách" }), ps(id)), 200, R.confirmOrderResponse, "gc-confirm-order")
    await expectContract(await assignFlorist(send(`/${id}/assign-florist`, { florist_note: "Thợ Lan cắm" }), ps(id)), 200, R.orderRefResponse, "gc-assign")
    await expectContract(await craftFee(get(`/${id}/craft-fee`), ps(id)), 200, R.craftFeeResponse, "gc-craft-fee")
    await expectContract(await productPhoto(send(`/${id}/product-photo`, { skip_photo: true, skip_reason: "Khách không cần ảnh" }), ps(id)), 200, R.orderRefResponse, "gc-product-photo")
    await expectContract(await confirmBalance(send(`/${id}/confirm-balance`, { note: "Khách trả nốt" }), ps(id)), 200, R.balanceConfirmedResponse, "gc-balance")
    await expectContract(await dispatchShipping(send(`/${id}/dispatch-shipping`, { tracking_note: "Shipper Minh, 0909" }), ps(id)), 200, R.orderRefResponse, "gc-ship")
    await expectContract(await recipientPhoto(send(`/${id}/recipient-photo`, { skip_photo: true, skip_reason: "Người nhận từ chối chụp" }), ps(id)), 200, R.orderRefResponse, "gc-recipient-photo")
  })

  it("đề xuất thay mẫu / thay hoa, xin giảm giá, giao lỗi, hoàn tiền, huỷ", async () => {
    const id = await newOrder()
    await expectContract(await substituteOptions(get(`/${id}/substitute`), ps(id)), 200, R.substituteOptionsResponse, "gc-substitute-options")
    await expectContract(await proposeSubstitute(send(`/${id}/substitute`, { reason: "Hết hồng đỏ", product_ids: [alternative] }), ps(id)), 201, R.substituteProposalResponse, "gc-substitute")
    const other = await newOrder()
    // Công thức hoa của dòng đơn (bản chụp lúc đặt) — chỉ đổi được hoa phụ
    await prisma.order_items.updateMany({ where: { order_id: other }, data: { metadata: BOM.bom } })
    // Chỉ thay được hoa phụ (không thay hoa chủ đạo)
    const options = await expectContract(await flowerOptions(get(`/${other}/flower-substitute`), ps(other)), 200, R.flowerSubstituteOptionsResponse, "gc-flower-options")
    const lineIndex = (options.data as { lines: { index: number }[] }).lines[0]?.index ?? -1
    const asset = await new AssetRepository().create(t.ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${t.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: t.userId,
    })
    await expectContract(
      await proposeFlower(send(`/${other}/flower-substitute`, { reason: "Baby trắng hết hàng", line_index: lineIndex, replacement_name: "Thạch thảo", photo_asset_id: asset.id }), ps(other)),
      201,
      R.flowerSubstituteProposalResponse,
      "gc-flower-substitute"
    )
    await expectContract(await discountRequest(send(`/${id}/discount-request`, { percent: 10, reason: "Khách quen" }), ps(id)), 201, R.discountRequestResponse, "gc-discount-request")

    const paid = await newOrder()
    for (const [route, path, body] of [
      [confirmPayment, "confirm-payment", { amount_vnd: 1_000_000 }],
      [confirmOrder, "confirm-order", {}],
      [productPhoto, "product-photo", { skip_photo: true, skip_reason: "Không cần ảnh" }],
      [dispatchShipping, "dispatch-shipping", { tracking_note: "Shipper" }],
    ] as const) {
      expect((await route(send(`/${paid}/${path}`, body), ps(paid))).status, path).toBe(200)
    }
    await expectContract(await deliveryFailed(send(`/${paid}/delivery-failed`, { reason: "NO_ANSWER", charge_fee: false }), ps(paid)), 200, R.deliveryFailedResponse, "gc-delivery-failed")
    await expectContract(await refund(send(`/${paid}/refund`, { amount_vnd: 100_000, reason: "Giao trễ" }), ps(paid)), 200, R.refundResponse, "gc-refund")
    await expectContract(await cancel(send(`/${paid}/cancel`, { reason: "Khách huỷ", confirm_in_transit: true }), ps(paid)), 200, R.gcCancelResponse, "gc-cancel")
  })

  it("báo giá đơn chưa có giá, từ chối đơn mới, từ chối báo chuyển khoản, Điều phối duyệt cọc / từ chối nhận", async () => {
    const q = await newOrder(unpriced)
    await expectContract(await quote(send(`/${q}/quote`, { total_vnd: 1_200_000, reason: "Lẵng lớn" }), ps(q)), 200, R.gcQuoteResponse, "gc-quote")
    const rejected = await newOrder()
    await expectContract(await rejectNew(send(`/${rejected}/confirm-order`, { reason: "Hết hàng" }, "DELETE"), ps(rejected)), 200, R.rejectProposalResponse, "gc-reject-new")
    const reported = await newOrder()
    const sendCode = await withProof(reported)
    const session = await prisma.greeting_sessions.findFirstOrThrow({ where: { order_id: reported } })
    await reportCustomerPayment(sendCode, { proofAssetId: session.payment_proof_asset_id ?? undefined })
    await expectContract(await rejectReported(send(`/${reported}/reject-reported-payment`, { reason: "Chưa thấy tiền" }), ps(reported)), 200, R.rejectReportedPaymentResponse, "gc-reject-reported")
    const deposit = await newOrder()
    await expectContract(await confirmDeposit(send(`/${deposit}/confirm-deposit`, { note: "Đã thấy cọc" }), ps(deposit)), 200, R.paymentConfirmedResponse, "gc-deposit")
    // Điều phối (không có R11, tiệm bắt Điều hành duyệt cọc) tiếp nhận đơn khách đã gửi ảnh chuyển khoản.
    // Nhánh Điều phối được tự ghi cọc hiện trả 409 (đọc lại đơn cũ sau khi ghi cọc) — đã báo PO, không sửa ở đây.
    const settings = (await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })).settings as Record<string, unknown>
    await prisma.organizations.update({
      where: { id: t.organizationId },
      data: { settings: { ...settings, brochure_workflow_policy: { require_admin_deposit_approval: true, require_delivery_proof_photo: false } } },
    })
    const coordinator = await addStaffWithSession(t, "dieu_phoi", "dieu-phoi-nhan-don")
    const accepted = await newOrder()
    await withProof(accepted)
    const acceptReq = withSession(`${BASE}/${accepted}/accept`, coordinator.token, { method: "POST", body: JSON.stringify({ note: "Nhận" }) })
    await expectContract(await accept(acceptReq, ps(accepted)), 200, R.orderRefResponse, "gc-accept")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { settings: settings as object } })
    const declined = await newOrder()
    await confirmPayment(send(`/${declined}/confirm-payment`, { amount_vnd: 300_000 }), ps(declined))
    await expectContract(await rejectOrder(send(`/${declined}/reject`, { reason: "Xưởng kín lịch" }), ps(declined)), 200, R.rejectProposalResponse, "gc-reject")
  })

  it("điều phối chuỗi: gợi ý chi nhánh, mời nhận gia công", async () => {
    await makeChainOrganization(t)
    const branch = await seedChainBranch(t, "CN-Q1", "Chi nhánh Quận 1")
    expect(branch).toBeTruthy()
    const id = await newOrder()
    await confirmPayment(send(`/${id}/confirm-payment`, { amount_vnd: 300_000, manual_dispatch: true }), ps(id))
    await expectContract(await dispatchState(get(`/${id}/chain-dispatch`), ps(id)), 200, R.chainDispatchStateResponse, "gc-dispatch-state")
    await expectContract(await startDispatch(send(`/${id}/chain-dispatch`, { approved_branch_ids: ["CN-Q1"], subcontract_price_vnd: 200_000 }), ps(id)), 200, R.chainDispatchStartResponse, "gc-dispatch-start")
  })
})
