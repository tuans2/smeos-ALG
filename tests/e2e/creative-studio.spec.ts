import { randomUUID } from "node:crypto"
import path from "node:path"

import { expect, test, type APIRequestContext, type Page } from "@playwright/test"
import { approveAndLogin } from "./ux/helpers"

/**
 * Hành trình Creative Studio đầu cuối (25/09/2026) — trình duyệt thật, app
 * thật, Postgres thật, worker media Python THẬT (luồng cục bộ, không khoá nhà
 * cung cấp):
 *
 *   đăng ký → mở /creative-studio → tải ảnh qua GIAO DIỆN (Khu vực A, Chặng 01)
 *   → bóc tách Vision (Chặng 02: vào sổ; không khoá thì hoàn + form nhập tay trống)
 *   → tối ưu ảnh (job `media.optimize`, worker) → duyệt Master (cổng 2)
 *   → biến thể marketing (job `media.variant`, worker, cổng toàn vẫn) → duyệt
 *   → đóng gói chiến dịch (Chặng 07) → QA (Chặng 08) → duyệt gói (Chặng 09)
 *   → sổ `usage` có đủ dòng của các job đã chạy.
 *
 * Cần chạy trước: `docker compose up -d` (hoặc Postgres sẵn có) + `npm run
 * worker:media`. Ảnh mẫu là ảnh TỔNG HỢP (`fixtures/bo-hoa-tong-hop.jpg`), không
 * phải ảnh khách hàng.
 */

const ANH_MAU = path.join(__dirname, "fixtures", "bo-hoa-tong-hop.jpg")
const HAN_WORKER_MS = 240_000

test.describe.configure({ mode: "serial" })

async function doiJob(
  request: APIRequestContext,
  url: string,
  xong: (body: Record<string, unknown>) => boolean
): Promise<Record<string, unknown>> {
  const batDau = Date.now()
  for (;;) {
    const res = await request.get(url)
    expect(res.ok(), `GET ${url} → ${res.status()}`).toBeTruthy()
    const body = (await res.json()) as Record<string, unknown>
    if (body.status === "FAILED" || body.status === "CANCELLED") {
      throw new Error(`Job hỏng: ${JSON.stringify({ status: body.status, error: body.error })}`)
    }
    if (xong(body)) return body
    if (Date.now() - batDau > HAN_WORKER_MS) {
      throw new Error(`Quá ${HAN_WORKER_MS / 1000}s chờ worker — \`npm run worker:media\` có đang chạy? stage=${String(body.stage)}`)
    }
    await new Promise((r) => setTimeout(r, 2_000))
  }
}

test("hành trình Creative Studio: ảnh gốc → Master → biến thể → gói chiến dịch đã duyệt", async ({ page }) => {
  test.setTimeout(10 * 60_000)
  const loiTrang: string[] = []
  page.on("pageerror", (e) => loiTrang.push(e.message))

  // 1. Đăng ký — cookie phiên nằm trong ngữ cảnh trình duyệt, `page.request` dùng chung.
  const email = `e2e-${randomUUID().slice(0, 8)}@alg.test`
  const dangKy = await page.request.post("/api/v1/auth/signup", {
    data: { email, password: "MatKhau-E2E-2026!", name: "E2E", organization_name: "Tiệm hoa E2E" },
  })
  expect(dangKy.status()).toBe(202) // chờ superadmin duyệt (PO 22/10/2026)
  await approveAndLogin(page.request, email, "MatKhau-E2E-2026!")

  // 2. Mở Creative Studio (Khu vực A = Chặng 01–05) và tải ảnh qua ô chọn tệp của thẻ Chặng 01.
  await page.goto("/creative-studio")
  const nutBocTach = page.getByRole("button", { name: /Bóc tách Cấu trúc Hoa/ })
  await expect(nutBocTach).toBeVisible({ timeout: 60_000 })
  // Không chọn sẵn ảnh mẫu: chưa có ảnh trong kho thì chưa bóc tách được (một lượt thu credit).
  await expect(nutBocTach).toBeDisabled()
  const choTai = page.waitForResponse((r) => r.url().endsWith("/api/v1/assets") && r.request().method() === "POST")
  await page.locator('input[type="file"][accept^="image"]').first().setInputFiles(ANH_MAU)
  const dangKyAnh = await choTai
  expect(dangKyAnh.status()).toBe(201)
  const assetId = ((await dangKyAnh.json()) as { asset: { id: string } }).asset.id
  await expect(nutBocTach).toBeEnabled()

  // 3. Chặng 02 — máy này không có khoá OpenAI cho web: lượt Vision hỏng phải
  //    (a) vào sổ rồi được HOÀN, (b) mở form nhập tay TRỐNG, không có dữ liệu bịa.
  const choVision = page.waitForResponse((r) => r.url().endsWith("/api/v1/market-intelligence/vision-extract"))
  await nutBocTach.click()
  const vision = await choVision
  if (vision.ok()) {
    // Máy có khoá thật: kết quả phải đến từ mô hình, kèm mức credit đã thu.
    expect(((await vision.json()) as { source: string }).source).toBe("vision_ai")
  } else {
    expect(vision.status()).toBe(500)
    expect(((await vision.json()) as { error: { message: string } }).error.message).toContain("đã hoàn credit")
    await expect(page.getByText("Thành phần hoa & lá (0)")).toBeVisible()
    await expect(page.getByText("Hoa hồng kem dâu")).toHaveCount(0)
  }

  const request = page.request
  const idem = () => ({ "idempotency-key": randomUUID() })

  // 4. Tối ưu ảnh bằng Studio cục bộ — vào hàng đợi, worker xử lý, Guard ĐO.
  const toiUu = await request.post("/api/v1/media/optimizations", {
    headers: idem(),
    data: { asset_id: assetId, config: { engine: "local_studio", enhancer_provider: "studio" } },
  })
  expect(toiUu.status()).toBe(201)
  const toiUuBody = (await toiUu.json()) as { job_id: string; status: string }
  expect(toiUuBody.status).toBe("PENDING")
  const ketQuaToiUu = await doiJob(request, `/api/v1/media/optimizations/${toiUuBody.job_id}`, (b) => b.status === "COMPLETED")
  const guard = ketQuaToiUu.identity_guard as { result: string; identity_score: number }
  expect(["SAFE", "GOOD", "WARNING"]).toContain(guard.result)
  expect(guard.identity_score).toBeGreaterThan(0)
  const outputs = ketQuaToiUu.outputs as { master: string; master_url: string; ratios: Record<string, string> }
  expect(outputs.master).toBeTruthy()
  expect(Object.keys(outputs.ratios).sort()).toEqual(["16:9", "1:1", "4:5", "9:16"])
  const anhMaster = await request.get(outputs.master_url)
  expect(anhMaster.ok()).toBeTruthy()
  expect((await anhMaster.body()).byteLength).toBeGreaterThan(1_000)

  // 5. Cổng 2 — người duyệt Master.
  const duyetMaster = await request.post(`/api/v1/media/optimizations/${toiUuBody.job_id}/approve`)
  expect(duyetMaster.ok(), await duyetMaster.text()).toBeTruthy()

  // 6. Biến thể marketing (Khu vực D, cục bộ) trên Master đã duyệt.
  const bienThe = await request.post("/api/v1/media/variants", {
    headers: idem(),
    data: { master_asset_id: outputs.master, engine: "local_studio", preset: "studio_white", ratio: "4:5", watermark: false },
  })
  expect(bienThe.status(), await bienThe.text()).toBe(201)
  const bienTheJob = ((await bienThe.json()) as { job_id: string }).job_id
  const ketQuaBienThe = await doiJob(request, `/api/v1/media/variants/${bienTheJob}`, (b) => b.status === "COMPLETED")
  const variants = ketQuaBienThe.variants as { asset_id: string; url: string }[]
  expect(ketQuaBienThe.result).not.toBe("REJECTED")
  expect(variants.length).toBeGreaterThan(0)
  const duyetBienThe = await request.post(`/api/v1/media/variants/${bienTheJob}/approve`, {
    data: { asset_id: variants[0]!.asset_id },
  })
  expect(duyetBienThe.ok(), await duyetBienThe.text()).toBeTruthy()

  // 7. Chặng 07 → 08 → 09: gói chiến dịch, QA máy chủ, duyệt.
  const goi = await request.post("/api/v1/creative-production/packages", {
    data: {
      name: "Gói E2E — bó hoa hồng",
      mode: "AUTHENTIC",
      master_asset_id: outputs.master,
      variant_asset_ids: [variants[0]!.asset_id],
      posts: [{ channel: "facebook", text: "Bó hoa hồng tươi giao trong ngày, đặt qua Zalo của tiệm.", hashtags: ["#hoatuoi"] }],
    },
  })
  expect(goi.status(), await goi.text()).toBe(201)
  const goiId = ((await goi.json()) as { id: string }).id
  const qa = await request.post(`/api/v1/creative-production/packages/${goiId}/qa`)
  expect(qa.ok(), await qa.text()).toBeTruthy()
  const qaBody = (await qa.json()) as { qa?: { verdict: string }; status?: string }
  const verdict = qaBody.qa?.verdict
  expect(verdict).not.toBe("REJECTED")
  const duyetGoi = await request.post(`/api/v1/creative-production/packages/${goiId}/approve`, {
    data: { acknowledge_warnings: true },
  })
  expect(duyetGoi.ok(), await duyetGoi.text()).toBeTruthy()

  // 8. Sổ `usage`: mỗi job đã chạy có dòng của nó — không đường chạy ngoài sổ.
  const soDung = await request.get("/api/v1/usage?limit=50")
  expect(soDung.ok()).toBeTruthy()
  const dong = ((await soDung.json()) as { data: { job_id: string | null; feature: string }[] }).data
  const jobCoDong = new Set(dong.map((d) => d.job_id))
  // Lượt Vision của Chặng 02 cũng vào sổ (trước 25/09/2026 thì không).
  expect(dong.some((d) => d.feature === "product.vision_extract")).toBeTruthy()
  expect(jobCoDong.has(toiUuBody.job_id)).toBeTruthy()
  expect(jobCoDong.has(bienTheJob)).toBeTruthy()

  // 9. Mở lại Creative Studio sau cả hành trình: trang không ném lỗi JS.
  await reloadVaKiem(page)
  expect(loiTrang, loiTrang.join("\n")).toEqual([])
})

async function reloadVaKiem(page: Page) {
  await page.goto("/creative-studio")
  await expect(page.getByRole("button", { name: /Bóc tách Cấu trúc Hoa/ })).toBeVisible({ timeout: 60_000 })
}
