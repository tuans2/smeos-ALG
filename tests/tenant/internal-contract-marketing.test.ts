import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-marketing"
import { GET as getCampaign, PATCH as patchCampaign } from "@/app/api/v1/campaigns/[id]/route"
import { GET as listCampaigns, POST as createCampaign } from "@/app/api/v1/campaigns/route"
import { POST as createOrder } from "@/app/api/v1/coordinator/orders/route"
import { GET as listInteractions } from "@/app/api/v1/customer-interactions/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { GET as segmentCustomers } from "@/app/api/v1/customer-segments/[id]/customers/route"
// @release-strip-end
import { DELETE as removeSegment, GET as getSegment, PATCH as patchSegment } from "@/app/api/v1/customer-segments/[id]/route"
import { GET as listSegments, POST as createSegment } from "@/app/api/v1/customer-segments/route"
// @release-strip
import { GET as customerInteractions, POST as recordInteraction } from "@/app/api/v1/customers/[id]/interactions/route"
// @release-strip-end
import { POST as reportRun } from "@/app/api/v1/delivery/my-runs/[id]/route"
import { GET as myRuns } from "@/app/api/v1/delivery/my-runs/route"
import { PATCH as patchLead } from "@/app/api/v1/leads/[id]/route"
import { GET as listLeads, POST as createLead } from "@/app/api/v1/leads/route"
import { GET as kpis } from "@/app/api/v1/marketing-center/kpis/route"
import { PATCH as patchOccasion } from "@/app/api/v1/occasions/[id]/route"
import { GET as listOccasions, POST as createOccasion } from "@/app/api/v1/occasions/route"

import { CustomerRepository } from "@/modules/crm/infra/customer-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi khách hàng & marketing (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — khách hàng & marketing", () => {
  let t: Tenant
  let other: Tenant
  let customerId: string
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-marketing")
    other = await createTenant("hop-dong-marketing-khac")
    customerId = (await new CustomerRepository().create(t.ctx, { name: "Chị Lan", phone: "0901234567" })).id
    await prisma.customers.update({ where: { id: customerId }, data: { tier: "VIP" } })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("khách tiềm năng: thêm, danh sách, đổi trạng thái", async () => {
    const created = await expectContract(await createLead(send("/leads", "POST", { name: "Anh Minh", phone: "0912345678", reason: "QUOTE_REQUEST", message: "Cần trước thứ Sáu" })), 201, R.leadCreatedResponse, "lead-create")
    const id = String((created.lead as { id: string }).id)
    await expectContract(await listLeads(get("/leads?limit=10")), 200, R.leadsResponse, "leads")
    await expectContract(await patchLead(send(`/leads/${id}`, "PATCH", { status: "CONTACTED" }), ps(id)), 200, R.leadResponse, "lead-patch")
    expect((await patchLead(send(`/leads/${id}`, "PATCH", { status: "CONTACTED" }, other), ps(id))).status).toBe(404)
    expect((await listLeads(get("/leads?limit=abc"))).status).toBe(400)
  })

  it("chiến dịch và chỉ số marketing", async () => {
    const created = await expectContract(await createCampaign(send("/campaigns", "POST", { name: "Hoa 20/10", objective: "SALE", starts_at: "2026-10-01T00:00:00.000Z" })), 201, R.campaignResponse, "campaign-create")
    const id = String((created.data as { id: string }).id)
    await expectContract(await listCampaigns(get("/campaigns")), 200, R.campaignsResponse, "campaigns")
    await expectContract(await getCampaign(get(`/campaigns/${id}`), ps(id)), 200, R.campaignDetailResponse, "campaign-get")
    await expectContract(await patchCampaign(send(`/campaigns/${id}`, "PATCH", { status: "ACTIVE" }), ps(id)), 200, R.campaignResponse, "campaign-patch")
    expect((await getCampaign(get(`/campaigns/${id}`, other), ps(id))).status).toBe(404)
    await expectContract(await kpis(get("/marketing-center/kpis?time_window=7D")), 200, R.kpisResponse, "kpis")
    expect((await kpis(get("/marketing-center/kpis?time_window=1Y"))).status).toBe(400)
  })

  it("nhóm khách hàng và tương tác", async () => {
    const created = await expectContract(await createSegment(send("/customer-segments", "POST", { name: "Khách VIP", rules: { tiers: ["VIP"] } })), 201, R.segmentResponse, "segment-create")
    const id = String((created.data as { id: string }).id)
    await expectContract(await listSegments(get("/customer-segments")), 200, R.segmentsResponse, "segments")
    await expectContract(await getSegment(get(`/customer-segments/${id}`), ps(id)), 200, R.segmentResponse, "segment-get")
    await expectContract(await patchSegment(send(`/customer-segments/${id}`, "PATCH", { description: "Khách hạng VIP" }), ps(id)), 200, R.segmentResponse, "segment-patch")
    // @release-strip
    await expectContract(await segmentCustomers(get(`/customer-segments/${id}/customers`), ps(id)), 200, R.segmentCustomersResponse, "segment-customers")
    // @release-strip-end
    expect((await getSegment(get(`/customer-segments/${id}`, other), ps(id))).status).toBe(404)

    // @release-strip
    await expectContract(await recordInteraction(send(`/customers/${customerId}/interactions`, "POST", { channel: "ZALO", summary: "Gửi mẫu hoa 20/10", outcome: "Khách hẹn trả lời" }), ps(customerId)), 201, R.interactionResponse, "interaction-create")
    await expectContract(await customerInteractions(get(`/customers/${customerId}/interactions`), ps(customerId)), 200, R.interactionsResponse, "customer-interactions")
    // @release-strip-end
    await expectContract(await listInteractions(get(`/customer-interactions?customer_id=${customerId}`)), 200, R.interactionsResponse, "interactions")
    await expectContract(await removeSegment(send(`/customer-segments/${id}`, "DELETE"), ps(id)), 200, R.segmentDeletedResponse, "segment-remove")
  })

  it("dịp bán hàng", async () => {
    const created = await expectContract(await createOccasion(send("/occasions", "POST", { code: "KHAI_TRUONG", name: "Khai trương", sort_order: 5 })), 201, R.occasionResponse, "occasion-create")
    const id = String((created.occasion as { id: string }).id)
    await expectContract(await listOccasions(get("/occasions")), 200, R.occasionsResponse, "occasions")
    await expectContract(await patchOccasion(send(`/occasions/${id}`, "PATCH", { is_active: false }), ps(id)), 200, R.occasionResponse, "occasion-patch")
    expect((await patchOccasion(send(`/occasions/${id}`, "PATCH", {}), ps(id))).status).toBe(400)
  })

  it("đơn cần giao của shipper", async () => {
    const shipper = await addStaffWithSession(t, "shipper", "hung")
    await prisma.users.update({ where: { id: shipper.userId }, data: { phone: "0933221100" } })
    const res = await createOrder(send("/coordinator/orders", "POST", {
      customer_name: "Nguyễn Văn An", customer_phone: "0987654321", recipient_name: "Trần Thị Bình", recipient_phone: "0901234567",
      delivery_address: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" },
      delivery_target_time: "17:00 hôm nay", delivery_target_at: new Date(Date.now() + 6 * 3600_000).toISOString(),
      product_title: "Bó hoa hồng Pastel", unit_price_vnd: 850000,
    }))
    expect(res.status).toBe(201)
    const orderId = ((await readJson(res)).order as { id: string }).id
    await prisma.order_coordinations.update({ where: { order_id: orderId }, data: { stage: "DISPATCHING", shipper_name: "Hùng", shipper_phone: "0933221100" } })
    const s = (path: string, body?: unknown) => withSession(`${BASE}${path}`, shipper.token, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) })
    await expectContract(await myRuns(s("/delivery/my-runs")), 200, R.shipperRunsResponse, "my-runs")
    await expectContract(await reportRun(s(`/delivery/my-runs/${orderId}`, { event: "PICKED_UP" }), ps(orderId)), 200, R.shipperRunReportResponse, "my-run-report")
  })

  it("đường lỗi đã mô tả trong OpenAPI", async () => {
    const st = async (r: Response | Promise<Response>) => (await r).status
    expect(await st(createCampaign(send("/campaigns", "POST", { name: "", objective: "SALE" })))).toBe(400)
    expect(await st(listCampaigns(get("/campaigns?status=LA")))).toBe(400)
    expect(await st(listSegments(get("/customer-segments?limit=abc")))).toBe(400)
    expect(await st(listInteractions(get("/customer-interactions?channel=FAX")))).toBe(400)
    // @release-strip
    expect(await st(recordInteraction(send(`/customers/${customerId}/interactions`, "POST", { channel: "ZALO", summary: "x" }, other), ps(customerId)))).toBe(404)
    // @release-strip-end
    await createOccasion(send("/occasions", "POST", { code: "TRUNG_MA", name: "Trùng mã" }))
    expect(await st(createOccasion(send("/occasions", "POST", { code: "TRUNG_MA", name: "Trùng mã" })))).toBe(409)
    expect(await st(reportRun(send(`/delivery/my-runs/${customerId}`, "POST", { event: "BAY" }), ps(customerId)))).toBe(400)
  })
})
