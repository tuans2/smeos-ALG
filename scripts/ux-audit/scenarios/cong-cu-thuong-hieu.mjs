// /cong-cu → nhóm "Hồ sơ & Thương hiệu" dạng ô (PO 08/11/2026) — cùng code với /ho-so, khác cách trình bày.
// Trạng thái: hồ sơ trống (ô cần có, bước 2–3 khoá), khung nhập một ô, hồ sơ đủ chưa có phương án, 3 ô phong cách
// + 6 ô thành phần, đã dùng bộ chính thức, khung lấy link chia sẻ, bước 3 chưa có phương án, 3 ô giao diện,
// hộp xác nhận xuất bản, đã xuất bản, khu "Phát triển sau" (chỉ môi trường phát triển).
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
    `INSERT INTO business_profiles (id, organization_id, display_name, phone, address, description, operating_hours, target_customers, updated_at)
     VALUES (gen_random_uuid(), $1, 'Cửa hàng Kiểm thử', '0283 821 4479', '12 Đường Kiểm Thử, Phường 1',
             'Cửa hàng hoa nhỏ, cắm theo yêu cầu cho văn phòng và gia đình.', '{"open":"08:00","close":"21:00"}', '["Văn phòng tặng sếp","Gia đình"]', now())
     ON CONFLICT (organization_id) DO UPDATE SET display_name=EXCLUDED.display_name, phone=EXCLUDED.phone, address=EXCLUDED.address,
       description=EXCLUDED.description, target_customers=EXCLUDED.target_customers`,
    [org]
  )
  const assets = { storefront_photos: ["/images/sample-flower.jpg"], intro_video: "/brand/moc-lan-intro.mp4", featured_product_ids: products.map((p) => p.id) }
  await q(
    `INSERT INTO brand_profiles (id, organization_id, brand_assets, updated_at) VALUES (gen_random_uuid(), $1, $2, now())
     ON CONFLICT (organization_id) DO UPDATE SET brand_assets=EXCLUDED.brand_assets`,
    [org, JSON.stringify(assets)]
  )
}

export async function run({ open, shot, org }) {
  const openModule = async (p) => {
    await open(p, "/cong-cu")
    await p.getByRole("button", { name: "Hồ sơ & Thương hiệu", exact: true }).click()
    await p.getByRole("navigation", { name: "Các bước xây thương hiệu" }).waitFor({ timeout: 30000 })
  }
  const step = (p, name) => p.getByRole("navigation", { name: "Các bước xây thương hiệu" }).getByRole("button", { name }).click()

  await clearProfile(org)
  await shot("cc-th-buoc1-trong", openModule)
  await shot("cc-th-buoc1-khung-nhap", async (p) => {
    await openModule(p)
    await p.getByRole("button", { name: "Điện thoại" }).click()
    await p.getByRole("dialog").waitFor()
  })

  await fillProfile(org)
  await shot("cc-th-buoc1-du", async (p) => {
    await openModule(p)
    await step(p, /Hồ sơ cửa hàng/)
    await p.getByRole("button", { name: "Xác nhận hồ sơ — tạo Bộ nhận diện" }).waitFor()
  })
  // Luồng chính: xác nhận hồ sơ → hệ thống tự tạo 3 phương án Bộ nhận diện và mở Bước 2
  await shot("cc-th-buoc2-3-phong-cach", async (p) => {
    await openModule(p)
    if (await p.getByRole("button", { name: "Dùng bộ này làm chính thức" }).count() === 0) {
      await step(p, /Hồ sơ cửa hàng/)
      await p.getByRole("button", { name: "Xác nhận hồ sơ — tạo Bộ nhận diện" }).click()
    }
    await p.getByRole("button", { name: "Dùng bộ này làm chính thức" }).waitFor({ timeout: 60000 })
  })
  await shot("cc-th-buoc2-da-dung", async (p) => {
    await openModule(p)
    await step(p, /Bộ nhận diện thương hiệu/)
    const use = p.getByRole("button", { name: "Dùng bộ này làm chính thức" })
    if (await use.count()) await use.click()
    await p.getByRole("button", { name: /Tạo Landing page|Xem Landing page/ }).waitFor({ timeout: 60000 })
  })
  await shot("cc-th-buoc2-link-chia-se", async (p) => {
    await openModule(p)
    await step(p, /Bộ nhận diện thương hiệu/)
    await p.getByRole("button", { name: "Lấy link" }).click()
    await p.getByRole("dialog").waitFor()
  })

  // Đã chọn Bộ nhận diện → "Tạo Landing page" tự dựng 3 giao diện và mở Bước 3
  await shot("cc-th-buoc3-3-giao-dien", async (p) => {
    await openModule(p)
    if (await p.getByRole("button", { name: "Chọn và xuất bản" }).count() === 0) {
      await step(p, /Bộ nhận diện thương hiệu/)
      await p.getByRole("button", { name: "Tạo Landing page" }).click()
    }
    await p.getByRole("button", { name: "Chọn và xuất bản" }).nth(2).waitFor({ timeout: 90000 })
  })
  await shot("cc-th-buoc3-xac-nhan", async (p) => {
    await openModule(p)
    await p.getByRole("button", { name: "Chọn và xuất bản" }).first().click()
    await p.getByRole("dialog").waitFor()
  })
  await shot("cc-th-buoc3-da-xuat-ban", async (p) => {
    await openModule(p)
    if (await p.getByText("Trang chính thức đang hoạt động").count() === 0) {
      await p.getByRole("button", { name: "Chọn và xuất bản" }).first().click()
      await p.getByRole("dialog").getByRole("button", { name: "Xuất bản" }).click()
    }
    await p.getByText("Trang chính thức đang hoạt động").waitFor({ timeout: 60000 })
  })
  await shot("cc-th-khu-phat-trien-sau", async (p) => {
    await openModule(p)
    await p.getByRole("button", { name: /Phát triển sau/ }).click()
    await p.getByText("Bạn muốn tạo gì?").waitFor()
  })
  await shot("cc-luoi-module", async (p) => {
    await open(p, "/cong-cu")
    await p.getByRole("button", { name: "Hồ sơ & Thương hiệu", exact: true }).waitFor()
  })
}
