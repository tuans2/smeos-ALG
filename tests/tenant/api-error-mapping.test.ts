import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { POST as packageDraft } from "@/app/api/v1/creative-production/package/route"
import { POST as approveScript } from "@/app/api/v1/video/jobs/[id]/approve-script/route"
import { POST as approveVideo } from "@/app/api/v1/video/jobs/[id]/approve-video/route"
import { POST as render } from "@/app/api/v1/video/jobs/[id]/render/route"
import { GET as getVideo } from "@/app/api/v1/video/jobs/[id]/route"
import { PATCH as storyboard } from "@/app/api/v1/video/jobs/[id]/storyboard/route"
import { POST as createVideo } from "@/app/api/v1/video/jobs/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { VideoJobRepository } from "@/modules/video-studio/infra/video-job-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Audit API §13 (08/11/2026): các đường dưới đây từng trả 500 vì use-case/route ném `Error` trần hoặc `JSON.parse`
 * trực tiếp. Chuẩn API Contract v1.1 §2/§5: không thấy hoặc của tổ chức khác → 404, sai trạng thái → 409, nội dung
 * chưa đạt luật → 422, thân hỏng → 400.
 */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("ánh xạ lỗi HTTP — Video Studio và gộp chiến dịch", () => {
  let a: Tenant
  let b: Tenant
  const send = (who: Tenant, path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }) })

  async function expectError(response: Response, status: number, code: string) {
    const body = await readJson(response)
    expect({ status: response.status, code: (body.error as { code?: string } | undefined)?.code }).toEqual({ status, code })
  }

  async function masterAsset(who: Tenant) {
    const id = randomUUID()
    await new AssetRepository().create(who.ctx, {
      id, productId: null, parentAssetId: null, kind: "MASTER", version: 1, storageKey: `org/${who.organizationId}/unfiled/${id}.jpg`, mimeType: "image/jpeg", createdBy: who.userId,
    })
    return id
  }

  async function newVideoJob(who: Tenant) {
    const res = await createVideo(send(who, "/video/jobs", "POST", { title: "Video thử lỗi", format: "REEL_15S" }))
    expect(res.status).toBe(201)
    return String((await readJson(res)).id)
  }

  async function validScenes(who: Tenant) {
    const images = await Promise.all([1, 2, 3].map(() => masterAsset(who)))
    return images.map((imageAssetId, i) => ({ sceneIndex: i + 1, durationSeconds: 4, textOverlay: `Cảnh ${i + 1}`, imageAssetId }))
  }

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("loi-video-a")
    b = await createTenant("loi-video-b")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("job video của tổ chức khác → 404 ở mọi thao tác", async () => {
    const id = await newVideoJob(a)
    await expectError(await getVideo(send(b, `/video/jobs/${id}`, "GET"), ps(id)), 404, "NOT_FOUND")
    await expectError(await storyboard(send(b, `/video/jobs/${id}/storyboard`, "PATCH", { scenes: await validScenes(b) }), ps(id)), 404, "NOT_FOUND")
    await expectError(await approveScript(send(b, `/video/jobs/${id}/approve-script`, "POST"), ps(id)), 404, "NOT_FOUND")
    await expectError(await approveVideo(send(b, `/video/jobs/${id}/approve-video`, "POST"), ps(id)), 404, "NOT_FOUND")
    // Job vẫn nguyên ở tổ chức A.
    expect((await getVideo(send(a, `/video/jobs/${id}`, "GET"), ps(id))).status).toBe(200)
  })

  it("mã job không tồn tại → 404", async () => {
    const id = randomUUID()
    await expectError(await getVideo(send(a, `/video/jobs/${id}`, "GET"), ps(id)), 404, "NOT_FOUND")
  })

  it("sai trạng thái → 409; phân cảnh sai luật → 422", async () => {
    const id = await newVideoJob(a)
    await expectError(await approveVideo(send(a, `/video/jobs/${id}/approve-video`, "POST"), ps(id)), 409, "CONFLICT")

    const oneScene = [{ sceneIndex: 1, durationSeconds: 4, textOverlay: "Một cảnh" }]
    await expectError(await storyboard(send(a, `/video/jobs/${id}/storyboard`, "PATCH", { scenes: oneScene }), ps(id)), 422, "UNPROCESSABLE_ENTITY")

    expect((await storyboard(send(a, `/video/jobs/${id}/storyboard`, "PATCH", { scenes: await validScenes(a) }), ps(id))).status).toBe(200)
    expect((await approveScript(send(a, `/video/jobs/${id}/approve-script`, "POST"), ps(id))).status).toBe(200)
    await expectError(await approveScript(send(a, `/video/jobs/${id}/approve-script`, "POST"), ps(id)), 409, "CONFLICT")

    await new VideoJobRepository().updateStage(a.ctx, id, "RENDERING")
    await expectError(await storyboard(send(a, `/video/jobs/${id}/storyboard`, "PATCH", { scenes: await validScenes(a) }), ps(id)), 409, "CONFLICT")
  })

  it("dựng video với thân không phải JSON → 400", async () => {
    const id = await newVideoJob(a)
    await expectError(await render(send(a, `/video/jobs/${id}/render`, "POST", "{không phải json"), ps(id)), 400, "VALIDATION_FAILED")
  })

  it("gộp chiến dịch thiếu cả creativeResult lẫn authenticResult → 400", async () => {
    await expectError(await packageDraft(send(a, "/creative-production/package", "POST", { campaignName: "Thiếu kết quả" })), 400, "VALIDATION_FAILED")
  })
})
