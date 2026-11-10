import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-ai-studio"
import { GET as getAudioJob } from "@/app/api/v1/audio/jobs/[id]/route"
import { POST as createAudioJob } from "@/app/api/v1/audio/jobs/route"
import { DELETE as deleteTrack } from "@/app/api/v1/audio/music-tracks/[id]/route"
import { GET as listTracks, POST as uploadTrack } from "@/app/api/v1/audio/music-tracks/route"
import { GET as playSystemTrack } from "@/app/api/v1/audio/music-tracks/system/[trackId]/route"
import { DELETE as deleteClone, GET as getClone } from "@/app/api/v1/audio/voice-clones/[id]/route"
import { GET as listClones, POST as createClone } from "@/app/api/v1/audio/voice-clones/route"
import { POST as cancelJob } from "@/app/api/v1/jobs/[id]/cancel/route"
import { GET as jobEvents } from "@/app/api/v1/jobs/[id]/events/route"
import { POST as retryJob } from "@/app/api/v1/jobs/[id]/retry/route"
import { GET as getJob } from "@/app/api/v1/jobs/[id]/route"
import { POST as batchJob } from "@/app/api/v1/jobs/batch/route"
import { GET as listJobs } from "@/app/api/v1/jobs/route"
import { POST as productsPost } from "@/app/api/v1/products/route"
import { POST as approveScript } from "@/app/api/v1/video/jobs/[id]/approve-script/route"
import { POST as approveVideo } from "@/app/api/v1/video/jobs/[id]/approve-video/route"
import { POST as render } from "@/app/api/v1/video/jobs/[id]/render/route"
import { GET as getVideo } from "@/app/api/v1/video/jobs/[id]/route"
import { PATCH as storyboard } from "@/app/api/v1/video/jobs/[id]/storyboard/route"
import { GET as listVideos, POST as createVideo } from "@/app/api/v1/video/jobs/route"
import { POST as approveAnalysis } from "@/app/api/v1/vision/analyses/[id]/approve/route"
import { POST as rejectAnalysis } from "@/app/api/v1/vision/analyses/[id]/reject/route"
import { GET as getAnalysis, PATCH as editAnalysis } from "@/app/api/v1/vision/analyses/[id]/route"
import { GET as exportAnalyses } from "@/app/api/v1/vision/analyses/export/route"
import { GET as listAnalyses, POST as requestAnalysis } from "@/app/api/v1/vision/analyses/route"
import { GET as getEngine, PUT as putEngine } from "@/app/api/v1/vision/engine/route"
import { MUSIC_CATALOG } from "@/modules/audio-studio/domain/music-catalog"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { VideoJobRepository } from "@/modules/video-studio/infra/video-job-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi `/jobs/*`, `/vision/*`, `/audio/*`, `/video/*` (OpenAPI nội bộ, PO 07/11/2026). Worker không chạy:
 * kết quả của nó (dòng `product_analyses`, trạng thái job, bản dựng video) được chèn thẳng; `fetch` ra ngoài giả lập.
 */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — tác vụ AI, phân tích ảnh, âm thanh, video", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown, idem = false) =>
    withSession(`${BASE}${path}`, t.token, { method, headers: idem ? { "Idempotency-Key": randomUUID() } : {}, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  /** Multipart: không qua `withSession` (hàm đó ép `content-type` JSON). */
  const form = (path: string, fd: FormData, idem = false) => {
    const cookie = withSession(`${BASE}${path}`, t.token).headers.get("cookie") ?? ""
    return new Request(`${BASE}${path}`, { method: "POST", body: fd, headers: { cookie, ...(idem ? { "Idempotency-Key": randomUUID() } : {}) } })
  }
  const audioBytes = (size: number) => {
    const bytes = new Uint8Array(size)
    bytes.set([0x49, 0x44, 0x33]) // "ID3"
    return new Blob([bytes], { type: "audio/mpeg" })
  }
  async function asset(kind: "ORIGINAL" | "MASTER" = "ORIGINAL") {
    const id = randomUUID()
    await new AssetRepository().create(t.ctx, {
      id, productId: null, parentAssetId: null, kind, version: 1, storageKey: `org/${t.organizationId}/unfiled/${id}.jpg`, mimeType: "image/jpeg", createdBy: t.userId,
    })
    return id
  }
  async function seedJob(status: "PENDING" | "FAILED") {
    const job = await new GenerationJobRepository().create(t.ctx, {
      workspaceId: t.ctx.workspaceId, branchId: null, userId: t.userId, productId: null, feature: "vision.analyze", payload: {}, idempotencyKey: randomUUID(),
    })
    if (status === "FAILED") await prisma.generation_jobs.update({ where: { id: job.id }, data: { status: "FAILED", error: "lỗi giả lập", completed_at: new Date() } })
    return job.id
  }
  const seedAnalysis = async () =>
    (await new ProductAnalysisRepository().create(t.ctx, {
      productId: null, assetId: await asset(), jobId: randomUUID(), provider: "openai", model: "gpt-4o", modelVersion: "2026-08-01",
      contractName: "PhanTichSanPhamHoa", contractVersion: "1", raw: { identity: { category: "Bó hoa", shape: "Tròn" } },
    })).id

  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 200 })))
    await resetDatabase()
    t = await createTenant("hop-dong-ai")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 500 } })
  })
  afterAll(async () => {
    vi.unstubAllGlobals()
    await disconnectDatabase()
  })

  it("tác vụ AI: danh sách, chi tiết, luồng sự kiện, huỷ, chạy lại, tạo theo module", async () => {
    const pending = await seedJob("PENDING")
    await expectContract(await listJobs(get("/jobs?limit=10")), 200, R.jobsResponse, "jobs-list")
    await expectContract(await getJob(get(`/jobs/${pending}`), ps(pending)), 200, R.jobResponse, "jobs-get")
    await expectContract(await cancelJob(send(`/jobs/${pending}/cancel`, "POST"), ps(pending)), 200, R.jobResponse, "jobs-cancel")
    const stream = await jobEvents(get(`/jobs/${pending}/events`), ps(pending))
    expect(stream.headers.get("content-type")).toContain("text/event-stream")
    expect(await stream.text()).toContain("event: done")
    const failed = await seedJob("FAILED")
    await expectContract(await retryJob(send(`/jobs/${failed}/retry`, "POST"), ps(failed)), 200, R.jobResponse, "jobs-retry")
    await expectContract(await getJob(get(`/jobs/${randomUUID()}`), ps(randomUUID())), 404, null)

    const product = await expectContract(await productsPost(send("/products", "POST", { code: "AI0001", name: "Bó hoa", status: "ACTIVE" })), 201, null)
    const body = { productId: product.id, feature: "vision.analyze", capabilities: ["AIC-11"], module: "M01" }
    await expectContract(await batchJob(send("/jobs/batch", "POST", body, true)), 202, R.jobCreatedResponse, "jobs-batch")
  })

  it("phân tích ảnh: xếp job, hàng chờ, đã duyệt, sửa, duyệt, từ chối, xuất CSV, bộ máy", async () => {
    await expectContract(await requestAnalysis(send("/vision/analyses", "POST", { asset_ids: [await asset()] }, true)), 201, R.analysisCreatedResponse, "vision-create")
    const one = await seedAnalysis()
    const two = await seedAnalysis()
    await expectContract(await listAnalyses(get("/vision/analyses")), 200, R.analysesResponse, "vision-pending")
    await expectContract(await getAnalysis(get(`/vision/analyses/${one}`), ps(one)), 200, R.analysisResponse, "vision-get")
    await expectContract(await editAnalysis(send(`/vision/analyses/${one}`, "PATCH", { edited: { identity: { category: "Giỏ hoa" } } }), ps(one)), 200, R.analysisResponse, "vision-edit")
    await expectContract(await approveAnalysis(send(`/vision/analyses/${one}/approve`, "POST", { create_product: false }), ps(one)), 200, R.analysisResponse, "vision-approve")
    await expectContract(await rejectAnalysis(send(`/vision/analyses/${two}/reject`, "POST", { ly_do: "Ảnh mờ" }), ps(two)), 200, R.analysisResponse, "vision-reject")
    await expectContract(await approveAnalysis(send(`/vision/analyses/${one}/approve`, "POST"), ps(one)), 409, null)
    await expectContract(await listAnalyses(get("/vision/analyses?approval_state=APPROVED")), 200, R.analysesResponse, "vision-approved")

    const csv = await exportAnalyses(get("/vision/analyses/export?states=APPROVED,REJECTED"))
    expect(csv.status).toBe(200)
    expect(csv.headers.get("content-type")).toContain("text/csv")
    await expectContract(await exportAnalyses(get("/vision/analyses/export?states=XYZ")), 400, null)

    const engine = await expectContract(await getEngine(get("/vision/engine")), 200, R.visionEngineResponse, "vision-engine")
    await expectContract(await putEngine(send("/vision/engine", "PUT", { bo_may: engine.dang_dung })), 200, R.visionEngineResponse, "vision-engine-put")
  })

  it("âm thanh: job giọng đọc, thư viện nhạc, giọng nhân bản", async () => {
    const created = await expectContract(
      await createAudioJob(send("/audio/jobs", "POST", { taskType: "VOICEOVER", scenes: [{ sceneIndex: 1, voiceScript: "Chào bạn", targetDurationSeconds: 5 }] }, true)),
      201,
      R.audioJobResultSchema,
      "audio-create"
    )
    const audioId = String(created.jobId)
    await expectContract(await getAudioJob(get(`/audio/jobs/${audioId}`), ps(audioId)), 200, R.audioJobResponse, "audio-get")

    const fd = new FormData()
    for (const [k, val] of Object.entries({ title: "Nhạc riêng", mood: "romantic", license_type: "licensed", license_source: "Giấy phép số 123", attest: "true" })) fd.set(k, val)
    fd.set("file", audioBytes(4096), "bai.mp3")
    const up = await expectContract(await uploadTrack(form("/audio/music-tracks", fd)), 201, R.musicTrackResponse, "audio-track-upload")
    await expectContract(await listTracks(get("/audio/music-tracks")), 200, R.musicTracksResponse, "audio-tracks")
    const trackId = String((up.track as { track_id: string }).track_id)
    await expectContract(await deleteTrack(send(`/audio/music-tracks/${trackId}`, "DELETE"), ps(trackId)), 200, R.okResponse, "audio-track-delete")
    const sys = MUSIC_CATALOG[0]?.trackId ?? ""
    const play = await playSystemTrack(get(`/audio/music-tracks/system/${sys}`), { params: Promise.resolve({ trackId: sys }) })
    expect([200, 404]).toContain(play.status) // tệp nhạc hệ thống có thể chưa có trong kho thử

    const vf = new FormData()
    vf.set("name", "Giọng chủ tiệm")
    vf.set("consent", "true")
    vf.set("sample", audioBytes(60_000), "mau.mp3")
    const clone = await expectContract(await createClone(form("/audio/voice-clones", vf, true)), 201, R.voiceCloneCreatedResponse, "audio-clone-create")
    const cloneId = String((clone.voice_clone as { id: string }).id)
    await expectContract(await listClones(get("/audio/voice-clones")), 200, R.voiceClonesResponse, "audio-clones")
    await expectContract(await getClone(get(`/audio/voice-clones/${cloneId}`), ps(cloneId)), 200, R.voiceCloneResponse, "audio-clone-get")
    await expectContract(await deleteClone(send(`/audio/voice-clones/${cloneId}`, "DELETE"), ps(cloneId)), 200, R.voiceCloneDeletedResponse, "audio-clone-delete")
  })

  it("video: tạo, danh sách, phân cảnh, duyệt kịch bản, dựng, duyệt thành phẩm", async () => {
    const job = await expectContract(await createVideo(send("/video/jobs", "POST", { title: "Video thử", format: "REEL_15S" })), 201, R.videoJobRecordSchema, "video-create")
    const id = String(job.id)
    await expectContract(await listVideos(get("/video/jobs?format=REEL_15S")), 200, R.videoJobsResponse, "video-list")
    const images = await Promise.all([1, 2, 3].map(() => asset("MASTER")))
    const scenes = images.map((imageAssetId, i) => ({ sceneIndex: i + 1, durationSeconds: 4, textOverlay: `Cảnh ${i + 1}`, imageAssetId }))
    await expectContract(await storyboard(send(`/video/jobs/${id}/storyboard`, "PATCH", { scenes }), ps(id)), 200, R.videoJobRecordSchema, "video-storyboard")
    await expectContract(await approveScript(send(`/video/jobs/${id}/approve-script`, "POST"), ps(id)), 200, R.videoJobRecordSchema, "video-approve-script")
    await expectContract(await render(send(`/video/jobs/${id}/render`, "POST", { video_provider: "local_cinematic" }), ps(id)), 200, R.videoRenderResponse, "video-render")
    await new VideoJobRepository().updateStage(t.ctx, id, "RENDER_COMPLETED", { finalVideoUrl: `org/${t.organizationId}/video/${id}.mp4` })
    await expectContract(await getVideo(get(`/video/jobs/${id}`), ps(id)), 200, R.videoJobViewResponse, "video-get")
    await expectContract(await approveVideo(send(`/video/jobs/${id}/approve-video`, "POST"), ps(id)), 200, R.videoJobRecordSchema, "video-approve-video")
  })
})
