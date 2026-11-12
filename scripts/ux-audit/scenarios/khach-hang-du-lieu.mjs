// /khach-hang → hồ sơ khách → tab Quyền riêng tư: khu "Yêu cầu về dữ liệu" (ADR-014 D-P5, bước P-7b) — danh sách
// trống, form ghi nhận yêu cầu sửa, có yêu cầu đang chờ, sau khi xuất (tải JSON/CSV), hộp xác nhận xoá.
import { q } from "../lib.mjs"

const PATH = "/khach-hang"

export async function run({ open, shot, org }) {
  // Số giả ngoài dải di động thật (không qua kiểm số của form) — chỉ để có một khách trong bảng.
  await q("INSERT INTO customers(id,organization_id,code,name,phone,created_at,updated_at) VALUES(gen_random_uuid(),$1,'KH-AUDIT-DL','Chị Mẫu Dữ Liệu','0100000009',now(),now())", [org])

  const privacyTab = async (p) => {
    await open(p, PATH)
    await p.getByRole("button", { name: /Hồ sơ Master/ }).first().click()
    await p.getByRole("tab", { name: /Quyền riêng tư/ }).click()
    await p.getByText("Yêu cầu về dữ liệu").waitFor()
  }
  await shot("du-lieu-trong", privacyTab)
  await shot("du-lieu-form-sua", async (p) => {
    await privacyTab(p)
    await p.getByRole("button", { name: "Ghi nhận yêu cầu sửa" }).click()
    await p.getByLabel("Khách muốn sửa gì?").waitFor()
  })
  await shot("du-lieu-co-yeu-cau", async (p) => {
    await privacyTab(p)
    await p.getByRole("button", { name: "Ghi nhận yêu cầu sửa" }).click()
    await p.getByLabel("Khách muốn sửa gì?").fill("Đổi địa chỉ giao hàng")
    await p.getByRole("button", { name: "Ghi nhận", exact: true }).click()
    await p.getByText("Đang chờ").first().waitFor()
  })
  await shot("du-lieu-da-xuat", async (p) => {
    await privacyTab(p)
    await p.getByRole("button", { name: "Xuất dữ liệu" }).click()
    await p.getByRole("button", { name: "Tải CSV" }).waitFor()
  })
  await shot("du-lieu-xac-nhan-xoa", async (p) => {
    await privacyTab(p)
    await p.getByRole("button", { name: "Xoá dữ liệu" }).click()
    await p.getByRole("dialog").last().waitFor()
  })
}
