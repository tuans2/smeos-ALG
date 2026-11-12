import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-product-extra"
import { DELETE as removeBlock } from "@/app/api/v1/availability/blocks/[id]/route"
import { POST as createBlock } from "@/app/api/v1/availability/blocks/route"
import { GET as board } from "@/app/api/v1/availability/board/route"
import { POST as approveCr } from "@/app/api/v1/product-change-requests/[id]/approve/route"
import { POST as rejectCr } from "@/app/api/v1/product-change-requests/[id]/reject/route"
import { GET as crQueue } from "@/app/api/v1/product-change-requests/route"
import { GET as getImageSet } from "@/app/api/v1/product-image-set/[id]/route"
import { GET as imageSetCatalog, POST as createImageSet } from "@/app/api/v1/product-image-set/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { POST as retryPhoto } from "@/app/api/v1/product-photo/[id]/retry/route"
// @release-strip-end
import { GET as getPhoto } from "@/app/api/v1/product-photo/[id]/route"
import { GET as photoCatalog, POST as createPhoto } from "@/app/api/v1/product-photo/route"
import { POST as crSubmit } from "@/app/api/v1/products/[id]/change-requests/route"
import { POST as productCreate } from "@/app/api/v1/products/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi nhóm sản phẩm phụ (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. Worker ảnh không chạy. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — ảnh studio, bộ ảnh, đề xuất sửa sản phẩm, lịch khả dụng", () => {
  let t: Tenant
  let other: Tenant
  let assetId: string
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant | { token: string } = t, idem = false) =>
    withSession(`${BASE}${path}`, who.token, { method, headers: idem ? { "Idempotency-Key": randomUUID() } : {}, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-sp-phu")
    other = await createTenant("hop-dong-sp-phu-khac")
    assetId = randomUUID()
    await new AssetRepository().create(t.ctx, { id: assetId, productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey: `org/${t.organizationId}/unfiled/${assetId}.jpg`, mimeType: "image/jpeg", createdBy: t.userId })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("ảnh studio: danh mục nền, tạo, xem, làm lại", async () => {
    await expectContract(await photoCatalog(new Request(`${BASE}/product-photo`)), 200, R.photoCatalogResponse, "photo-catalog")
    const created = await expectContract(await createPhoto(send("/product-photo", "POST", { asset_id: assetId }, t, true)), 201, R.jobCreatedResponse, "photo-create")
    const id = String(created.job_id)
    await expectContract(await getPhoto(get(`/product-photo/${id}`), ps(id)), 200, R.photoResultResponse, "photo-get")
    expect((await getPhoto(get(`/product-photo/${id}`, other), ps(id))).status).toBe(404)
    expect((await createPhoto(send("/product-photo", "POST", { asset_id: assetId }))).status).toBe(400) // thiếu Idempotency-Key
    // Worker xong nhưng ảnh không giữ đúng sản phẩm (điểm thấp) → được làm lại.
    await prisma.generation_jobs.update({ where: { id }, data: { status: "COMPLETED", output: { identity_guard: { ssim: 0.4 } } } })
    await expectContract(await getPhoto(get(`/product-photo/${id}`), ps(id)), 200, R.photoResultResponse, "photo-get-failed-qc")
    // @release-strip
    const retry = await retryPhoto(send(`/product-photo/${id}/retry`, "POST", { retry_hint: "nền sáng hơn" }, t, true), ps(id))
    await expectContract(retry, 201, R.jobCreatedResponse, "photo-retry")
    // @release-strip-end
  })

  it("bộ ảnh: danh mục gói, tạo, xem", async () => {
    await expectContract(await imageSetCatalog(new Request(`${BASE}/product-image-set`)), 200, R.imageSetCatalogResponse, "imageset-catalog")
    const created = await expectContract(await createImageSet(send("/product-image-set", "POST", { asset_id: assetId }, t, true)), 201, R.jobCreatedResponse, "imageset-create")
    const id = String(created.job_id)
    await expectContract(await getImageSet(get(`/product-image-set/${id}`), ps(id)), 200, R.imageSetResultResponse, "imageset-get")
    expect((await getImageSet(get(`/product-image-set/${id}`, other), ps(id))).status).toBe(404)
  })

  it("đề xuất sửa sản phẩm: hàng chờ, duyệt, từ chối", async () => {
    const product = await readJson(await productCreate(send("/products", "POST", { code: "SP-PHU-1", name: "Bó gốc", status: "ACTIVE", attributes: { price: 500_000 } })))
    const pid = String(product.id)
    const dp = await addStaffWithSession(t, "dieu_phoi", "dp")
    const submit = async (body: unknown) => String((await readJson(await crSubmit(send(`/products/${pid}/change-requests`, "POST", body, dp), ps(pid)))).id)
    const first = await submit({ name: "Bó mới", category: "Hoa chia buồn" })
    await expectContract(await crQueue(get("/product-change-requests")), 200, R.changeRequestsResponse, "cr-queue")
    await expectContract(await approveCr(send(`/product-change-requests/${first}/approve`, "POST", { fields: ["name"] }), ps(first)), 200, R.changeRequestApprovedResponse, "cr-approve")
    const second = await submit({ name: "Bó đề xuất 2" })
    await expectContract(await rejectCr(send(`/product-change-requests/${second}/reject`, "POST", { reason: "Chưa phù hợp" }), ps(second)), 200, R.changeRequestRejectedResponse, "cr-reject")
    await expectContract(await crQueue(get("/product-change-requests?status=REJECTED")), 200, R.changeRequestsResponse, "cr-queue-rejected")
    expect((await crQueue(get("/product-change-requests?status=LA"))).status).toBe(400)
    expect((await rejectCr(send(`/product-change-requests/${second}/reject`, "POST", { reason: "" }), ps(second))).status).toBe(400)
  })

  it("lịch khả dụng: bảng tháng, chặn ngày, bỏ chặn", async () => {
    const room = await prisma.products.create({ data: { organization_id: t.organizationId, code: "PHONG-1", name: "Phòng 1", status: "ACTIVE" } })
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { industry_key: "HOMESTAY" } })
    const created = await expectContract(await createBlock(send("/availability/blocks", "POST", { productId: room.id, checkInDate: "2026-12-01", checkOutDate: "2026-12-03", note: "Bảo trì" })), 200, R.blockCreatedResponse, "block-create")
    await expectContract(await board(get("/availability/board?month=2026-12")), 200, R.boardResponse, "board")
    await expectContract(await board(get("/availability/board")), 200, R.boardResponse, "board-default")
    const id = String(created.id)
    expect((await removeBlock(send(`/availability/blocks/${id}`, "DELETE", undefined, other), ps(id))).status).toBe(404)
    await expectContract(await removeBlock(send(`/availability/blocks/${id}`, "DELETE"), ps(id)), 200, R.successResponse, "block-remove")
    expect((await createBlock(send("/availability/blocks", "POST", { productId: room.id, checkInDate: "1/12/2026", checkOutDate: "2026-12-03" }))).status).toBe(400)
  })

  it("đường lỗi đã mô tả trong OpenAPI", async () => {
    const st = async (r: Response | Promise<Response>) => (await r).status
    const foreignAsset = randomUUID()
    await new AssetRepository().create(other.ctx, { id: foreignAsset, productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey: `org/${other.organizationId}/unfiled/${foreignAsset}.jpg`, mimeType: "image/jpeg", createdBy: other.userId })
    expect(await st(createPhoto(send("/product-photo", "POST", { asset_id: foreignAsset }, t, true)))).toBe(404)
    expect(await st(createImageSet(send("/product-image-set", "POST", { asset_id: randomUUID() }, t, true)))).toBe(404)
    const done = await readJson(await createPhoto(send("/product-photo", "POST", { asset_id: assetId }, t, true)))
    const pid = String(done.job_id)
    // @release-strip
    expect(await st(retryPhoto(send(`/product-photo/${pid}/retry`, "POST", {}, t, true), ps(pid)))).toBe(400) // chưa có điểm → coi như đạt
    expect(await st(retryPhoto(send(`/product-photo/${pid}/retry`, "POST", {}, other, true), ps(pid)))).toBe(404)
    // @release-strip-end
    const rejected = (await readJson(await crQueue(get("/product-change-requests?status=REJECTED")))).data as { id: string }[]
    const crId = rejected[0]!.id
    expect(await st(approveCr(send(`/product-change-requests/${crId}/approve`, "POST", {}), ps(crId)))).toBe(422)
    expect(await st(rejectCr(send(`/product-change-requests/${crId}/reject`, "POST", { reason: "lại" }), ps(crId)))).toBe(422)
    expect(await st(approveCr(send(`/product-change-requests/${crId}/approve`, "POST", {}, other), ps(crId)))).toBe(404)
    const foreignRoom = await prisma.products.create({ data: { organization_id: other.organizationId, code: "PHONG-K", name: "Phòng khác", status: "ACTIVE" } })
    expect(await st(createBlock(send("/availability/blocks", "POST", { productId: foreignRoom.id, checkInDate: "2026-12-05", checkOutDate: "2026-12-06" })))).toBe(404)
  })
})

