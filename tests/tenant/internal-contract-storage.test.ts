import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-storage"
import { PATCH as patchUsage } from "@/app/api/v1/asset-usages/[id]/route"
import { GET as listUsages, POST as createUsage } from "@/app/api/v1/asset-usages/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { POST as approveAsset } from "@/app/api/v1/assets/[id]/approve/route"
// @release-strip-end
import { DELETE as deleteAsset, GET as getAsset } from "@/app/api/v1/assets/[id]/route"
import { GET as viewUrl } from "@/app/api/v1/assets/[id]/view-url/route"
import { GET as listAssets, POST as registerAsset } from "@/app/api/v1/assets/route"
import { POST as uploadUrl } from "@/app/api/v1/assets/upload-url/route"
import { GET as readFile, PUT as putFile } from "@/app/api/v1/storage/[...key]/route"
import { GET as library } from "@/app/api/v1/storage/library/route"
import { GET as librarySummary } from "@/app/api/v1/storage/library/summary/route"
import { POST as restore } from "@/app/api/v1/storage/trash/[id]/restore/route"
import { DELETE as purge } from "@/app/api/v1/storage/trash/[id]/route"
import { GET as listTrash, POST as moveToTrash } from "@/app/api/v1/storage/trash/route"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi `/assets/*`, `/asset-usages/*`, `/storage/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật và kho
 * đĩa cục bộ của môi trường thử: xin URL tải lên → tải thẳng lên kho bằng URL ký → ghi nhận asset → xem, duyệt, thùng rác.
 */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })
// PNG 1×1 hợp lệ — kho kiểm nội dung theo phần mở rộng của khoá.
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"))

describe("hợp đồng — tư liệu, nơi dùng tư liệu, kho tệp", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const keyParams = (url: URL) => ({ params: Promise.resolve({ key: url.pathname.replace("/api/v1/storage/", "").split("/") }) })

  async function uploadPng(): Promise<{ assetId: string; storageKey: string }> {
    const ticket = await expectContract(await uploadUrl(send("/assets/upload-url", "POST", { mime_type: "image/png" })), 201, R.uploadUrlResponse, "storage-upload-url")
    const url = new URL(String(ticket.upload_url ?? ticket.url), "http://localhost")
    const put = await putFile(new Request(url, { method: "PUT", body: PNG, headers: { "content-type": "image/png" } }), keyParams(url))
    await expectContract(put, 200, R.uploadedResponse, "storage-put")
    return { assetId: String(ticket.asset_id), storageKey: String(ticket.storage_key) }
  }

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-kho")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tư liệu: xin URL, tải lên, ghi nhận, danh sách, xem, URL xem, đọc tệp, duyệt, xoá", async () => {
    const up = await uploadPng()
    const created = await expectContract(
      await registerAsset(send("/assets", "POST", { asset_id: up.assetId, kind: "ORIGINAL", storage_key: up.storageKey, mime_type: "image/png", width: 1, height: 1 })),
      201, R.assetResponse, "asset-register"
    )
    const id = String((created.asset as { id: string }).id)
    await expectContract(await listAssets(get("/assets?kind=ORIGINAL&limit=10")), 200, R.assetsResponse, "assets")
    await expectContract(await getAsset(get(`/assets/${id}`), ps(id)), 200, R.assetResponse, "asset-get")
    const view = await expectContract(await viewUrl(get(`/assets/${id}/view-url`), ps(id)), 200, R.viewUrlResponse, "asset-view-url")
    const fileUrl = new URL(String(view.url), "http://localhost")
    const file = await readFile(new Request(fileUrl), keyParams(fileUrl))
    expect([file.status, file.headers.get("content-type")]).toEqual([200, "image/png"])
    const partial = await readFile(new Request(fileUrl, { headers: { range: "bytes=0-3" } }), keyParams(fileUrl))
    expect([partial.status, partial.headers.get("content-range")]).toEqual([206, `bytes 0-3/${PNG.length}`])
    const unsigned = new URL(fileUrl.pathname, "http://localhost")
    expect((await readFile(new Request(unsigned), keyParams(unsigned))).status).toBe(400)

    // @release-strip
    await expectContract(await approveAsset(send(`/assets/${id}/approve`, "POST"), ps(id)), 200, R.assetResponse, "asset-approve")
    // @release-strip-end
    const second = await uploadPng()
    await registerAsset(send("/assets", "POST", { asset_id: second.assetId, kind: "ORIGINAL", storage_key: second.storageKey, mime_type: "image/png" }))
    const del = await deleteAsset(send(`/assets/${second.assetId}`, "DELETE"), ps(second.assetId))
    expect([del.status, await del.text()]).toEqual([204, ""])
  })

  it("thùng rác và Kho dữ liệu", async () => {
    const up = await uploadPng()
    await registerAsset(send("/assets", "POST", { asset_id: up.assetId, kind: "ORIGINAL", storage_key: up.storageKey, mime_type: "image/png" }))
    await expectContract(await librarySummary(get("/storage/library/summary?scope=all")), 200, R.librarySummaryResponse, "library-summary")
    await expectContract(await library(get("/storage/library?type=original&scope=all")), 200, R.libraryResponse, "library")
    await expectContract(await moveToTrash(send("/storage/trash", "POST", { id: up.assetId, type: "RAW_ASSET" })), 200, R.trashedResponse, "trash-move")
    await expectContract(await listTrash(get("/storage/trash")), 200, R.trashResponse, "trash-list")
    await expectContract(await restore(send(`/storage/trash/${up.assetId}/restore`, "POST", { type: "RAW_ASSET" }), ps(up.assetId)), 200, R.restoredResponse, "trash-restore")
    await moveToTrash(send("/storage/trash", "POST", { id: up.assetId, type: "RAW_ASSET" }))
    await expectContract(await purge(send(`/storage/trash/${up.assetId}?type=RAW_ASSET`, "DELETE"), ps(up.assetId)), 200, R.purgedResponse, "trash-purge")
    expect((await purge(send(`/storage/trash/${up.assetId}`, "DELETE"), ps(up.assetId))).status).toBe(400)
  })

  it("nơi dùng tư liệu: tạo, danh sách, sửa", async () => {
    const created = await expectContract(
      await createUsage(send("/asset-usages", "POST", { source_type: "ai_image", source_id: "asset-1", asset_type_code: "8", destination: "PROMOTION", cta_code: "LEARN_MORE", title: "Banner khuyến mãi Tết" })),
      201, R.usageCreatedResponse, "usage-create"
    )
    const id = String(((created.data as { usage: { id: string } }).usage).id)
    await expectContract(await listUsages(get("/asset-usages?source_type=ai_image&limit=10")), 200, R.usagesResponse, "usages")
    await expectContract(await patchUsage(send(`/asset-usages/${id}`, "PATCH", { title: "Banner Tết 2027", status: "ACTIVE" }), ps(id)), 200, R.usageResponse, "usage-patch")
    expect((await listUsages(get("/asset-usages?limit=500"))).status).toBe(400)
  })
})
