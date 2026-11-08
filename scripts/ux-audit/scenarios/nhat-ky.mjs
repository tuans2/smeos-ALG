// /audit — Nhật ký kiểm toán: tab "Thao tác trong tổ chức" (mặc định) và tab "Truy cập của nền tảng" (D-60) ở hai
// trạng thái rỗng và có dữ liệu (một người vận hành nền tảng đã mở hồ sơ, xem đơn hàng, tải dữ liệu khách hàng).
import { q } from "../lib.mjs"

export async function run({ open, shot, org }) {
  const openPlatformTab = async (p) => {
    await open(p, "/audit")
    await p.getByRole("tab", { name: "Truy cập của nền tảng" }).click()
  }

  await shot("nhat-ky-thao-tac", (p) => open(p, "/audit"))
  await shot("nhat-ky-nen-tang-rong", async (p) => {
    await openPlatformTab(p)
    await p.getByText("Chưa có lượt truy cập nào").waitFor()
  })

  const [{ id: op }] = await q(
    "INSERT INTO users(id,email,name,updated_at) VALUES(gen_random_uuid(),$1,'Nguyễn Vận Hành',now()) RETURNING id",
    [`van-hanh-${Date.now()}@floraos.test`],
  )
  for (const [purpose, method, route] of [
    ["org.profile.read", "GET", `/api/v1/platform/organizations/${org}`],
    ["org.records.orders.read", "GET", `/api/v1/platform/orgs-data/${org}/records/orders`],
    ["org.records.customers.export", "GET", `/api/v1/platform/orgs-data/${org}/records/customers`],
  ]) {
    await q(
      "INSERT INTO platform_access_logs(id,organization_id,operator_id,purpose,method,route) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5)",
      [org, op, purpose, method, route],
    )
  }
  await shot("nhat-ky-nen-tang-co-du-lieu", async (p) => {
    await openPlatformTab(p)
    await p.getByText("Tải dữ liệu khách hàng").waitFor()
  })
}
