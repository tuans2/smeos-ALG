import { createHash } from "node:crypto"

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/modules/greeting-card/adapters/google-drive-thumbnail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/greeting-card/adapters/google-drive-thumbnail")>()),
  // Không gọi Google thật: thư mục `thu-muc-rong` không có ảnh, thư mục khác có tệp `tep-anh-1`
  resolveFirstFileId: async (folderId: string) => (folderId.startsWith("thu-muc-rong") ? null : "tep-anh-1"),
  fetchThumbnail: async () => ({ body: Buffer.from([0xff, 0xd8, 0xff]), contentType: "image/jpeg" }),
}))

// Trình đọc Excel (nhập marketplace) không dùng khi xem link chia sẻ — chặn để không kéo `xlsx` vào test
vi.mock("@/modules/platform/infra/parse-marketplace-excel", () => ({ parseMarketplaceWorkbook: () => null }))

import { POST as cspReport } from "@/app/api/v1/public/csp-report/route"
import { GET as driveThumbProxy } from "@/app/api/v1/public/drive-thumb-proxy/route"
import { GET as driveThumbnail } from "@/app/api/v1/public/drive-thumbnail/route"
import { POST as inboundWebhook } from "@/app/api/v1/public/integrations/[connector]/[ref]/route"
import { GET as marketplaceShare } from "@/app/api/v1/public/marketplace-share/[token]/route"
import { POST as sepayWebhook } from "@/app/api/v1/public/payments/sepay/route"
import { GET as publicQuotation } from "@/app/api/v1/public/quotation/[token]/route"
import { POST as zaloOaWebhook } from "@/app/api/v1/public/zalo-oa/webhook/route"
import { POST as connect } from "@/app/api/v1/integrations/connections/route"
import * as R from "@/app/api/v1/public/_contracts/responses-utility"
import { prisma } from "@/core/tenancy/infra/prisma"
import { signEcho } from "@/modules/integration-hub/adapters/connectors/test-echo-connector"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { rotatePaymentWebhookKey } from "@/modules/greeting-card/use-cases/payment-webhook"
import { selectBrochureProduct } from "@/modules/greeting-card/use-cases/select-brochure-product"
import { submitBrochureOrder } from "@/modules/greeting-card/use-cases/submit-brochure-order"
import { createShareLink } from "@/modules/platform/use-cases/share-partner-marketplace"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { createQuotationUseCase } from "@/modules/sales/use-cases/create-quotation.use-case"
import { sendQuotationUseCase } from "@/modules/sales/use-cases/send-quotation.use-case"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi — nhóm tiện ích & webhook công khai (audit API đợt 6, PO 07/11/2026). Mỗi ca gọi route
 * thật trên CSDL thật; phản hồi phải qua lược đồ `strictObject` ở `src/app/api/v1/public/_contracts/`.
 */
const BASE = "http://localhost/api/v1/public"
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })
const json = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
})

describe("hợp đồng — tiện ích & webhook công khai", () => {
  let a: Tenant

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("tien-ich")
    process.env.ZALO_OA_APP_ID = "app-1"
    process.env.ZALO_OA_WEBHOOK_SECRET = "oa-secret"
  })
  afterEach(() => vi.clearAllMocks())
  afterAll(async () => {
    await prisma.platform_secrets.deleteMany({})
    await disconnectDatabase()
  })

  it("POST /csp-report → 204 không thân", async () => {
    const res = await cspReport(new Request(`${BASE}/csp-report`, json({ "csp-report": { "effective-directive": "img-src", "blocked-uri": "https://x.test/a.png" } })))
    expect(res.status).toBe(204)
    expect(await res.text()).toBe("")
  })

  it("GET /drive-thumbnail — có ảnh, không có ảnh, id sai", async () => {
    await expectContract(await driveThumbnail(new Request(`${BASE}/drive-thumbnail?folder_id=thu-muc-co-anh-0123456789`)), 200, R.driveThumbnailResponse, "drive-thumbnail")
    await expectContract(await driveThumbnail(new Request(`${BASE}/drive-thumbnail?folder_id=thu-muc-rong-0123456789`)), 200, R.driveThumbnailResponse, "drive-thumbnail")
    expect((await driveThumbnail(new Request(`${BASE}/drive-thumbnail?folder_id=%3Cscript%3E`))).status).toBe(400)
  })

  it("GET /drive-thumb-proxy — ảnh nhị phân, 404 khi thư mục rỗng", async () => {
    const res = await driveThumbProxy(new Request(`${BASE}/drive-thumb-proxy?folder_id=thu-muc-co-anh-0123456789`))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/jpeg")
    expect((await driveThumbProxy(new Request(`${BASE}/drive-thumb-proxy?folder_id=thu-muc-rong-0123456789`))).status).toBe(404)
  })

  it("POST /integrations/{connector}/{ref} — nhận, trùng, sai chữ ký", async () => {
    const secret = "tenant-echo-secret-0123456789"
    const created = await readJson(await connect(withSession("http://localhost/api/v1/integrations/connections", a.token, json({ connectorKey: "test_echo", secret }))))
    const ref = (created.connection as { connectionRef: string }).connectionRef
    const body = JSON.stringify({ id: "evt-hop-dong", type: "echo.ok" })
    const call = (sig: string) => inboundWebhook(new Request(`${BASE}/integrations/test_echo/${ref}`, { method: "POST", body, headers: { "x-echo-signature": sig } }), params({ connector: "test_echo", ref }))
    const sig = signEcho(body, secret, Math.floor(Date.now() / 1000))
    await expectContract(await call(sig), 200, R.inboundWebhookResponse, "inbound-webhook")
    await expectContract(await call(sig), 200, R.inboundWebhookResponse, "inbound-webhook")
    expect((await call(signEcho(body, "khoa-sai-0000000000000", Math.floor(Date.now() / 1000)))).status).toBe(401)
  })

  it("POST /payments/sepay — khớp đơn, không khớp, sai khoá", async () => {
    const product = await new ProductRepository().create(a.ctx, { code: "HD-SEPAY", name: "Bó hồng", attributes: { price: 500000 } })
    const catalog = await new GreetingCardRepository().createCatalog(a.ctx, { code: "hd-sepay", name: "C", productIds: [product.id], createdBy: a.userId })
    const link = await createSendLink(a.ctx, { catalogId: catalog.id })
    await selectBrochureProduct(link.sendCode, product.id)
    const order = await submitBrochureOrder(link.sendCode, {
      customerName: "K", customerPhone: "0987654321", recipientName: "N", recipientPhone: "0912345678",
      confirmedTerms: true, selectedPromotionId: "promo-free-card",
      deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), deliveryAddress: "12 Lê Lợi, Q1",
    })
    const { apiKey } = await rotatePaymentWebhookKey(a.ctx)
    const hook = (key: string, body: Record<string, unknown>) =>
      sepayWebhook(new Request(`${BASE}/payments/sepay`, json({ transferType: "in", accountNumber: "0011223344", transactionDate: "2026-10-05 10:00:00", ...body }, { authorization: `Apikey ${key}` })))
    await expectContract(await hook(apiKey, { id: 9001, transferAmount: 500000, content: `CK ${order.orderCode}` }), 200, R.sepayWebhookResponse, "sepay")
    await expectContract(await hook(apiKey, { id: 9002, transferAmount: 1000, content: "khong co ma don" }), 200, R.sepayWebhookResponse, "sepay")
    await expectContract(await hook(apiKey, { id: 9001, transferAmount: 500000, content: `CK ${order.orderCode}` }), 200, R.sepayWebhookResponse, "sepay")
    expect((await hook("brk_sai", { id: 9003, transferAmount: 1, content: "x" })).status).toBe(401)
  })

  it("POST /zalo-oa/webhook — sự kiện hợp lệ, sai chữ ký", async () => {
    await new ChainBranchRepository().upsertMany(a.organizationId, [{
      branchId: "Q1", branchName: "CN Q1", qualityScore: 90, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true, channels: {},
    }])
    const signed = (event: Record<string, unknown>, secret = "oa-secret") => {
      const body = JSON.stringify(event)
      const mac = createHash("sha256").update(`app-1${body}${String(event.timestamp)}${secret}`).digest("hex")
      return new Request(`${BASE}/zalo-oa/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-zevent-signature": `mac=${mac}` }, body })
    }
    const event = { app_id: "app-1", event_name: "user_send_text", timestamp: String(Date.now()), sender: { id: "zalo-user-hd" }, message: { text: "xin chao" } }
    await expectContract(await zaloOaWebhook(signed(event)), 200, R.zaloOaWebhookResponse, "zalo-oa")
    expect((await zaloOaWebhook(signed(event, "sai-khoa"))).status).toBe(401)
  })

  it("GET /marketplace-share/{token} — link hợp lệ, link sai", async () => {
    const { token } = await createShareLink({ userId: a.userId, capabilities: new Set(["N17"]) }, { label: "Đối tác thử", days: 7 })
    await expectContract(await marketplaceShare(new Request(`${BASE}/marketplace-share/${token}`), params({ token })), 200, R.marketplaceShareResponse, "marketplace-share")
    expect((await marketplaceShare(new Request(`${BASE}/marketplace-share/khong-co`), params({ token: "khong-co" }))).status).toBe(404)
  })

  it("GET /quotation/{token} — đã gửi; nháp 404", async () => {
    const ctx = { ...a.ctx, capabilities: new Set([...a.ctx.capabilities, "R15", "Q1"]) }
    const sent = await createQuotationUseCase(ctx, { items: [{ name: "Hoa", qty: 2, unitPrice: 150000 }] })
    await sendQuotationUseCase(ctx, sent.id)
    await expectContract(await publicQuotation(new Request(`${BASE}/quotation/${sent.publicToken}`), params({ token: sent.publicToken })), 200, R.publicQuotationResponse, "quotation")
    const draft = await createQuotationUseCase(ctx, { items: [{ name: "Nháp", qty: 1, unitPrice: 1 }] })
    expect((await publicQuotation(new Request(`${BASE}/quotation/${draft.publicToken}`), params({ token: draft.publicToken }))).status).toBe(404)
  })
})
