// Mục Thương hiệu 3 bước — /ho-so (PO 08/11/2026): Hồ sơ cửa hàng → Bộ nhận diện → Landing page chính thức,
// cùng /ho-so/danh-thiep, trang chia sẻ /ch/<slug> và trang chính thức /c/<slug>.
// Trạng thái: hồ sơ trống (bước 2–3 khoá), hồ sơ đủ chưa có phương án, 3 phương án, đã chọn bộ nhận diện,
// hộp xác nhận tạo link chia sẻ, đã có link, bước 3 chưa có phương án, 3 phương án landing, hộp xác nhận
// xuất bản, đã xuất bản, trang khách chính thức, trang chia sẻ, danh thiếp + tải tệp, link đã ngừng, link sai.
import { q } from "../lib.mjs"

async function clearProfile(org) {
  await q("DELETE FROM brand_style_options WHERE organization_id=$1", [org])
  await q("DELETE FROM store_share_links WHERE organization_id=$1", [org])
  await q("DELETE FROM business_profiles WHERE organization_id=$1", [org])
  await q("DELETE FROM brand_profiles WHERE organization_id=$1", [org])
}

async function fillProfile(org) {
  const products = await q("SELECT id FROM products WHERE organization_id=$1 AND status='ACTIVE' ORDER BY code LIMIT 3", [org])
  await q(
    `INSERT INTO business_profiles (id, organization_id, display_name, phone, email, address, website, description, social_links, operating_hours, target_customers, updated_at)
     VALUES (gen_random_uuid(), $1, 'Cửa hàng Kiểm thử', '0283 821 4479', 'lienhe@kiem-thu.test', '12 Đường Kiểm Thử, Phường 1', 'kiem-thu.test',
             'Cửa hàng hoa nhỏ, cắm theo yêu cầu cho văn phòng và gia đình.', '{"facebook":"https://facebook.com/kiem-thu"}', '{"default":"8:00–21:00"}',
             '["Văn phòng tặng sếp","Gia đình"]', now())
     ON CONFLICT (organization_id) DO UPDATE SET display_name=EXCLUDED.display_name, phone=EXCLUDED.phone, address=EXCLUDED.address,
       description=EXCLUDED.description, target_customers=EXCLUDED.target_customers`,
    [org]
  )
  const assets = { storefront_photos: ["/images/sample-flower.jpg"], intro_video: "/brand/moc-lan-intro.mp4", featured_product_ids: products.map((p) => p.id) }
  await q(
    `INSERT INTO brand_profiles (id, organization_id, primary_color, brand_assets, updated_at)
     VALUES (gen_random_uuid(), $1, '#2f6f4e', $2, now())
     ON CONFLICT (organization_id) DO UPDATE SET brand_assets=EXCLUDED.brand_assets`,
    [org, JSON.stringify(assets)]
  )
}

export async function run({ open, shot, org }) {
  await clearProfile(org)
  await shot("thuong-hieu-buoc1-trong", (p) => open(p, "/ho-so"))
  await shot("thuong-hieu-danh-thiep-chua-du", (p) => open(p, "/ho-so/danh-thiep"))

  await fillProfile(org)
  await shot("thuong-hieu-buoc1-du", async (p) => {
    await open(p, "/ho-so")
    await p.getByRole("button", { name: /Hồ sơ cửa hàng/ }).first().click()
    await p.getByRole("button", { name: "Xác nhận hồ sơ — tạo Bộ nhận diện" }).waitFor()
  })
  // Luồng chính: xác nhận hồ sơ → hệ thống tự tạo 3 phương án Bộ nhận diện và mở Bước 2
  await shot("thuong-hieu-buoc2-3-phuong-an", async (p) => {
    await open(p, "/ho-so")
    if (await p.getByRole("article").count() === 0) {
      await p.getByRole("button", { name: /Hồ sơ cửa hàng/ }).first().click()
      await p.getByRole("button", { name: "Xác nhận hồ sơ — tạo Bộ nhận diện" }).click()
    }
    await p.getByRole("article").nth(2).waitFor({ timeout: 60000 })
  })
  await shot("thuong-hieu-buoc2-da-chon", async (p) => {
    await open(p, "/ho-so")
    const tab = p.getByRole("button", { name: "Bộ nhận diện thương hiệu" })
    if (await tab.count()) await tab.click()
    const pick = p.getByRole("button", { name: "Chọn phương án này" }).first()
    if (await p.getByText("Bộ nhận diện đang dùng").count() === 0) await pick.click()
    await p.getByText("Bộ nhận diện đang dùng").waitFor({ timeout: 60000 })
  })
  await shot("thuong-hieu-xac-nhan-tao-link", async (p) => {
    await open(p, "/ho-so")
    await p.getByRole("button", { name: "Bộ nhận diện thương hiệu" }).click()
    await p.getByRole("button", { name: "Tạo link chia sẻ" }).click()
    await p.getByRole("dialog").waitFor()
  })
  await shot("thuong-hieu-da-co-link", async (p) => {
    await open(p, "/ho-so")
    await p.getByRole("button", { name: "Bộ nhận diện thương hiệu" }).click()
    const create = p.getByRole("button", { name: "Tạo link chia sẻ" })
    await create.or(p.getByLabel("Link của cửa hàng")).first().waitFor()
    if (await create.count()) {
      await create.click()
      await p.getByRole("dialog").getByRole("button", { name: "Tạo link" }).click()
    }
    await p.getByLabel("Link của cửa hàng").waitFor()
  })

  // Đã chọn Bộ nhận diện → "Tạo Landing page" tự dựng 3 giao diện và mở Bước 3
  await shot("thuong-hieu-buoc3-3-phuong-an", async (p) => {
    await open(p, "/ho-so")
    if (await p.getByRole("button", { name: "Chọn và xuất bản" }).count() === 0) {
      await p.getByRole("button", { name: "Bộ nhận diện thương hiệu" }).click()
      await p.getByRole("button", { name: "Tạo Landing page" }).click()
    }
    await p.getByRole("button", { name: "Chọn và xuất bản" }).nth(2).waitFor({ timeout: 90000 })
  })
  await shot("thuong-hieu-buoc3-xac-nhan", async (p) => {
    await open(p, "/ho-so")
    await p.getByRole("button", { name: "Chọn và xuất bản" }).first().click()
    await p.getByRole("dialog").waitFor()
  })
  await shot("thuong-hieu-buoc3-da-xuat-ban", async (p) => {
    await open(p, "/ho-so")
    if (await p.getByText("Trang chính thức đang hoạt động").count() === 0) {
      await p.getByRole("button", { name: "Chọn và xuất bản" }).first().click()
      await p.getByRole("dialog").getByRole("button", { name: "Xuất bản" }).click()
    }
    await p.getByText("Trang chính thức đang hoạt động").waitFor({ timeout: 60000 })
  })

  const [{ content }] = await q("SELECT content FROM brand_style_options WHERE organization_id=$1 AND kind='LANDING' AND selected_at IS NOT NULL", [org])
  await shot("thuong-hieu-trang-chinh-thuc", (p) => open(p, `/c/${content.published_slug}`))
  await shot("thuong-hieu-landing-page-cong-cu", (p) => open(p, "/landing-page"))

  const [{ slug }] = await q("SELECT slug FROM store_share_links WHERE organization_id=$1 AND is_revoked=false", [org])
  await shot("thuong-hieu-trang-khach", (p) => open(p, `/ch/${slug}`))
  await shot("thuong-hieu-danh-thiep", async (p) => {
    await open(p, "/ho-so/danh-thiep")
    await p.getByRole("button", { name: "Tải bản in PDF" }).waitFor()
  })
  // Tải thật từng tệp: không có sự kiện tải hoặc tệp rỗng → trạng thái hỏng
  await shot("thuong-hieu-danh-thiep-tai-tep", async (p) => {
    await open(p, "/ho-so/danh-thiep")
    for (const [label, ext] of [["Tải bản in PDF", ".pdf"], ["Ảnh mặt trước", ".png"], ["Ảnh mặt sau", ".png"], ["Danh bạ điện tử (.vcf)", ".vcf"]]) {
      const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 30000 }), p.getByRole("button", { name: label }).click()])
      const name = dl.suggestedFilename()
      const { size } = await import("node:fs").then((fs) => dl.path().then((f) => fs.statSync(f)))
      if (!name.endsWith(ext) || size < 200) throw new Error(`tệp ${label} không hợp lệ: ${name} (${size} byte)`)
      console.log(`  tải ${name}: ${size} byte`)
    }
  })
  await shot("thuong-hieu-xac-nhan-ngung", async (p) => {
    await open(p, "/ho-so")
    await p.getByRole("button", { name: "Bộ nhận diện thương hiệu" }).click()
    await p.getByRole("button", { name: "Ngừng chia sẻ" }).click()
    await p.getByRole("dialog").waitFor()
  })

  await q("UPDATE store_share_links SET is_revoked=true, revoked_at=now() WHERE organization_id=$1", [org])
  await shot("thuong-hieu-link-da-ngung", (p) => open(p, `/ch/${slug}`))
  await shot("thuong-hieu-link-sai", (p) => open(p, "/ch/khong-ton-tai"))
}
