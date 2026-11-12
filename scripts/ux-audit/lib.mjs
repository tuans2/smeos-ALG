// Khung audit sâu UX (OPERATING_PRINCIPLES §4): đăng ký + duyệt + đăng nhập một tiệm mẫu, nạp dữ liệu thật tối thiểu,
// rồi chụp ảnh + axe + soát nội dung cho từng trạng thái ở 390px và 1280px. Chỉ dùng database *_test.
import { mkdirSync } from "node:fs"
import { chromium } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import pg from "pg"
import { assertTestDatabase, scanRedFlags, summarize } from "./checks.mjs"

export const BASE = process.env.UX_AUDIT_BASE_URL || "http://localhost:3200"
export const OUT = process.env.UX_AUDIT_OUT || "ux-audit-output"
const DB = process.env.DATABASE_URL || ""
const VIEWPORTS = [[390, 844], [1280, 900]]

export async function q(sql, params) {
  const c = new pg.Client({ connectionString: DB })
  await c.connect()
  try { return (await c.query(sql, params)).rows } finally { await c.end() }
}

const PRODUCTS = [
  { code: "SP01", name: "Bó hồng đỏ Ohara", price: 650000, img: "/mock-data/floral/p1.jpg", style: "Sang trọng", flowers: [["Hoa hồng đỏ", 12], ["Baby trắng", 3]] },
  { code: "SP02", name: "Giỏ hoa cúc pastel", price: 480000, img: "/mock-data/floral/p2.jpg", style: "Nhẹ nhàng", flowers: [["Cúc họa mi", 20], ["Hồng phấn", 6]] },
  { code: "SP03", name: "Kệ hoa khai trương 2 tầng", price: 1800000, img: "/mock-data/floral/p3.jpg", style: "Rực rỡ", flowers: [["Hướng dương", 15], ["Đồng tiền", 20]] },
  { code: "SP04", name: "Bình tulip tối giản", price: 900000, img: "/mock-data/floral/p4.jpg", style: "Tối giản", flowers: [["Tulip", 10]] },
]

/** Hồ sơ tiệm, 4 sản phẩm có ảnh/giá/BOM + phân tích đã duyệt, 2 đơn giao ngày mai. */
async function seed(page, org, uid) {
  await page.request.put(BASE + "/api/v1/business-profile", { data: { display_name: "Tiệm Hoa Mẫu", phone: "0283 555 0199", address: "12 Lê Lợi, Quận 1, TP.HCM" } })
  const ids = []
  for (const p of PRODUCTS) {
    const bom = { flowers: p.flowers.map(([name, quantity]) => ({ name, quantity, role: "PRIMARY" })), foliage: [{ name: "Lá bạc", quantity: 4 }] }
    const [{ id }] = await q(
      "INSERT INTO products(id,organization_id,code,name,status,category,attributes,created_at,updated_at) VALUES(gen_random_uuid(),$1,$2,$3,'ACTIVE','Bó hoa',$4,now(),now()) RETURNING id",
      [org, p.code, p.name, JSON.stringify({ price: p.price, imageUrl: p.img, craft_complexity: "MEDIUM", bom })],
    )
    ids.push(id)
    await q(
      "INSERT INTO product_analyses(id,organization_id,product_id,asset_id,job_id,provider,model,model_version,contract_name,contract_version,raw,approval_state,approved_by,approved_at,created_at) VALUES(gen_random_uuid(),$1,$2,gen_random_uuid()::text,gen_random_uuid()::text,'seed','seed','1','product_analysis','v1',$3,'APPROVED',$4,now(),now())",
      [org, id, JSON.stringify({ identity: { ten_goi_y: p.name, phong_cach: p.style, dip_phu_hop: ["Sinh nhật", "Khai trương"] }, bom }), uid],
    )
  }
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  for (const [i, pid] of ids.slice(0, 2).entries()) {
    const [{ id: oid }] = await q(
      "INSERT INTO orders(id,organization_id,code,status,total_vnd,balance_vnd,created_by,delivery_window,created_at,updated_at) VALUES(gen_random_uuid(),$1,$2,'CONFIRMED',$3,$3,$4,$5,now(),now()) RETURNING id",
      [org, `DH-AUDIT-${i}`, PRODUCTS[i].price * 2, uid, JSON.stringify({ date: tomorrow })],
    )
    await q("INSERT INTO order_items(id,organization_id,order_id,product_id,quantity,unit_price_vnd) VALUES(gen_random_uuid(),$1,$2,$3,2,$4)", [org, oid, pid, PRODUCTS[i].price])
  }
}

/** Tiệm mẫu mới (tên có dấu thời gian để không trùng định danh), đã duyệt và đăng nhập. `flags`: cờ rollout UX bật cho tiệm. */
export async function login({ seedData = true, flags = [] } = {}) {
  assertTestDatabase(DB)
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {})
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
  // UI Studio chỉ có ở dev (`(app)/layout.tsx`: withUiStudio khi NODE_ENV !== "production", ADR-011 D-UI-01).
  // Ẩn nút nổi của nó để audit đúng màn người dùng thật thấy (nó che nút góc phải dưới ở 1280px).
  await page.addInitScript(() => {
    const css = 'div.fixed:has(> button[aria-label="Mở bảng điều khiển giao diện"]){display:none!important}'
    document.addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: css })))
  })
  const stamp = Date.now()
  const email = `ux-audit-${stamp}@alg.test`, password = "MatKhau-Audit-2026!"
  const r = await page.request.post(BASE + "/api/v1/auth/signup", { data: { email, password, name: "Chủ tiệm", organization_name: `Tiệm Hoa Mẫu ${stamp}` } })
  if (!r.ok()) throw new Error(`đăng ký ${r.status()}`)
  await q("UPDATE users SET approval_status='APPROVED', approval_decided_at=now() WHERE email=$1", [email])
  if (!(await page.request.post(BASE + "/api/v1/auth/login", { data: { email, password } })).ok()) throw new Error("đăng nhập thất bại")
  const [{ organization_id: org, user_id: uid }] = await q("SELECT m.organization_id, u.id AS user_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE u.email=$1 LIMIT 1", [email])
  if (flags.length) {
    const v = Object.fromEntries(flags.map((f) => [f, { mode: "allowlist", organizationIds: [org] }]))
    await q("INSERT INTO platform_settings(key,value,updated_at) VALUES('ux_rollout_flags',$1,now()) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()", [JSON.stringify(v)])
  }
  if (seedData) await seed(page, org, uid)
  return { browser, page, org, uid }
}

/** Mở một đường dẫn trong app và chờ tải xong. */
export async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 240000 })
  // Trang có kết nối mở lâu (thông báo thời gian thực) không bao giờ "networkidle": chờ tối đa 15 giây rồi đo.
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined)
}

/**
 * Chụp + axe + soát nội dung một trạng thái ở hai khổ. `prep(page)` đưa màn về trạng thái cần xem
 * (chạy lại ở mỗi khổ). Trả về các dòng kết quả.
 */
export async function shot(page, name, prep) {
  mkdirSync(OUT, { recursive: true })
  const out = []
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h })
    try { await prep(page) } catch (e) { out.push({ line: `${name} @${w}: KHÔNG DỰNG ĐƯỢC TRẠNG THÁI — ${String(e).slice(0, 160)}`, failed: true }); continue }
    await page.waitForTimeout(1200)
    // Về đầu trang trước khi đo: nội dung đã cuộn nằm dưới thanh đầu trang dính, axe sẽ báo nhầm
    // "bị che" (target-size) dù bố cục không lỗi. Ảnh chụp là toàn trang nên không mất phần nào.
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true })
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    const flags = scanRedFlags(await page.evaluate(() => document.body.innerText + " " + [...document.images].map((i) => i.src).join(" ")))
    out.push(summarize({ name, width: w, scrollWidth, violations, flags }))
  }
  return out
}
