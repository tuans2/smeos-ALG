// /thu-hut-khach (Bước 4: công cụ 12, 13, 21, 25) — trống, form tạo (mở phần thêm), có mã + thống kê,
// hộp xác nhận tắt, tab khách trống / có khách; trang catalog công khai có form để lại thông tin.
import { q } from "../lib.mjs"

const PATH = "/thu-hut-khach"

export async function run({ open, shot, org, uid }) {
  await q("DELETE FROM leads WHERE organization_id=$1", [org])
  await q("DELETE FROM short_links WHERE organization_id=$1", [org])
  await shot("ma-trong", (p) => open(p, PATH))
  await shot("ma-form-tao", async (p) => {
    await open(p, PATH)
    await p.getByRole("button", { name: "Tạo mã mới" }).first().click()
    await p.getByText("Vị trí đặt, chiến dịch và hạn dùng").click()
  })

  const slug = `audit-${Date.now()}`
  // Mã duy nhất mỗi lần chạy (bảng chữ của short-link-rules: không 0/1/l/o)
  const code = () => Array.from({ length: 7 }, () => "23456789abcdefghijkmnpqrstuvwxyz"[Math.floor(Math.random() * 32)]).join("")
  const qrCode = code()
  await q("INSERT INTO catalog_links(id,organization_id,slug,name,filters,created_by,created_at,updated_at) VALUES(gen_random_uuid(),$1,$2,'Hoa 20/10','{\"archetype\":\"pastel-romantic\",\"occasion\":\"20/10\"}',$3,now(),now())", [org, slug, uid])
  const [{ id: linkId }] = await q(
    "INSERT INTO short_links(id,organization_id,code,kind,name,target_path,placement_label,utm_source,utm_medium,created_by,scan_count,created_at,updated_at) VALUES(gen_random_uuid(),$1,$4,'QR','QR quầy thu ngân',$2,'Quầy thu ngân','smeos','qr',$3,3,now(),now()) RETURNING id",
    [org, `/c/${slug}`, uid, qrCode],
  )
  await q("INSERT INTO short_links(id,organization_id,code,kind,name,target_path,is_active,created_by,created_at,updated_at) VALUES(gen_random_uuid(),$1,$4,'SALES_LINK','Link gửi Zalo',$2,false,$3,now(),now())", [org, `/c/${slug}`, uid, code()])
  for (const [d, dev] of [[0, "MOBILE"], [1, "MOBILE"], [2, "DESKTOP"]]) {
    await q("INSERT INTO link_events(id,organization_id,short_link_id,device,visitor_hash,created_at) VALUES(gen_random_uuid(),$1,$2,$3,md5(random()::text),now() - ($4 || ' days')::interval)", [org, linkId, dev, String(d)])
  }

  await shot("ma-co-du-lieu-thong-ke", async (p) => {
    await open(p, PATH)
    await p.getByRole("button", { name: "Thống kê" }).first().click()
    await p.getByText("Lượt quét", { exact: true }).waitFor()
  })
  await shot("ma-xac-nhan-tat", async (p) => {
    await open(p, PATH)
    await p.getByRole("button", { name: "Tắt", exact: true }).first().click()
    await p.getByRole("dialog").waitFor()
  })

  await shot("khach-trong", (p) => open(p, `${PATH}?tab=leads`))
  const [{ id: cus }] = await q("INSERT INTO customers(id,organization_id,code,name,phone,created_at,updated_at) VALUES(gen_random_uuid(),$1,'KH-AUD1','Chị Lan','0901234567',now(),now()) RETURNING id", [org])
  await q(
    "INSERT INTO leads(id,organization_id,customer_id,name,phone,message,source,source_ref,short_link_id,utm_campaign,consent_at,consent_version,created_at,updated_at) VALUES(gen_random_uuid(),$1,$2,'Chị Lan','0901234567','Tư vấn giúp mình bó hồng cho 20/10','SHORT_LINK',$4,$3,'20-10',now(),'2026-10-30',now(),now())",
    [org, cus, linkId, qrCode],
  )
  await shot("khach-co-du-lieu", (p) => open(p, `${PATH}?tab=leads`))
  await shot("catalog-cong-khai-form", async (p) => {
    await open(p, `/c/${slug}?ref=${qrCode}`)
    await p.getByPlaceholder("Số điện thoại Zalo").scrollIntoViewIfNeeded()
  })
  await shot("catalog-cong-khai-thieu-dong-y", async (p) => {
    await open(p, `/c/${slug}?ref=${qrCode}`)
    await p.getByPlaceholder("Tên của bạn").fill("Anh Minh")
    await p.getByPlaceholder("Số điện thoại Zalo").fill("0912345678")
    // Bỏ `required` của ô đồng ý để thấy thông báo của form (trình duyệt tự chặn trước)
    await p.locator('input[type="checkbox"]').evaluate((el) => el.removeAttribute("required"))
    await p.getByRole("button", { name: "Tư vấn ngay" }).click()
    await p.getByText("Vui lòng đồng ý").waitFor()
  })
  await shot("catalog-cong-khai-da-gui", async (p) => {
    // ADR-014 P-5c: cột `phone` là bản mã — xoá theo 4 số cuối và tên
    await q("DELETE FROM leads WHERE organization_id=$1 AND phone_last4='5678' AND name='Anh Minh'", [org])
    await open(p, `/c/${slug}?ref=${qrCode}`)
    await p.getByPlaceholder("Tên của bạn").fill("Anh Minh")
    await p.getByPlaceholder("Số điện thoại Zalo").fill("0912345678")
    await p.getByRole("checkbox").check()
    await p.getByRole("button", { name: "Tư vấn ngay" }).click()
    await p.getByText("Cửa hàng đã nhận thông tin của bạn!").waitFor()
  })
}
