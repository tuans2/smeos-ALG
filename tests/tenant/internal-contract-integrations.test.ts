import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-integrations"
import { DELETE as revokeToken } from "@/app/api/v1/integration-tokens/[id]/route"
import { POST as rotateToken } from "@/app/api/v1/integration-tokens/[id]/rotate/route"
import { GET as listTokens, POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { GET as listEvents } from "@/app/api/v1/integrations/connections/[id]/events/route"
import { POST as rotateSecret } from "@/app/api/v1/integrations/connections/[id]/rotate/route"
import { DELETE as disconnect } from "@/app/api/v1/integrations/connections/[id]/route"
import { POST as availability } from "@/app/api/v1/integrations/connections/[id]/sales/availability/route"
import { POST as publish } from "@/app/api/v1/integrations/connections/[id]/sales/publish/route"
import { GET as getSales } from "@/app/api/v1/integrations/connections/[id]/sales/route"
import { POST as unpublish } from "@/app/api/v1/integrations/connections/[id]/sales/unpublish/route"
import { POST as testConnection } from "@/app/api/v1/integrations/connections/[id]/test/route"
import { POST as connect } from "@/app/api/v1/integrations/connections/route"
import { POST as replay } from "@/app/api/v1/integrations/events/[id]/replay/route"
import { GET as getGovernance, PUT as putGovernance } from "@/app/api/v1/integrations/governance/route"
import { GET as getHub } from "@/app/api/v1/integrations/route"
import { POST as webhook } from "@/app/api/v1/public/integrations/[connector]/[ref]/route"
import { POST as ssoRefresh } from "@/app/api/v1/sso/refresh/route"
import { signEcho } from "@/modules/integration-hub/adapters/connectors/test-echo-connector"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi `/integrations/*`, `/integration-tokens/*`, `/sso/refresh` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL
 * thật. Không gọi nhà cung cấp thật: dùng hai đầu nối thử `test_echo` (webhook ký HMAC) và `test_shop` (kênh bán).
 */
const BASE = "http://localhost/api/v1"
const SECRET = "hop-dong-secret-0123456789"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — Trung tâm Tích hợp, token tích hợp, SSO", () => {
  let t: Tenant
  let chain: Tenant
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-tich-hop")
    chain = await createTenant("hop-dong-tich-hop-chuoi")
    await makeChainOrganization(chain)
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("kết nối: tạo, tổng quan, kiểm tra, đổi khoá, nhật ký, phát lại, ngắt", async () => {
    const created = await expectContract(await connect(send("/integrations/connections", "POST", { connectorKey: "test_echo", secret: SECRET })), 201, R.connectionResponse, "int-connect")
    const conn = created.connection as { id: string; connectionRef: string }
    await expectContract(await getHub(get("/integrations")), 200, R.hubResponse, "int-hub")
    await expectContract(await testConnection(send(`/integrations/connections/${conn.id}/test`, "POST"), ps(conn.id)), 200, R.connectionResponse, "int-test")
    await expectContract(await rotateSecret(send(`/integrations/connections/${conn.id}/rotate`, "POST", { secret: `${SECRET}-moi` }), ps(conn.id)), 200, R.connectionResponse, "int-rotate")

    const body = JSON.stringify({ id: "evt-hd-1", type: "echo.fail" })
    const sig = signEcho(body, `${SECRET}-moi`, Math.floor(Date.now() / 1000))
    const hook = new Request(`${BASE}/public/integrations/test_echo/${conn.connectionRef}`, { method: "POST", body, headers: { "x-echo-signature": sig } })
    expect((await webhook(hook, { params: Promise.resolve({ connector: "test_echo", ref: conn.connectionRef }) })).status).toBe(200)
    const events = await expectContract(await listEvents(get(`/integrations/connections/${conn.id}/events?limit=10`), ps(conn.id)), 200, R.eventsResponse, "int-events")
    const eventId = String((events.events as { id: string }[])[0]!.id)
    await prisma.integration_events.update({ where: { id: eventId }, data: { status: "DEAD" } })
    await expectContract(await replay(send(`/integrations/events/${eventId}/replay`, "POST"), ps(eventId)), 200, R.okResponse, "int-replay")
    expect((await listEvents(get(`/integrations/connections/${conn.id}/events?limit=500`), ps(conn.id))).status).toBe(400)

    await expectContract(await disconnect(send(`/integrations/connections/${conn.id}`, "DELETE"), ps(conn.id)), 200, R.okResponse, "int-disconnect")
  })

  it("kênh bán: tin đăng và đơn, đăng, đẩy còn/hết hàng, gỡ", async () => {
    const product = await prisma.products.create({
      data: { organization_id: t.organizationId, code: "KB-01", name: "Bó hồng đỏ", status: "ACTIVE", attributes: { price: 400000, price_vnd: 400000 } as never },
    })
    const created = await connect(send("/integrations/connections", "POST", { connectorKey: "test_shop", secret: SECRET }))
    const id = String(((await created.json()) as { connection: { id: string } }).connection.id)
    await expectContract(await publish(send(`/integrations/connections/${id}/sales/publish`, "POST", { productIds: [product.id] }), ps(id)), 200, R.listingsResponse, "int-publish")
    await expectContract(await getSales(get(`/integrations/connections/${id}/sales`), ps(id)), 200, R.salesResponse, "int-sales")
    await expectContract(await availability(send(`/integrations/connections/${id}/sales/availability`, "POST"), ps(id)), 200, R.availabilityResponse, "int-availability")
    await expectContract(await unpublish(send(`/integrations/connections/${id}/sales/unpublish`, "POST", { productIds: [product.id] }), ps(id)), 200, R.okResponse, "int-unpublish")
  })

  it("quản trị tích hợp của chuỗi: đọc, đặt chế độ; cửa hàng không phải chuỗi → 422", async () => {
    await expectContract(await getGovernance(get("/integrations/governance", chain)), 200, R.governanceResponse, "int-governance")
    await expectContract(await putGovernance(send("/integrations/governance", "PUT", { connectorKey: "facebook_messenger", mode: "FORBID" }, chain)), 200, R.governanceResponse, "int-governance-put")
    expect((await putGovernance(send("/integrations/governance", "PUT", { connectorKey: "facebook_messenger", mode: "FORBID" }))).status).toBe(422)
  })

  it("token tích hợp: cấp, danh sách, xoay, thu hồi; SSO làm mới", async () => {
    const issued = await expectContract(await issueToken(send("/integration-tokens", "POST", { client: "LOCALBUDD", ttl_days: 30 })), 201, R.tokenIssuedResponse, "token-issue")
    const id = String(issued.id)
    await expectContract(await listTokens(get("/integration-tokens")), 200, R.tokensResponse, "token-list")
    await expectContract(await rotateToken(send(`/integration-tokens/${id}/rotate`, "POST"), ps(id)), 201, R.tokenIssuedResponse, "token-rotate")
    await expectContract(await revokeToken(send(`/integration-tokens/${id}`, "DELETE"), ps(id)), 200, R.okResponse, "token-revoke")
    expect((await revokeToken(send(`/integration-tokens/${id}`, "DELETE", undefined, chain), ps(id))).status).toBe(404)

    const sso = await ssoRefresh(send("/sso/refresh", "POST"))
    expect(sso.headers.get("set-cookie")).toContain("alg_sso=")
    await expectContract(sso, 200, R.ssoRefreshResponse, "sso-refresh")
  })
})
