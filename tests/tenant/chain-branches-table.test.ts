import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as bulkImport } from "@/app/api/v1/greeting-card/chain-branches/bulk-import/route"
import { PATCH as patchBranch } from "@/app/api/v1/greeting-card/chain-branches/[branchCode]/route"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Chi nhánh điều phối chuỗi chuyển từ `organizations.settings.chain_branches` sang bảng riêng (rà soát M5,
 * 22/10/2026; từ ADR-012 T-4c là `branches` có `accepts_dispatch`): mỗi tổ chức chỉ thấy chi nhánh của mình, nhập lại
 * không xoá lịch sử phạt, hai lần phạt cùng lúc không ghi đè nhau.
 */
describe("chi nhánh điều phối chuỗi (branches nhận đơn)", () => {
  let a: Tenant
  let b: Tenant
  const repo = new ChainBranchRepository()

  async function importBranches(tenant: Tenant, branches: unknown[]) {
    return bulkImport(
      withSession("http://localhost/api/v1/greeting-card/chain-branches/bulk-import", tenant.token, {
        method: "POST",
        body: JSON.stringify({ branches }),
      })
    )
  }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await makeChainOrganization(a)
    await makeChainOrganization(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nhập Excel ghi vào bảng theo tổ chức, không đụng settings; tổ chức khác không thấy", async () => {
    const res = await importBranches(a, [
      { branchId: "CN1", branchName: "Quận 1", latitude: 10.77, longitude: 106.7, channels: { telegramChatId: "-1001234567" } },
      { branchId: "CN2", branchName: "Quận 3" },
    ])
    expect(res.status).toBe(200)
    expect((await res.json()).data).toMatchObject({ created: 2, updated: 0, total: 2 })
    await importBranches(b, [{ branchId: "CN1", branchName: "Chi nhánh của B" }])

    const listA = await repo.listCandidates(a.organizationId)
    expect(listA.map((x) => [x.branchId, x.branchName])).toEqual([["CN1", "Quận 1"], ["CN2", "Quận 3"]])
    expect(listA[0]?.location).toEqual({ latitude: 10.77, longitude: 106.7 })
    expect(listA[0]?.channels?.telegramChatId).toBe("-1001234567")
    expect((await repo.findByCode(b.organizationId, "CN1"))?.branchName).toBe("Chi nhánh của B")

    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })
    expect((org.settings as Record<string, unknown> | null)?.chain_branches).toBeUndefined()
  })

  it("link gia công chỉ nhận mã chi nhánh của đúng tổ chức sở hữu đơn", async () => {
    await importBranches(a, [{ branchId: "CN1", branchName: "Quận 1" }])
    const subcontract = new SubcontractOrderRepository()
    expect(await subcontract.findBranchInOrganization("CN1", a.organizationId)).toEqual({ id: "CN1", name: "Quận 1", is_active: true })
    expect(await subcontract.findBranchInOrganization("CN1", b.organizationId)).toBeNull()
  })

  it("phạt trừ 2 điểm, sàn 10, ghi lịch sử; nhập lại giữ số lần phạt", async () => {
    await importBranches(a, [{ branchId: "CN1", branchName: "Quận 1", qualityScore: 13 }])
    expect(await repo.applyPenalty(a.organizationId, "CN1", "CANCELLATION", "hết hoa")).toEqual({ newQualityScore: 11, count: 1 })
    expect(await repo.applyPenalty(a.organizationId, "CN1", "CANCELLATION", "hết hoa")).toEqual({ newQualityScore: 10, count: 2 })
    expect(await repo.applyPenalty(a.organizationId, "CN1", "BYPASS", "mất ảnh")).toEqual({ newQualityScore: 10, count: 1 })

    // Mã của tổ chức khác hoặc không có → không ghi gì
    expect(await repo.applyPenalty(b.organizationId, "CN1", "BYPASS", "x")).toEqual({ newQualityScore: 90, count: 1 })

    const res = await importBranches(a, [{ branchId: "CN1", branchName: "Quận 1 (mới)" }])
    expect((await res.json()).data).toMatchObject({ created: 0, updated: 1, total: 1 })
    const row = await prisma.branches.findFirstOrThrow({ where: { organization_id: a.organizationId, accepts_dispatch: true } })
    expect(row).toMatchObject({ name: "Quận 1 (mới)", cancellation_count: 2, bypass_count: 1 })
    expect((row.cancellation_history as unknown[]).length).toBe(2)
  })

  it("nhiều lần phạt cùng lúc đều được tính, không lần nào bị ghi đè", async () => {
    await importBranches(a, [{ branchId: "CN1", branchName: "Quận 1" }])
    await Promise.all(Array.from({ length: 5 }, () => repo.applyPenalty(a.organizationId, "CN1", "CANCELLATION", "song song")))
    const row = await prisma.branches.findFirstOrThrow({ where: { organization_id: a.organizationId, accepts_dispatch: true } })
    expect(row.cancellation_count).toBe(5)
    expect(row.quality_score).toBe(80)
    expect((row.cancellation_history as unknown[]).length).toBe(5)
  })

  it("tạm dừng đối tác: chỉ đổi chi nhánh của chính tổ chức, cùng mã ở tổ chức khác → 404", async () => {
    await importBranches(a, [{ branchId: "CN1", branchName: "Quận 1" }])
    await importBranches(b, [{ branchId: "CN1", branchName: "Chi nhánh của B" }])
    const call = (tenant: Tenant, code: string) =>
      patchBranch(
        withSession(`http://localhost/api/v1/greeting-card/chain-branches/${code}`, tenant.token, {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }),
        { params: Promise.resolve({ branchCode: code }) }
      )
    expect((await call(a, "CN1")).status).toBe(200)
    expect((await repo.listCandidates(a.organizationId))[0]?.isActive).toBe(false)
    expect((await repo.listCandidates(b.organizationId))[0]?.isActive).toBe(true)
    expect((await call(a, "CN-KHONG-CO")).status).toBe(404)
  })
})
