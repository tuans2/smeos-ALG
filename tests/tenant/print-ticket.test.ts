import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as print } from "@/app/api/v1/orders/[id]/print/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.9 — phiếu xưởng A6: công thức theo phiên bản, ảnh mẫu, lời thiệp; không có giá ở phần xưởng. */

describe("phiếu xưởng in", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("trả công thức, phiên bản và số cành, ảnh mẫu; tổ chức khác → 404; thợ cắm không có quyền in → 403", async () => {
    const id = randomUUID()
    await prisma.orders.create({
      data: {
        id, organization_id: a.organizationId, code: "DH-IN", status: "CONFIRMED", created_by: a.userId, card_message: "Chúc mừng khai trương\nHồng phát",
        total_vnd: 900_000, paid_vnd: 0, balance_vnd: 900_000, delivery_window: { date: "2026-11-05", timeSlot: "09:00-11:00" },
        items: { create: [{ organization_id: a.organizationId, description: "Kệ hoa — Lớn", quantity: 1, unit_price_vnd: 900_000,
          metadata: { variant: { id: "opt:1", name: "Lớn", stemCount: 80 }, sampleImageUrl: "https://example.test/mau.jpg",
            flowers: [{ flowerName: "Hồng đỏ", quantity: 40, unit: "cành", color: "đỏ", role: "Chủ đạo" }], costVnd: 350_000 } }] },
      },
    })
    const get = (token: string) => print(withSession(`http://localhost/api/v1/orders/${id}/print`, token), { params: Promise.resolve({ id }) })

    const res = await get(a.token)
    expect(res.status).toBe(200)
    const data = (await readJson(res)).print as { florist: unknown[]; cardMessage: string }
    expect(data.florist).toEqual([{
      description: "Kệ hoa — Lớn", quantity: 1, variantName: "Lớn", stemCount: 80, sampleImageUrl: "https://example.test/mau.jpg",
      recipe: [{ flowerName: "Hồng đỏ", quantity: 40, unit: "cành", color: "đỏ", role: "Chủ đạo" }],
    }])
    expect(JSON.stringify(data.florist)).not.toContain("350000")
    expect(data.cardMessage).toBe("Chúc mừng khai trương\nHồng phát")

    expect((await get(b.token)).status).toBe(404)
    const tho = await addStaffWithSession(a, "tho_cam", "tho")
    expect((await get(tho.token)).status).toBe(403)
  })

  it("đơn tạo tay gắn sản phẩm: ảnh mẫu ký mới và công thức đọc từ sản phẩm; ghi chú xưởng không có dòng về tiền (GD1 Bước 6, E-07)", async () => {
    const product = await prisma.products.create({
      data: { organization_id: a.organizationId, code: "SP-IN", name: "Bó hồng", status: "ACTIVE",
        attributes: { bom: { flowers: [{ name: "Hồng Ecuador", quantity: 12, unit: "cành", role: "Hoa chính" }] } } },
    })
    const asset = await prisma.assets.create({ data: { organization_id: a.organizationId, product_id: product.id, kind: "ORIGINAL", storage_key: `org/${a.organizationId}/${product.id}/mau.jpg`, mime_type: "image/jpeg", created_by: a.userId } })
    await prisma.product_images.create({ data: { organization_id: a.organizationId, product_id: product.id, asset_id: asset.id, role: "MAIN" } })
    const id = randomUUID()
    await prisma.orders.create({
      data: {
        id, organization_id: a.organizationId, code: "DH-TAY", status: "CONFIRMED", created_by: a.userId,
        total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000,
        internal_note: "Gói giấy kraft\n[Điều hành: chưa nhận được tiền] Chưa thấy tiền về tài khoản",
        items: { create: [{ organization_id: a.organizationId, product_id: product.id, description: "Bó hồng", quantity: 1, unit_price_vnd: 500_000 }] },
      },
    })
    const res = await print(withSession(`http://localhost/api/v1/orders/${id}/print`, a.token), { params: Promise.resolve({ id }) })
    expect(res.status).toBe(200)
    const data = (await readJson(res)).print as { florist: Array<{ sampleImageUrl: string | null; recipe: Array<{ flowerName: string }> }>; floristNote: string }
    expect(data.florist[0]!.sampleImageUrl).toContain(`/api/v1/storage/org/${a.organizationId}/${product.id}/mau.jpg?exp=`)
    expect(data.florist[0]!.recipe.map((r) => r.flowerName)).toEqual(["Hồng Ecuador"])
    expect(data.floristNote).toBe("Gói giấy kraft")
  })
})
