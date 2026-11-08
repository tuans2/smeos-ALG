import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-chain"
import { GET as portalOrders } from "@/app/api/v1/branch-portal/orders/route"
import { PATCH as updateBranch } from "@/app/api/v1/branches/[id]/route"
import { GET as listBranches, POST as createBranch } from "@/app/api/v1/branches/route"
import { POST as preview } from "@/app/api/v1/chain/collection-profile/preview/route"
import { GET as getProfile, PUT as publishProfile } from "@/app/api/v1/chain/collection-profile/route"
import { POST as accept } from "@/app/api/v1/chain/links/[id]/accept/route"
import { POST as decline } from "@/app/api/v1/chain/links/[id]/decline/route"
import { POST as leave } from "@/app/api/v1/chain/links/[id]/leave/route"
import { GET as listLinks } from "@/app/api/v1/chain/links/route"
import { POST as partnerStore } from "@/app/api/v1/chain/partner-stores/route"
import { GET as storeFolder } from "@/app/api/v1/chain/stores-data/[storeId]/route"
import { GET as storesData } from "@/app/api/v1/chain/stores-data/route"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, linkPartner, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/branches/*`, `/branch-portal/*`, `/chain/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — chi nhánh và chuỗi", () => {
  let chain: Tenant
  let store: Tenant
  const get = (who: Tenant, path: string) => withSession(`${BASE}${path}`, who.token)
  const send = (who: Tenant, path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    chain = await createTenant("hop-dong-chuoi")
    store = await createTenant("hop-dong-cua-hang")
    await makeChainOrganization(chain)
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chi nhánh: tạo, danh sách, sửa; mã trùng 409; của tổ chức khác 404", async () => {
    const created = await expectContract(await createBranch(send(chain, "/branches", "POST", { name: "Chi nhánh Quận 1", code: "q1", address: "12 Lê Lợi" })), 201, R.branchResponse, "branch-create")
    const id = String((created.branch as { id: string }).id)
    expect((created.branch as { code: string }).code).toBe("Q1")
    expect((await createBranch(send(chain, "/branches", "POST", { name: "Trùng", code: "Q1" }))).status).toBe(409)
    await expectContract(await listBranches(get(chain, "/branches")), 200, R.branchesResponse, "branches")
    await expectContract(await updateBranch(send(chain, `/branches/${id}`, "PATCH", { name: "Chi nhánh Bến Thành", is_active: false }), ps(id)), 200, R.branchResponse, "branch-update")
    expect((await updateBranch(send(store, `/branches/${id}`, "PATCH", { name: "Chiếm" }), ps(id))).status).toBe(404)
    expect((await updateBranch(send(chain, `/branches/${id}`, "PATCH", {}), ps(id))).status).toBe(400)
  })

  it("cổng chi nhánh: tài khoản không gắn chi nhánh → branch null, không có đơn", async () => {
    const body = await expectContract(await portalOrders(get(chain, "/branch-portal/orders")), 200, R.branchPortalOrdersResponse, "branch-portal")
    expect(body.data).toEqual({ branch: null, orders: [] })
  })

  it("hồ sơ thu thập: đọc, xem trước, phát hành", async () => {
    const current = await expectContract(await getProfile(get(chain, "/chain/collection-profile")), 200, R.collectionProfileResponse, "chain-profile")
    const rules = (current.data as { profile: { rules: unknown[] } }).profile.rules
    expect(rules.length).toBeGreaterThan(0)
    await expectContract(await preview(send(chain, "/chain/collection-profile/preview", "POST", { rules })), 200, R.collectionProfilePreviewResponse, "chain-profile-preview")
    await expectContract(await publishProfile(send(chain, "/chain/collection-profile", "PUT", { rules })), 200, R.collectionProfilePublishedResponse, "chain-profile-publish")
  })

  it("cửa hàng đối tác, tóm tắt dữ liệu, thư mục một cửa hàng; cửa hàng của chuỗi khác 404", async () => {
    const created = await expectContract(
      await partnerStore(send(chain, "/chain/partner-stores", "POST", { name: "Tiệm đối tác Thủ Đức", code: "TD-01", legalEntityId: "0312345678", fieldCeilings: { business_name: "RAW", tax_code: "MASKED" } })),
      201, R.partnerStoreResponse, "chain-partner-store"
    )
    const storeId = String((created.data as { storeId: string }).storeId)
    await expectContract(await storesData(get(chain, "/chain/stores-data")), 200, R.chainStoresResponse, "chain-stores")
    const folderReq = (who: Tenant) => storeFolder(get(who, `/chain/stores-data/${storeId}`), { params: Promise.resolve({ storeId }) })
    await expectContract(await folderReq(chain), 200, R.storeFolderResponse, "chain-store-folder")
    expect((await folderReq(store)).status).toBe(404)
  })

  it("liên kết phía cửa hàng: danh sách, đồng ý, rời chuỗi; từ chối lời mời khác", async () => {
    const invite = await linkPartner(chain, store, { code: "CH-01", status: "PENDING" })
    await expectContract(await listLinks(get(store, "/chain/links")), 200, R.chainLinksResponse, "chain-links")
    expect((await accept(send(chain, `/chain/links/${invite}/accept`, "POST"), ps(invite))).status).toBe(404)
    await expectContract(await accept(send(store, `/chain/links/${invite}/accept`, "POST"), ps(invite)), 200, R.chainLinkResponse, "chain-link-accept")
    expect((await decline(send(store, `/chain/links/${invite}/decline`, "POST"), ps(invite))).status).toBe(400)
    await expectContract(await leave(send(store, `/chain/links/${invite}/leave`, "POST", { reason: "Tiệm chuyển sang tự kinh doanh" }), ps(invite)), 200, R.chainLinkResponse, "chain-link-leave")

    const other = await createTenant("hop-dong-chuoi-2")
    await makeChainOrganization(other)
    const second = await linkPartner(other, store, { code: "CH-02", status: "PENDING" })
    await expectContract(await decline(send(store, `/chain/links/${second}/decline`, "POST"), ps(second)), 200, R.chainLinkResponse, "chain-link-decline")
  })
})
