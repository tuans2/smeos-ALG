import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { SURVEY_COLUMNS } from "@/modules/platform/domain/partner-marketplace-columns"

/** Hàng khảo sát giả: tiêu đề đúng nhãn cột, một cửa hàng có một ảnh Drive (cột 64). */
const rows = (() => {
  const header = SURVEY_COLUMNS.map((c) => c.label)
  const row = SURVEY_COLUMNS.map(() => "")
  const set = (key: string, value: string) => {
    row[SURVEY_COLUMNS.findIndex((c) => c.key === key)] = value
  }
  set("identity.shopName", "Hoa Nắng")
  set("identity.ownerName", "Chị Nắng")
  set("contact.phone", "0901234567")
  set("contact.address", "1 Lê Lợi, Q1")
  row[64] = "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view"
  return [header, row]
})()
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9])
vi.mock("@/modules/platform/adapters/google-workspace-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/platform/adapters/google-workspace-client")>()),
  getGoogleWorkspaceClient: () => ({ readSheet: async () => rows, downloadDriveFile: async () => JPEG }),
}))

import * as R from "@/app/api/v1/platform/_contracts/responses-data"
import { POST as importPreview } from "@/app/api/v1/platform/marketplace/import-excel/preview/route"
import { POST as importExcel } from "@/app/api/v1/platform/marketplace/import-excel/route"
import { DELETE as revokeShare } from "@/app/api/v1/platform/marketplace/share-links/[id]/route"
import { GET as listShares, POST as createShare } from "@/app/api/v1/platform/marketplace/share-links/route"
import { DELETE as deleteStore } from "@/app/api/v1/platform/marketplace/stores/[id]/route"
import { POST as bulkDelete } from "@/app/api/v1/platform/marketplace/stores/bulk-delete/route"
import { GET as listStores } from "@/app/api/v1/platform/marketplace/stores/route"
import { POST as syncPhotos } from "@/app/api/v1/platform/marketplace/sync-photos/route"
import { POST as syncSheet } from "@/app/api/v1/platform/marketplace/sync/route"
import { PUT as assetHold } from "@/app/api/v1/platform/orgs-data/[orgId]/assets/[assetId]/legal-hold/route"
import { GET as exportOrg } from "@/app/api/v1/platform/orgs-data/[orgId]/export/route"
import { PUT as orgHold } from "@/app/api/v1/platform/orgs-data/[orgId]/legal-hold/route"
import { GET as records } from "@/app/api/v1/platform/orgs-data/[orgId]/records/[domain]/route"
import { GET as folder } from "@/app/api/v1/platform/orgs-data/[orgId]/route"
import { GET as orgsData } from "@/app/api/v1/platform/orgs-data/route"
import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi Console — chợ đối tác và dữ liệu tổ chức (OpenAPI `/platform/*`, PO 07/11/2026), CSDL thật. */
const BASE = "http://localhost/api/v1/platform"
const ps = (params: Record<string, string>) => ({ params: Promise.resolve(params) })
const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")

describe("hợp đồng — Console Vận hành Nền tảng: chợ đối tác, dữ liệu tổ chức", () => {
  let op: Tenant
  let shop: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, op.token)
  const send = (path: string, method: string, body: unknown) => withSession(`${BASE}${path}`, op.token, { method, body: JSON.stringify(body) })
  const upload = (path: string, extra: Record<string, string> = {}) => {
    const form = new FormData()
    form.set("file", new File([csv], "khao-sat.csv", { type: "text/csv" }))
    for (const [k, v] of Object.entries(extra)) form.set(k, v)
    return new Request(`${BASE}${path}`, { method: "POST", headers: { cookie: get(path).headers.get("cookie") ?? "" }, body: form })
  }

  beforeAll(async () => {
    process.env.PARTNER_SURVEY_SHEET_ID = "sheet-thu"
    await resetDatabase()
    op = await createTenant("van-hanh-du-lieu")
    shop = await createTenant("tiem-du-lieu")
    await new PlatformOperatorRepository().grant(op.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)
  })
  afterAll(async () => {
    delete process.env.PARTNER_SURVEY_SHEET_ID
    await disconnectDatabase()
  })

  it("chợ đối tác: đồng bộ, nhập tệp, ảnh, danh sách, link chia sẻ, xoá", async () => {
    await expectContract(await syncSheet(send("/marketplace/sync", "POST", {})), 200, R.marketplaceImportResponse, "marketplace-sync")
    await expectContract(await importPreview(upload("/marketplace/import-excel/preview")), 200, R.marketplacePreviewResponse, "marketplace-preview")
    await expectContract(await importExcel(upload("/marketplace/import-excel")), 200, R.marketplaceImportResponse, "marketplace-import")
    await expectContract(await syncPhotos(send("/marketplace/sync-photos", "POST", {})), 200, R.marketplacePhotosResponse, "marketplace-photos")
    const list = await expectContract(await listStores(get("/marketplace/stores?search=Nắng")), 200, R.marketplaceStoresResponse, "marketplace-stores")
    const storeId = (list.data as { stores: { id: string }[] }).stores[0]?.id ?? "khong-co"
    const created = await expectContract(await createShare(send("/marketplace/share-links", "POST", { label: "Gửi đối tác", days: 7 })), 201, R.createShareLinkResponse, "share-create")
    const linkId = (created.data as { link: { id: string } }).link.id
    await expectContract(await listShares(get("/marketplace/share-links")), 200, R.shareLinksResponse, "share-links")
    await expectContract(await revokeShare(send(`/marketplace/share-links/${linkId}`, "DELETE", {}), ps({ id: linkId })), 200, R.revokeShareLinkResponse, "share-revoke")
    await expectContract(await deleteStore(send(`/marketplace/stores/${storeId}`, "DELETE", {}), ps({ id: storeId })), 200, R.deleteStoreResponse, "store-delete")
    await expectContract(await syncSheet(send("/marketplace/sync", "POST", {})), 200, R.marketplaceImportResponse, "marketplace-sync")
    const again = await expectContract(await listStores(get("/marketplace/stores")), 200, R.marketplaceStoresResponse, "marketplace-stores")
    const expectedTotal = (again.data as { total: number }).total
    await expectContract(await bulkDelete(send("/marketplace/stores/bulk-delete", "POST", { all: true, expectedTotal })), 200, R.bulkDeleteStoresResponse, "stores-bulk-delete")
  })

  it("dữ liệu tổ chức: tóm tắt, thư mục, bản ghi, CSV, ZIP, giữ pháp lý", async () => {
    const orgId = shop.organizationId
    await expectContract(await orgsData(get("/orgs-data")), 200, R.orgsDataResponse, "orgs-data")
    await expectContract(await folder(get(`/orgs-data/${orgId}`), ps({ orgId })), 200, R.orgFolderResponse, "org-folder")
    for (const domain of ["catalog", "orders", "members", "branches", "customers", "jobs"]) {
      await expectContract(await records(get(`/orgs-data/${orgId}/records/${domain}`), ps({ orgId, domain })), 200, R.orgRecordsResponse, "org-records")
    }
    const csvRes = await records(get(`/orgs-data/${orgId}/records/members?export=csv`), ps({ orgId, domain: "members" }))
    expect(csvRes.status).toBe(200)
    expect(csvRes.headers.get("content-type")).toContain("text/csv")
    const zip = await exportOrg(get(`/orgs-data/${orgId}/export?type=csv`), ps({ orgId }))
    expect(zip.status).toBe(200)
    expect(zip.headers.get("content-type")).toBe("application/zip")
    const asset = await prisma.assets.create({
      data: { organization_id: orgId, kind: "MASTER", state: "READY", mime_type: "image/jpeg", storage_key: `org/${orgId}/khong-sp/a.jpg`, created_by: shop.userId },
    })
    const until = new Date(Date.now() + 30 * 86_400_000).toISOString()
    await expectContract(await orgHold(send(`/orgs-data/${orgId}/legal-hold`, "PUT", { until, reason: "Tranh chấp hợp đồng" }), ps({ orgId })), 200, R.legalHoldResponse, "legal-hold")
    await expectContract(
      await assetHold(send(`/orgs-data/${orgId}/assets/${asset.id}/legal-hold`, "PUT", { until: null, reason: "Hết tranh chấp" }), ps({ orgId, assetId: asset.id })),
      200,
      R.legalHoldResponse,
      "legal-hold"
    )
  })
})
