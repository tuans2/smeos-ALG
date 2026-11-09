// /cong-cu → nhóm "Tạo nội dung" dạng ô 4 bước (PO 08/11/2026): Thẻ sản phẩm → Thẻ chào sản phẩm → Bài đăng đa kênh
// → Đăng tự động. Trạng thái: chưa chọn sản phẩm (Bước 1: 2 kiểu tải + Kho), kiểu "Nhiều sản phẩm", hộp chọn từ Kho,
// sản phẩm đã duyệt Bước 1 (Bước 2 mở, Bước 3 khoá), Thẻ chào đã lưu (Bước 3 mở), Bước 3 chưa viết / bài chờ duyệt, Bước 4 chưa có bài / chọn kênh / hàng đợi / kết nối lỗi.
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
    // Chưa duyệt: thẻ mở thẳng tab "Chỉnh sửa thông tin" — nút duyệt phải thấy ngay, không phải tìm tab
    await p.getByRole("button", { name: "Duyệt nội dung" }).waitFor()
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
  await shot("cc-nd-buoc4-chua-co-bai", async (p) => {
    await openModule(p, withProduct)
    await nav(p).getByRole("button", { name: /Đăng tự động/ }).click()
    await p.getByText("Chọn bài có sẵn trong Kho").waitFor()
  })

  // Duyệt lượt bài → Bước 4 có nguồn; kênh: Facebook đã kết nối, Zalo hết hạn, còn lại chưa mở (dev chưa có khoá ứng dụng)
  await q("UPDATE content_generations SET status='APPROVED', approved_posts=posts WHERE organization_id=$1 AND product_id=$2", [org, productId])
  for (const [key, status] of [["social_facebook", "ACTIVE"], ["social_zalo", "EXPIRED"]]) {
    await q(
      `INSERT INTO integration_connections (id, organization_id, connector_key, scope_tier, external_account_id, display_name, status, credential_encrypted, connection_ref, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'STORE', 'acc-audit', 'Trang Hoa Mẫu', $3, 'audit-placeholder', gen_random_uuid()::text, $4, now(), now())
       ON CONFLICT DO NOTHING`,
      [org, key, status, uid],
    )
  }
  await shot("cc-nd-buoc4-chon-kenh", async (p) => {
    await openModule(p, `${withProduct}&buoc=dang-tu-dong`)
    await p.getByText("Đăng lên đâu?").waitFor({ timeout: 30000 })
  })
  const [gen] = await q("SELECT id FROM content_generations WHERE organization_id=$1 AND product_id=$2 ORDER BY created_at DESC LIMIT 1", [org, productId])
  await q(
    `INSERT INTO social_posts (id, organization_id, content_generation_id, product_id, channel, text, status, scheduled_at, attempt_count, external_url, last_error_code, last_error_message, idempotency_key, created_by, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'facebook', 'Bó hồng Pastel tông nhẹ nhàng', 'PUBLISHED', now(), 1, 'https://www.facebook.com/123', NULL, NULL, 'audit-fb', $4, now(), now()),
            (gen_random_uuid(), $1, $2, $3, 'zalo', 'Chào anh/chị, tiệm có mẫu Bó hồng Pastel', 'FAILED', now(), 1, NULL, 'TOKEN_EXPIRED', 'Kết nối Zalo OA đã hết hạn — kết nối lại để tiếp tục đăng', 'audit-zalo', $4, now(), now())
     ON CONFLICT DO NOTHING`,
    [org, gen.id, productId, uid],
  )
  await shot("cc-nd-buoc4-hang-doi", async (p) => {
    await openModule(p, `${withProduct}&buoc=dang-tu-dong`)
    await p.getByText("Bài đã gửi đăng").waitFor({ timeout: 30000 })
  })
  await shot("cc-nd-buoc4-ket-noi-loi", async (p) => {
    await openModule(p, `${withProduct}&buoc=dang-tu-dong&ket_noi=loi&ly_do=${encodeURIComponent("Bạn chưa đồng ý cấp quyền trên trang của nền tảng")}`)
    await p.getByText("Bạn chưa đồng ý cấp quyền").waitFor({ timeout: 30000 })
  })
}
