import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-profile"
import { GET as getBrand, PUT as putBrand } from "@/app/api/v1/brand-profile/route"
import { POST as mockData } from "@/app/api/v1/business-profile/mock-data/route"
import { GET as getBusiness, PUT as putBusiness } from "@/app/api/v1/business-profile/route"
import { DELETE as removeDomain } from "@/app/api/v1/custom-domains/[id]/route"
import { POST as verifyDomain } from "@/app/api/v1/custom-domains/[id]/verify/route"
import { GET as listDomains, POST as addDomain } from "@/app/api/v1/custom-domains/route"
import { DELETE as removeReview, PATCH as patchReview } from "@/app/api/v1/shop-reviews/[id]/route"
import { GET as listReviews, POST as createReview } from "@/app/api/v1/shop-reviews/route"
import { PATCH as patchShortLink } from "@/app/api/v1/short-links/[id]/route"
import { GET as shortLinkStats } from "@/app/api/v1/short-links/[id]/stats/route"
import { GET as listShortLinks, POST as createShortLink } from "@/app/api/v1/short-links/route"
import { POST as revokeShare } from "@/app/api/v1/store-share-link/revoke/route"
import { GET as getShare, POST as createShare } from "@/app/api/v1/store-share-link/route"
import { GET as transparency } from "@/app/api/v1/store/collection-transparency/route"

import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi hồ sơ & kênh cửa hàng (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. Xác minh DNS không gọi mạng thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — hồ sơ & kênh cửa hàng", () => {
  let t: Tenant
  let other: Tenant
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-ho-so")
    other = await createTenant("hop-dong-ho-so-khac")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("hồ sơ doanh nghiệp, hồ sơ thương hiệu, dữ liệu mẫu theo ngành, minh bạch thu thập", async () => {
    await expectContract(await getBusiness(get("/business-profile")), 200, R.businessProfileResponse, "business-get-empty")
    await expectContract(
      await putBusiness(send("/business-profile", "PUT", { display_name: "Tiệm hoa Mộc Lan", phone: "0901234567", address: "12 Lê Lợi", target_customers: ["Văn phòng"], operating_hours: { mon: "08:00-20:00" } })),
      200, R.businessProfileResponse, "business-put"
    )
    await expectContract(await getBusiness(get("/business-profile")), 200, R.businessProfileResponse, "business-get")
    const logoId = randomUUID()
    await new AssetRepository().create(t.ctx, { id: logoId, productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey: `org/${t.organizationId}/unfiled/${logoId}.png`, mimeType: "image/png", createdBy: t.userId })
    await expectContract(await putBrand(send("/brand-profile", "PUT", { logo_asset_id: logoId, primary_color: "#C9A96E", font_heading: "Lora", tone_of_voice: "ấm áp", slogan: "Hoa tươi mỗi sớm mai", hashtags: ["#hoatuoi"] })), 200, R.brandProfileResponse, "brand-put")
    await expectContract(await getBrand(get("/brand-profile")), 200, R.brandProfileResponse, "brand-get")
    // Dữ liệu mẫu chỉ cho tổ chức không gian trải nghiệm (`EXPERIENCE`); tổ chức thường → 403.
    expect((await mockData(send("/business-profile/mock-data", "POST", { industry_key: "FLORAL" }))).status).toBe(403)
    await prisma.organizations.update({ where: { id: other.organizationId }, data: { type: "EXPERIENCE" } })
    await expectContract(await mockData(send("/business-profile/mock-data", "POST", { industry_key: "FLORAL" }, other)), 200, R.mockDataResponse, "mock-data")
    expect((await mockData(send("/business-profile/mock-data", "POST", { industry_key: "khong-co" }, other))).status).toBe(400)
    await expectContract(await transparency(get("/store/collection-transparency")), 200, R.transparencyResponse, "transparency-empty")
    await prisma.branches.create({ data: { organization_id: t.organizationId, code: "Q1", name: "Chi nhánh Quận 1" } })
    await expectContract(await transparency(get("/store/collection-transparency")), 200, R.transparencyResponse, "transparency")
  })

  it("link hồ sơ công khai, đánh giá khách", async () => {
    await expectContract(await getShare(get("/store-share-link")), 200, R.shareLinkResponse, "share-get-empty")
    await expectContract(await createShare(send("/store-share-link", "POST")), 201, R.shareLinkResponse, "share-create")
    await expectContract(await getShare(get("/store-share-link")), 200, R.shareLinkResponse, "share-get")
    await expectContract(await revokeShare(send("/store-share-link/revoke", "POST")), 200, R.shareLinkRevokedResponse, "share-revoke")

    const created = await expectContract(await createReview(send("/shop-reviews", "POST", { authorName: "Chị Lan", occasion: "Sinh nhật", rating: 5, comment: "Hoa tươi, giao đúng giờ" })), 201, R.reviewResponse, "review-create")
    const id = String((created.data as { id: string }).id)
    await expectContract(await listReviews(get("/shop-reviews")), 200, R.reviewsResponse, "reviews")
    await expectContract(await patchReview(send(`/shop-reviews/${id}`, "PATCH", { isVisible: false }), ps(id)), 200, R.reviewResponse, "review-patch")
    expect((await patchReview(send(`/shop-reviews/${id}`, "PATCH", { isVisible: true }, other), ps(id))).status).toBe(404)
    await expectContract(await removeReview(send(`/shop-reviews/${id}`, "DELETE"), ps(id)), 200, R.reviewRemovedResponse, "review-remove")
  })

  it("tên miền riêng: gắn, danh sách, xác minh, gỡ", async () => {
    const created = await expectContract(await addDomain(send("/custom-domains", "POST", { hostname: "hoa-moclan.vn" })), 201, R.domainResponse, "domain-add")
    const id = String((created.data as { id: string }).id)
    await expectContract(await listDomains(get("/custom-domains")), 200, R.domainsResponse, "domains")
    const verify = await verifyDomain(send(`/custom-domains/${id}/verify`, "POST"), ps(id))
    await expectContract(verify, 200, R.domainVerifyResponse, "domain-verify") // chưa thấy bản ghi TXT → `verified: false`, vẫn 200
    await expectContract(await removeDomain(send(`/custom-domains/${id}`, "DELETE"), ps(id)), 200, R.domainRemovedResponse, "domain-remove")
  })

  it("link/QR động: tạo, danh sách, sửa, thống kê", async () => {
    const created = await expectContract(await createShortLink(send("/short-links", "POST", { kind: "QR", name: "QR quầy", targetPath: "/c/moc-lan", placementLabel: "Quầy thu ngân" })), 201, R.shortLinkResponse, "short-create")
    const id = String(created.id ?? (created.data as { id?: string } | undefined)?.id)
    await expectContract(await listShortLinks(get("/short-links?limit=10")), 200, R.shortLinksResponse, "short-list")
    await expectContract(await patchShortLink(send(`/short-links/${id}`, "PATCH", { name: "QR quầy chính", isActive: false }), ps(id)), 200, R.shortLinkResponse, "short-patch")
    await expectContract(await shortLinkStats(get(`/short-links/${id}/stats?days=7`), ps(id)), 200, R.shortLinkStatsResponse, "short-stats")
  })
})
