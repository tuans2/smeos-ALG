// /cong-cu → nhóm "Quảng bá sản phẩm" dạng 3 ô chức năng độc lập (PO 09/11/2026, D-67): Landing page · Bộ sưu tập
// chung · Bộ sưu tập riêng. Trạng thái: chưa có gì (+ nhắc hồ sơ), Kho trống (nhắc tạo Thẻ sản phẩm), có landing và bộ
// sưu tập (trang chính thức không lẫn vào), từng ô đang mở, form tạo landing / bộ sưu tập, hộp ngừng chia sẻ, lỗi một nguồn.
import { q } from "../lib.mjs"

const MODULE = "/cong-cu?muc=promotion"

export async function run({ open, shot, org, uid }) {
  const nav = (p) => p.getByRole("navigation", { name: "Các chức năng quảng bá" })
  const openHub = async (p, tile = "") => {
    await open(p, `${MODULE}${tile ? `&o=${tile}` : ""}`)
    await nav(p).waitFor({ timeout: 30000 })
  }

  await q("DELETE FROM catalog_links WHERE organization_id=$1", [org])
  await shot("cc-qb-chua-co-gi", (p) => openHub(p))

  // Kho trống: tạm chuyển sản phẩm đang bán sang nháp, chụp xong trả lại
  const active = await q("SELECT id FROM products WHERE organization_id=$1 AND status='ACTIVE'", [org])
  const ids = active.map((r) => r.id)
  if (ids.length) await q("UPDATE products SET status='DRAFT' WHERE id = ANY($1::uuid[])", [ids])
  try {
    await shot("cc-qb-kho-trong", async (p) => {
      await openHub(p)
      await p.getByRole("link", { name: "Tạo Thẻ sản phẩm" }).waitFor({ timeout: 30000 })
    })
  } finally {
    if (ids.length) await q("UPDATE products SET status='ACTIVE' WHERE id = ANY($1::uuid[])", [ids])
  }

  const stamp = Date.now()
  const links = [
    ["Trang chính thức", { store_official: true, archetype: "warm-artisan" }, false],
    ["Hoa 20/10 — dịp Phụ nữ Việt Nam", { archetype: "pastel-romantic", occasion: "20/10" }, false],
    ["Hoa khai trương", { occasion: "khai-truong" }, true],
    ["Bộ sưu tập hoa sinh nhật", { product_ids: [], styleVariant: "MODERN_SHOWROOM" }, false],
  ]
  for (const [i, [name, filters, revoked]] of links.entries()) {
    await q(
      `INSERT INTO catalog_links(id,organization_id,slug,name,filters,is_revoked,revoked_at,created_by,created_at,updated_at)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,CASE WHEN $5 THEN now() END,$6,now(),now())`,
      [org, `audit-qb-${stamp}-${i}`, name, JSON.stringify(filters), revoked, uid],
    )
  }

  await shot("cc-qb-co-du-lieu", (p) => openHub(p))
  await shot("cc-qb-o-landing", async (p) => {
    await openHub(p, "landing")
    await p.getByText("Hoa 20/10 — dịp Phụ nữ Việt Nam").waitFor({ timeout: 30000 })
  })
  await shot("cc-qb-tao-landing", async (p) => {
    await openHub(p, "landing")
    await p.getByRole("button", { name: "Tạo landing mới" }).click()
    await p.getByRole("radiogroup", { name: "Mục đích trang" }).waitFor({ timeout: 30000 })
  })
  await shot("cc-qb-ngung-chia-se", async (p) => {
    await openHub(p, "landing")
    await p.getByRole("button", { name: "Ngừng chia sẻ" }).first().click()
    await p.getByRole("dialog").waitFor()
  })
  await shot("cc-qb-o-chung", async (p) => {
    await openHub(p, "chung")
    await p.getByText("Bộ sưu tập hoa sinh nhật").waitFor({ timeout: 30000 })
  })
  await shot("cc-qb-tao-bo-suu-tap", async (p) => {
    await openHub(p, "chung")
    await p.getByRole("button", { name: "Tạo bộ sưu tập" }).click()
  })
  await shot("cc-qb-o-rieng", async (p) => {
    await openHub(p, "rieng")
    await p.getByRole("link", { name: "Quản lý đơn và theo dõi" }).waitFor({ timeout: 30000 })
  })

  // Lỗi một nguồn: danh sách link hỏng → hai ô đầu báo "Chưa tải được số liệu", ô riêng vẫn chạy
  await shot("cc-qb-loi-mot-nguon", async (p) => {
    await p.route("**/api/v1/catalog-links?*", (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Lỗi thử" } }) }))
    try {
      await openHub(p, "landing")
      await p.getByText("Chưa tải được số liệu").first().waitFor({ timeout: 30000 })
    } finally {
      await p.unroute("**/api/v1/catalog-links?*")
    }
  })
}
