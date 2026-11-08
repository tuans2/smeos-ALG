import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-greeting"
import { GET as collage } from "@/app/api/v1/greeting-card/catalogs/[id]/collage/route"
import { GET as hearts } from "@/app/api/v1/greeting-card/catalogs/[id]/hearts/route"
import { DELETE as removeProduct, POST as addProduct } from "@/app/api/v1/greeting-card/catalogs/[id]/products/route"
import { DELETE as deleteCatalog, GET as getCatalog, PATCH as patchCatalog } from "@/app/api/v1/greeting-card/catalogs/[id]/route"
import { GET as listCatalogs, POST as createCatalog } from "@/app/api/v1/greeting-card/catalogs/route"
import { GET as getDisplay, PUT as putDisplay } from "@/app/api/v1/greeting-card/display-settings/route"
import { POST as copied } from "@/app/api/v1/greeting-card/send-links/[id]/copied/route"
import { PATCH as linkCustomer } from "@/app/api/v1/greeting-card/send-links/[id]/customer/route"
import { POST as revoke } from "@/app/api/v1/greeting-card/send-links/[id]/revoke/route"
import { GET as listSendLinks, POST as createSendLink } from "@/app/api/v1/greeting-card/send-links/route"
import { GET as listShareLinks, POST as createShareLink } from "@/app/api/v1/greeting-card/share-links/route"
import { GET as channelStats } from "@/app/api/v1/greeting-card/stats/channels/route"
import { GET as stats } from "@/app/api/v1/greeting-card/stats/route"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi Thẻ chào — bộ sưu tập, link, cài đặt hiển thị, thống kê (OpenAPI nội bộ, PO 07/11/2026). */
const BASE = "http://localhost/api/v1/greeting-card"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })

describe("hợp đồng — Thẻ chào: bộ sưu tập và link", () => {
  let t: Tenant
  let productIds: string[]
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-bst")
    const products = new ProductRepository()
    productIds = [
      (await products.create(t.ctx, { code: "BST-1", name: "Bó hồng đỏ", attributes: { price: 500000 } })).id,
      (await products.create(t.ctx, { code: "BST-2", name: "Giỏ cúc", attributes: { price: 350000 } })).id,
      (await products.create(t.ctx, { code: "BST-3", name: "Lẵng lan", attributes: { price: 900000 } })).id,
    ]
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("bộ sưu tập: tạo, liệt kê, đọc, sửa, thêm/bỏ mẫu, tim, ảnh ghép, lưu trữ", async () => {
    const created = await expectContract(
      await createCatalog(send("/catalogs", "POST", { code: "bst-tet", name: "Hoa Tết", productIds: productIds.slice(0, 2) })),
      201,
      R.catalogCreatedResponse,
      "catalog-created"
    )
    const id = (created.data as { id: string }).id
    await expectContract(await listCatalogs(get("/catalogs?limit=10")), 200, R.catalogsResponse, "catalogs")
    await expectContract(await getCatalog(get(`/catalogs/${id}`), ps({ id })), 200, R.catalogResponse, "catalog")
    await expectContract(await patchCatalog(send(`/catalogs/${id}`, "PATCH", { name: "Hoa Tết 2027", description: "Mẫu mới" }), ps({ id })), 200, R.catalogResponse, "catalog")
    await expectContract(await addProduct(send(`/catalogs/${id}/products`, "POST", { productId: productIds[2] }), ps({ id })), 201, R.catalogItemResponse, "catalog-item")
    await expectContract(await removeProduct(send(`/catalogs/${id}/products`, "DELETE", { productId: productIds[2] }), ps({ id })), 200, R.successResponse, "catalog-item-removed")
    await expectContract(await hearts(get(`/catalogs/${id}/hearts`), ps({ id })), 200, R.catalogHeartsResponse, "catalog-hearts")
    const png = await collage(get(`/catalogs/${id}/collage`), ps({ id }))
    expect(png.status).toBe(200)
    expect(png.headers.get("content-type")).toContain("image/png")
    await expectContract(await deleteCatalog(send(`/catalogs/${id}`, "DELETE"), ps({ id })), 200, R.successResponse, "catalog-deleted")
  })

  it("link gửi khách, link chia sẻ, cài đặt hiển thị, thống kê", async () => {
    const catalog = await createCatalog(send("/catalogs", "POST", { code: "bst-link", name: "Bộ link", productIds }))
    const catalogId = ((await catalog.json()) as { data: { id: string } }).data.id
    const link = await expectContract(
      await createSendLink(send("/send-links", "POST", { catalogId, customerName: "Chị Hoa", customerPhone: "0901234567" })),
      201,
      R.sendLinkCreatedResponse,
      "send-link"
    )
    const sessionId = (link.data as { sessionId: string }).sessionId
    await expectContract(await listSendLinks(get("/send-links?limit=10")), 200, R.sendLinksResponse, "send-links")
    // `copied` nhận mã gửi (sendCode), các route khác nhận id phiên
    const sendCode = (link.data as { sendCode: string }).sendCode
    await expectContract(await copied(send(`/send-links/${sendCode}/copied`, "POST"), ps({ id: sendCode })), 200, R.copiedResponse, "send-link-copied")
    await expectContract(
      await linkCustomer(send(`/send-links/${sessionId}/customer`, "PATCH", { customerName: "Chị Hoa Mai", customerPhone: null }), ps({ id: sessionId })),
      200,
      R.linkCustomerResponse,
      "link-customer"
    )
    await expectContract(await revoke(send(`/send-links/${sessionId}/revoke`, "POST"), ps({ id: sessionId })), 200, R.revokedResponse, "send-link-revoked")
    await expectContract(await createShareLink(send("/share-links", "POST", { catalogId, channel: "facebook" })), 201, R.shareLinkCreatedResponse, "share-link")
    await expectContract(await listShareLinks(get("/share-links")), 200, R.shareLinksResponse, "share-links")
    await expectContract(await getDisplay(get("/display-settings")), 200, R.displaySettingsResponse, "display-settings")
    await expectContract(
      await putDisplay(send("/display-settings", "PUT", { pricing: { hidePrice: false, showDiscounts: true }, thankYou: { enabled: true, percent: 5 } })),
      200,
      R.displaySettingsResponse,
      "display-settings"
    )
    await expectContract(await stats(get("/stats?days=30")), 200, R.salesFunnelResponse, "stats")
    await expectContract(await channelStats(get("/stats/channels?days=7")), 200, R.channelFunnelResponse, "stats-channels")
  })
})
