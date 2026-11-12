import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-misc"
import { POST as invite } from "@/app/api/v1/members/invite/route"
import { POST as preflight } from "@/app/api/v1/print/preflight/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { POST as exportRendition } from "@/app/api/v1/print/renditions/[id]/export/route"
import { GET as getRendition } from "@/app/api/v1/print/renditions/[id]/route"
// @release-strip-end
import { GET as listRenditions, POST as createRendition } from "@/app/api/v1/print/renditions/route"
import { GET as cashflow } from "@/app/api/v1/reports/cashflow/route"
import { GET as orderReport } from "@/app/api/v1/reports/orders/route"
import { GET as performance } from "@/app/api/v1/reports/performance/route"
import { GET as productReport } from "@/app/api/v1/reports/products/route"
import { GET as revenue } from "@/app/api/v1/reports/revenue/route"
import { POST as accept } from "@/app/api/v1/session/invitations/[id]/accept/route"
import { POST as decline } from "@/app/api/v1/session/invitations/[id]/decline/route"
import { GET as listInvitations } from "@/app/api/v1/session/invitations/route"
import { POST as switchOrg } from "@/app/api/v1/session/organization/route"
import { POST as changePassword } from "@/app/api/v1/session/password/route"
import { GET as limits, PUT as putLimits } from "@/app/api/v1/usage/limits/route"
import { GET as usage } from "@/app/api/v1/usage/route"
import { GET as usageSummary } from "@/app/api/v1/usage/summary/route"
import { GET as exportBatch } from "@/app/api/v1/vouchers/batches/[id]/export/route"
import { GET as getBatch, PATCH as patchBatch } from "@/app/api/v1/vouchers/batches/[id]/route"
import { GET as listBatches, POST as createBatch } from "@/app/api/v1/vouchers/batches/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/session/*`, `/reports/*`, `/print/*`, `/vouchers/*`, `/usage/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — phiên, báo cáo, bản in, mã giảm giá, credit", () => {
  let shop: Tenant
  let staff: Tenant
  const get = (path: string, who: Tenant = shop) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = shop) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    shop = await createTenant("hop-dong-tiem")
    staff = await createTenant("hop-dong-nhan-vien")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("phiên: lời mời (xem, nhận, từ chối), đổi tổ chức, đổi mật khẩu", async () => {
    const role = await new RoleRepository().findSystemRoleByKey("sale")
    const inviteRes = await invite(send("/members/invite", "POST", { email: "hop-dong-nhan-vien@vi-du.test", role_id: role!.id }))
    const id = String(((await readJson(inviteRes)).membership as { id: string }).id)
    await expectContract(await listInvitations(get("/session/invitations", staff)), 200, R.invitationsResponse, "session-invitations")
    await expectContract(await accept(send(`/session/invitations/${id}/accept`, "POST", undefined, staff), ps(id)), 200, R.invitationAcceptedResponse, "session-accept")
    const sw = await switchOrg(send("/session/organization", "POST", { organization_id: shop.organizationId }, staff))
    expect(sw.headers.get("set-cookie")).toContain("alg_sso=")
    await expectContract(sw, 200, R.switchOrganizationResponse, "session-switch")
    expect((await switchOrg(send("/session/organization", "POST", { organization_id: (await createTenant("hop-dong-la")).organizationId }, staff))).status).toBe(404)

    const other = await createTenant("hop-dong-tiem-2")
    const second = await invite(withSession(`${BASE}/members/invite`, other.token, { method: "POST", body: JSON.stringify({ email: "hop-dong-nhan-vien@vi-du.test", role_id: role!.id }) }))
    const secondId = String(((await readJson(second)).membership as { id: string }).id)
    await expectContract(await decline(send(`/session/invitations/${secondId}/decline`, "POST", undefined, staff), ps(secondId)), 200, R.invitationDeclinedResponse, "session-decline")

    await expectContract(await changePassword(send("/session/password", "POST", { current_password: "mat-khau-du-dai", new_password: "mat-khau-moi-du-dai-12" })), 200, R.passwordChangedResponse, "session-password")
  })

  it("báo cáo theo kỳ", async () => {
    await prisma.orders.create({ data: { organization_id: shop.organizationId, code: "DH-BC-1", status: "CONFIRMED", total_vnd: 500000, balance_vnd: 500000, created_by: shop.userId } })
    const q = "?from=2026-11-01&to=2026-11-30&granularity=week"
    await expectContract(await orderReport(get(`/reports/orders${q}`)), 200, R.orderReportResponse, "report-orders")
    await expectContract(await revenue(get(`/reports/revenue${q}&detail=orders`)), 200, R.revenueReportResponse, "report-revenue")
    await expectContract(await productReport(get(`/reports/products${q}`)), 200, R.productReportResponse, "report-products")
    await expectContract(await performance(get(`/reports/performance${q}`)), 200, R.performanceReportResponse, "report-performance")
    await expectContract(await cashflow(get(`/reports/cashflow${q}`)), 200, R.cashflowReportResponse, "report-cashflow")
    expect((await orderReport(get("/reports/orders?from=2026-11-30&to=2026-11-01"))).status).toBe(400)
  })

  it("credit: lịch sử, tổng hợp tháng, hạn mức", async () => {
    await expectContract(await usage(get("/usage?limit=10")), 200, R.usageListResponse, "usage-list")
    await expectContract(await usageSummary(get("/usage/summary?period=2026-11")), 200, R.usageSummaryResponse, "usage-summary")
    await expectContract(await putLimits(send("/usage/limits", "PUT", { aiMonthlyLimit: 500 })), 200, R.usageLimitsResponse, "usage-limits-put")
    await expectContract(await limits(get("/usage/limits")), 200, R.usageLimitsResponse, "usage-limits")
  })

  it("mã giảm giá: tạo đợt, danh sách, xem, tạm dừng, xuất CSV", async () => {
    const created = await expectContract(
      await createBatch(send("/vouchers/batches", "POST", { name: "Tri ân khách Tết", mode: "UNIQUE", code_prefix: "TET", quantity: 3, discount_type: "PERCENTAGE", discount_value: 10, min_order_vnd: 300000, max_discount_vnd: 50000 })),
      201, R.voucherBatchCreatedResponse, "voucher-create"
    )
    const id = String(created.id)
    await expectContract(await listBatches(get("/vouchers/batches")), 200, R.voucherBatchesResponse, "voucher-list")
    await expectContract(await getBatch(get(`/vouchers/batches/${id}`), ps(id)), 200, R.voucherBatchResponse, "voucher-get")
    await expectContract(await patchBatch(send(`/vouchers/batches/${id}`, "PATCH", { is_active: false }), ps(id)), 200, R.okResponse, "voucher-patch")
    const csv = await exportBatch(get(`/vouchers/batches/${id}/export`), ps(id))
    expect([csv.status, csv.headers.get("content-type")]).toEqual([200, "text/csv; charset=utf-8"])
    expect((await csv.text()).split("\n").filter(Boolean).length).toBeGreaterThanOrEqual(4)
  })

  it("bản in: kiểm trước khi in, tạo, danh sách, xem, xuất PDF", async () => {
    await expectContract(await preflight(send("/print/preflight", "POST", { presetCode: "A5", imageWidthPx: 1800, imageHeightPx: 2500, colorMode: "RGB", hasQrCode: true, qrSizeMm: 25 })), 200, R.preflightResponse, "print-preflight")
    const created = await expectContract(
      await createRendition(send("/print/renditions", "POST", { sourceType: "greeting_card", presetCode: "A5", imageWidthPx: 1800, imageHeightPx: 2500 })),
      201, R.renditionResponse, "print-create"
    )
    const id = String((created.data as { id: string }).id)
    await expectContract(await listRenditions(get("/print/renditions?preset_code=A5&limit=10")), 200, R.renditionsResponse, "print-list")
    // @release-strip
    await expectContract(await getRendition(get(`/print/renditions/${id}`), ps(id)), 200, R.renditionResponse, "print-get")
    const pdf = await exportRendition(send(`/print/renditions/${id}/export`, "POST", { title: "Thiệp Tết", storeName: "Tiệm hoa" }), ps(id))
    await expectContract(pdf, 200, R.renditionExportResponse, "print-export")
    // @release-strip-end
  })
})
