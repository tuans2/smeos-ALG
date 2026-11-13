import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as bulkImport } from "@/app/api/v1/greeting-card/chain-branches/bulk-import/route"
import { GET as rankBranches } from "@/app/api/v1/greeting-card/orders/[id]/chain-dispatch/route"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Sàng lọc chi nhánh theo phường / quận / tỉnh khi không có toạ độ (PO 22/10/2026), không cần Goong. */
describe("chi nhánh — khu vực hành chính", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    await makeChainOrganization(a)
    delete process.env.GOONG_API_KEY
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  function importBranches(branches: unknown[]) {
    return bulkImport(withSession("http://localhost/api/v1/greeting-card/chain-branches/bulk-import", a.token, {
      method: "POST", body: JSON.stringify({ branches }),
    }))
  }

  it("nhập Excel lưu phường / quận / tỉnh / phường phục vụ; không có toạ độ thì để trống", async () => {
    const res = await importBranches([{
      branchId: "Q1", branchName: "CN Q1", address: "1 Lê Lợi",
      ward: "Phường Bến Nghé", district: "Quận 1", city: "TP. Hồ Chí Minh", serviceWards: ["Phường Đa Kao"],
    }])
    expect(res.status).toBe(200)
    const row = await prisma.branches.findFirstOrThrow({ where: { organization_id: a.organizationId, accepts_dispatch: true } })
    expect(row).toMatchObject({ ward: "Phường Bến Nghé", district: "Quận 1", province: "TP. Hồ Chí Minh", latitude: null, longitude: null })
    expect(row.service_wards).toEqual(["Phường Đa Kao"])
    expect((await new ChainBranchRepository().findByCode(a.organizationId, "Q1"))?.area?.serviceWards).toEqual(["Phường Đa Kao"])
  })

  it("xếp hạng: cùng phường lên đầu, khác tỉnh bị loại", async () => {
    await importBranches([
      { branchId: "CUNG-TINH", branchName: "CN Thảo Điền", ward: "Thảo Điền", province: "Hồ Chí Minh", qualityScore: 100 },
      { branchId: "CUNG-PHUONG", branchName: "CN Bến Nghé", ward: "Bến Nghé", province: "Hồ Chí Minh", qualityScore: 80 },
      { branchId: "HA-NOI", branchName: "CN Hà Nội", ward: "Bến Nghé", province: "Hà Nội", qualityScore: 100 },
    ])
    const order = await prisma.orders.create({
      data: {
        organization_id: a.organizationId, code: "DH-AREA-1", source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
        delivery_address: {
          street: "5 Lê Lợi, Phường Bến Nghé, TP. Hồ Chí Minh",
          parts: { houseNumber: "5", street: "Lê Lợi", ward: "Phường Bến Nghé", province: "TP. Hồ Chí Minh" },
        },
      },
    })
    const res = await rankBranches(withSession(`http://localhost/api/v1/greeting-card/orders/${order.id}/chain-dispatch`, a.token),
      { params: Promise.resolve({ id: order.id }) })
    expect(res.status).toBe(200)
    const data = (await readJson(res)).data as { topBranches: Array<{ branchId: string; areaMatch: string | null }> }
    expect(data.topBranches.map((b) => [b.branchId, b.areaMatch])).toEqual([["CUNG-PHUONG", "WARD"], ["CUNG-TINH", "PROVINCE"]])
  })
})
