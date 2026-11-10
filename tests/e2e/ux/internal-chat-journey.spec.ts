/**
 * Hành trình Trao đổi nội bộ có dữ liệu thật (kế hoạch `docs/plan/hoan-thien-chat-noi-bo.md`, kịch bản nghiệm thu §8):
 * chuỗi liên kết cửa hàng đối tác → bắn đơn → cửa hàng thấy thẻ mời trong phòng → nhắn tin, gửi ảnh, sửa, thu hồi →
 * chuỗi thấy đúng. Dữ liệu nền (loại chuỗi, liên kết, ứng viên bắn đơn, đơn) ghi thẳng vào CSDL e2e như helpers.
 * `WALK_SHOTS=<thư mục>` thì chụp màn từng bước.
 */
import { expect, test, type Page } from "@playwright/test"
import { Client } from "pg"
import sharp from "sharp"
import { createTestUserAndLogin, testClientHeaders } from "./helpers"

const SHOTS = process.env.WALK_SHOTS
const dbUrl = process.env.DATABASE_URL || "postgresql://floraos:floraos@localhost:5432/floraos"

async function sql(text: string, params: unknown[] = []) {
  const c = new Client({ connectionString: dbUrl })
  await c.connect()
  try {
    return (await c.query(text, params)).rows
  } finally {
    await c.end()
  }
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
}

test.use({ actionTimeout: 20_000, navigationTimeout: 60_000 })

test("walkthrough: chuỗi giao đơn, cửa hàng nhận thẻ, nhắn tin, ảnh, sửa, thu hồi", async ({ browser }) => {
  test.setTimeout(240_000)
  const chainCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  const storeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  const chainPage = await chainCtx.newPage()
  const storePage = await storeCtx.newPage()
  const chain = await createTestUserAndLogin(chainPage)
  const store = await createTestUserAndLogin(storePage)
  const headers = testClientHeaders()

  await sql(`UPDATE organizations SET type = 'CHAIN', name = 'Chuỗi Hoa Sen' WHERE id = $1`, [chain.orgId])
  await sql(`UPDATE organizations SET name = 'Tiệm Hoa Cầu Giấy' WHERE id = $1`, [store.orgId])
  await sql(`INSERT INTO organization_links (id, parent_org_id, child_org_id, partner_code, status, link_type, updated_at) VALUES (gen_random_uuid()::text, $1, $2, 'HN-01', 'ACTIVE', 'SUBCONTRACTOR', now())`, [chain.orgId, store.orgId])
  // Như GĐ3 khi liên kết ACTIVE: cửa hàng thành ứng viên bắn đơn của chuỗi
  await sql(`INSERT INTO branches (id, organization_id, code, name, accepts_dispatch, is_active, partner_org_id, province, updated_at) VALUES (gen_random_uuid()::text, $1, 'DT-HN-01', 'Tiệm Hoa Cầu Giấy', true, true, $2, 'Hà Nội', now())`, [chain.orgId, store.orgId])

  const room = await chainPage.request.post("/api/v1/internal-chat/conversations", { headers, data: { partnerOrgId: store.orgId } })
  expect(room.ok()).toBe(true)
  const roomId = ((await room.json()) as { data: { id: string } }).data.id

  const [order] = await sql(
    `INSERT INTO orders (id, organization_id, code, source, status, total_vnd, paid_vnd, balance_vnd, created_by, delivery_address, delivery_window, updated_at)
     VALUES (gen_random_uuid()::text, $1, 'DH-0911-01', 'BROCHURE', 'CONFIRMED', 650000, 650000, 0, $2, $3, $4, now()) RETURNING id`,
    [chain.orgId, chain.userId, JSON.stringify({ street: "5 Xuân Thuỷ, Dịch Vọng Hậu, Hà Nội", parts: { houseNumber: "5", street: "Xuân Thuỷ", ward: "Dịch Vọng Hậu", province: "Hà Nội" } }), JSON.stringify({ date: "10/11/2026", timeSlot: "14:00 - 16:00" })]
  )
  const dispatch = await chainPage.request.post(`/api/v1/greeting-card/orders/${order.id}/chain-dispatch`, { headers, data: { approvedBranchIds: ["DT-HN-01"] } })
  expect(dispatch.ok(), await dispatch.text()).toBe(true)

  const say = await chainPage.request.post(`/api/v1/internal-chat/conversations/${roomId}/messages`, { headers, data: { content: "Chào tiệm, chiều nay có đơn giao Cầu Giấy, tiệm nhận giúp nhé." } })
  expect(say.ok()).toBe(true)

  // Cửa hàng mở phòng qua đường dẫn "Mở trong smeOS"
  await storePage.goto(`/tin-nhan?chuoi=${chain.orgId}`)
  await expect(storePage.getByText("Đang mời nhận đơn")).toBeVisible({ timeout: 30_000 })
  await expect(storePage.getByRole("link", { name: "Xem và nhận đơn" })).toBeVisible()
  await storePage.getByLabel("Nội dung tin nhắn").fill("Dạ tiệm nhận ạ, 3 giờ chiều có hàng.")
  await Promise.all([
    storePage.waitForResponse((r) => r.url().endsWith("/messages") && r.request().method() === "POST"),
    storePage.keyboard.press("Enter"),
  ])
  await expect(storePage.getByLabel("Nội dung tin nhắn")).toHaveValue("")

  // Ảnh mẫu
  const png = await sharp({ create: { width: 480, height: 480, background: { r: 232, g: 120, b: 150 }, channels: 3 } }).png().toBuffer()
  await storePage.getByLabel("Chọn ảnh để gửi").setInputFiles({ name: "mau.png", mimeType: "image/png", buffer: png })
  await storePage.getByLabel("Nội dung tin nhắn").fill("Ảnh mẫu bó hoa")
  await expect(storePage.locator('ul[aria-label="Ảnh sẽ gửi"] li')).toHaveCount(1)
  await expect(storePage.getByRole("button", { name: "Gửi", exact: true })).toBeEnabled()
  // Nút Gửi bị widget "UI Studio" (chỉ có ngoài production) che ở khổ 1280 — gửi bằng Enter như người dùng thường làm
  await storePage.getByLabel("Nội dung tin nhắn").press("Enter")
  await expect(storePage.getByAltText(/Ảnh 1/)).toBeVisible({ timeout: 30_000 })

  // Sửa tin
  const mine = storePage.locator("div.space-y-1", { hasText: "Dạ tiệm nhận ạ" }).first()
  await mine.getByRole("button", { name: "Sửa" }).click()
  await storePage.getByLabel("Sửa tin nhắn").fill("Dạ tiệm nhận ạ, 4 giờ chiều có hàng.")
  await storePage.keyboard.press("Enter")
  await expect(storePage.getByText("Dạ tiệm nhận ạ, 4 giờ chiều có hàng.")).toBeVisible()
  await expect(storePage.getByText("(đã sửa)")).toBeVisible()
  await shot(storePage, "01-cua-hang-desktop")

  await storePage.setViewportSize({ width: 390, height: 844 })
  await storePage.reload()
  await expect(storePage.getByText("Đang mời nhận đơn")).toBeVisible({ timeout: 30_000 })
  await shot(storePage, "02-cua-hang-dien-thoai")

  // Thu hồi ảnh
  await storePage.setViewportSize({ width: 1280, height: 800 })
  const imageMsg = storePage.locator("div.space-y-1", { hasText: "Ảnh mẫu bó hoa" }).first()
  await imageMsg.getByRole("button", { name: "Thu hồi" }).click()
  await storePage.getByRole("dialog").getByRole("button", { name: "Thu hồi" }).click()
  await expect(storePage.getByText("Tin nhắn đã được thu hồi")).toBeVisible()
  await shot(storePage, "03-cua-hang-sau-thu-hoi")

  // Phía chuỗi
  await chainPage.goto(`/tin-nhan?doi-tac=${store.orgId}`)
  await expect(chainPage.getByText("Tin nhắn đã được thu hồi")).toBeVisible({ timeout: 30_000 })
  await shot(chainPage, "04-chuoi-desktop")
  await chainCtx.close()
  await storeCtx.close()
})
