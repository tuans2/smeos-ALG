// /van-hanh/thong-bao — Ma trận thông báo tầng Mẹ + khối "Kênh liên lạc" (checklist 4.30):
// chưa kết nối kênh nào → mở thông số SMS → đã kết nối SMS (khoá giả, chỉ trên database *_test).
import { BASE, q } from "../lib.mjs"

export async function run({ open, shot, uid }) {
  // Người dùng audit là chủ tiệm — cấp thêm quyền vận hành N2 (cấu hình thông báo toàn sàn).
  const [{ id: op }] = await q(
    "INSERT INTO platform_operators(id,user_id) VALUES(gen_random_uuid(),$1) ON CONFLICT (user_id) DO UPDATE SET revoked_at=NULL RETURNING id",
    [uid]
  )
  await q("INSERT INTO platform_role_capabilities(id,operator_id,capability_code) VALUES(gen_random_uuid(),$1,'N2') ON CONFLICT DO NOTHING", [op])
  await q("DELETE FROM platform_secrets WHERE key LIKE 'notification_provider:%'")

  await shot("thong-bao-chua-ket-noi", (p) => open(p, "/van-hanh/thong-bao"))
  await shot("thong-bao-mo-thong-so", async (p) => {
    await open(p, "/van-hanh/thong-bao")
    await p.getByRole("button", { name: /Thông số eSMS/ }).click()
  })

  const ctx = { channel: "SMS", provider: "esms", values: { apiKey: "khoa-gia", secretKey: "khoa-gia", brandname: "HOAMAU" } }
  await shot("thong-bao-da-ket-noi", async (p) => {
    const r = await p.request.put(BASE + "/api/v1/platform/notification/providers", { data: ctx })
    if (!r.ok()) throw new Error(`lưu nhà cung cấp ${r.status()}`)
    await open(p, "/van-hanh/thong-bao")
    await p.getByRole("button", { name: /Thông số eSMS/ }).click()
  })
}
