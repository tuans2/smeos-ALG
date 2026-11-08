// /cong-cu → nhóm "Tạo nội dung" dạng ô 4 bước (PO 08/11/2026): Thẻ sản phẩm → Thẻ chào sản phẩm → Bài đăng đa kênh
// → Đăng tự động. Trạng thái: chưa chọn sản phẩm (Bước 1: 2 kiểu tải + Kho), kiểu "Nhiều sản phẩm", hộp chọn từ Kho,
// sản phẩm đã duyệt Bước 1 (Bước 2 mở, Bước 3 khoá), Thẻ chào đã lưu (Bước 3 mở), Bước 3 chưa viết / bài chờ duyệt, Bước 4.
import { q } from "../lib.mjs"

/** Sản phẩm mẫu đầu tiên của tiệm có bản quét đã duyệt → thêm Bài giới thiệu đã duyệt (Bước 1 xong). */
async function approvedProduct(org, uid) {
  const [row] = await q(
    "SELECT p.id, a.id AS analysis_id FROM products p JOIN product_analyses a ON a.product_id=p.id WHERE p.organization_id=$1 AND a.approval_state='APPROVED' ORDER BY p.code LIMIT 1",
    [org],
  )
  await q("DELETE FROM product_copies WHERE organization_id=$1 AND product_id=$2", [org, row.id])
  await q(
    `INSERT INTO product_copies (id, organization_id, analysis_id, product_id, raw, approval_state, approved_by, approved_at, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'APPROVED', $5, now(), now(), now())`,
    [org, row.analysis_id, row.id, JSON.stringify({ suggested_name: "Bó hồng Pastel", suggested_description: "Bó hồng tông pastel nhẹ nhàng, hợp sinh nhật và khai trương.", suggested_occasions: ["Sinh nhật"], suggested_price_segment: "standard" }), uid],
  )
  return row.id
}

export async function run({ open, shot, org, uid }) {
  const nav = (p) => p.getByRole("navigation", { name: "Các bước tạo nội dung" })
  const openModule = async (p, query = "") => {
    await open(p, `/cong-cu${query}`)
    if (!query) await p.getByRole("button", { name: "Tạo nội dung", exact: true }).click()
    await nav(p).waitFor({ timeout: 30000 })
  }

  await shot("cc-nd-buoc1-trong", (p) => openModule(p))
  await shot("cc-nd-buoc1-nhieu-san-pham", async (p) => {
    await openModule(p)
    await p.getByRole("button", { name: "Nhiều sản phẩm" }).click()
  })
  await shot("cc-nd-kho-san-pham", async (p) => {
    await openModule(p)
    await p.getByRole("button", { name: "Chọn từ Kho sản phẩm" }).click()
    await p.getByRole("dialog").waitFor()
  })

  const productId = await approvedProduct(org, uid)
  const withProduct = `?muc=content&sp=${productId}`
  await shot("cc-nd-buoc2-the-chao", async (p) => {
    await openModule(p, withProduct)
    await p.getByText("Sản phẩm đang làm").waitFor({ timeout: 30000 })
  })

  await q(
    `UPDATE products SET attributes = jsonb_set(COALESCE(attributes, '{}'::jsonb), '{sales_pitch}', $2::jsonb) WHERE id=$1`,
    [productId, JSON.stringify({
      data: {
        product_name: "Bó hồng Pastel", sku: null, style: "Nhẹ nhàng", occasions: ["Sinh nhật"], occasion_register: "FESTIVE",
        description: "Bó hồng tông pastel.", main_items: [], foliage_items: [], accessory_items: [], wrapping: "Giấy kraft", container: "Bó",
        height_cm: 45, width_cm: 30, price_vnd: 450000, original_price_vnd: null, price_segment: "standard", free_gifts: [], guarantees: [],
        shop_name: null, shop_hotline: null, custom_note: null, cta_phrase: null, greeting_line: null,
      },
      finalized_at: new Date().toISOString(), finalized_by: uid, version: 1,
    })],
  )
  // Thẻ chào đã lưu → hành trình tự mở Bước 3; bấm lại Bước 2 để xem bản đã lưu
  await shot("cc-nd-buoc2-da-luu", async (p) => {
    await openModule(p, withProduct)
    await nav(p).getByRole("button", { name: /Thẻ chào sản phẩm/ }).click()
    await p.getByText(/Đã lưu vào Kho sản phẩm · lần 1/).waitFor({ timeout: 30000 })
  })
  await shot("cc-nd-buoc3-chua-viet", async (p) => {
    await openModule(p, withProduct)
    await nav(p).getByRole("button", { name: /Bài đăng đa kênh/ }).click()
    await p.getByText("Viết cho nền tảng nào?").waitFor()
  })
  // Một lượt bài máy viết (chờ duyệt) — xem trước theo nền tảng, nút "Duyệt 2 bài"
  await q(
    `INSERT INTO content_generations (id, organization_id, product_id, origin, channels, brief, brief_version, prompt_versions, rubric_version, posts, overall_score, status, created_by, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'content_engine_ui', '["facebook","zalo"]', '{}', 1, '{}', 'v1', $3, 86, 'DRAFT', $4, now(), now())`,
    [org, productId, JSON.stringify([
      { channel: "facebook", text: "Bó hồng Pastel tông nhẹ nhàng — món quà sinh nhật dịu dàng. Đặt trước để giao đúng giờ.", hashtags: ["#hoasinhnhat", "#bohong"] },
      { channel: "zalo", text: "Chào anh/chị, tiệm có mẫu Bó hồng Pastel 450.000đ, giao trong ngày. Anh/chị cần đặt cho dịp nào ạ?", hashtags: [] },
    ]), uid],
  )
  await shot("cc-nd-buoc3-cho-duyet", async (p) => {
    await openModule(p, withProduct)
    await nav(p).getByRole("button", { name: /Bài đăng đa kênh/ }).click()
    await p.getByRole("button", { name: "Duyệt 2 bài" }).waitFor({ timeout: 30000 })
  })
  await shot("cc-nd-buoc4", async (p) => {
    await openModule(p, withProduct)
    await nav(p).getByRole("button", { name: /Đăng tự động/ }).click()
  })
}
