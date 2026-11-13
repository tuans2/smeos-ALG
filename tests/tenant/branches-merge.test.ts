import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as actOnSubcontract } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import type { BranchCandidate } from "@/modules/greeting-card/domain/chain-dispatch-engine"
import { BranchPortalRepository } from "@/modules/greeting-card/infra/branch-portal-repository"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, type Tenant } from "../helpers/fixtures"
import { syncSubcontractShares } from "../helpers/subcontract-shares"

/**
 * ADR-012 D-T2 (T-4): chi nhánh nhận đơn điều phối chuỗi là dòng `branches` có `accepts_dispatch` (khoá tổ chức + mã;
 * `chain_branches` đã xoá ở T-4c). Gắn chi nhánh cho thành viên ghi `memberships.branch_id` (D-56); chi nhánh nhận đơn
 * theo mã ghi `orders.branch_id`; điều phối / trang cửa hàng / Thẻ Gia Công công khai đọc từ `branches`.
 */
describe("branches — chi nhánh nhận đơn điều phối chuỗi", () => {
  let t: Tenant
  const repo = new ChainBranchRepository()

  const candidate = (code: string, name: string, extra: Partial<BranchCandidate> = {}): BranchCandidate => ({
    branchId: code, branchName: name, address: "", qualityScore: 90, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true,
    area: { ward: "Bến Nghé", district: null, province: "TP.HCM", serviceWards: ["Đa Kao"] }, location: { latitude: 10.77, longitude: 106.7 },
    channels: { telegramChatId: "-100123" }, ...extra,
  })
  const branchOf = (code: string) =>
    prisma.branches.findUniqueOrThrow({ where: { organization_id_code: { organization_id: t.organizationId, code } } })

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("chuoi")
    await makeChainOrganization(t)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nhập Excel: mỗi chi nhánh một dòng branches, đủ cấu hình nhận đơn; nhập lại cập nhật tên", async () => {
    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận 1"), candidate("CN2", "Quận 3", { isActive: false })])
    expect(await branchOf("CN1")).toMatchObject({
      name: "Quận 1", accepts_dispatch: true, is_active: true, ward: "Bến Nghé", province: "TP.HCM",
      service_wards: ["Đa Kao"], latitude: 10.77, channels: { telegramChatId: "-100123" },
    })
    expect((await branchOf("CN2")).is_active).toBe(false)

    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận Một")])
    expect((await branchOf("CN1")).name).toBe("Quận Một")
    expect(await prisma.branches.count({ where: { organization_id: t.organizationId } })).toBe(2)
  })

  it("trùng mã với chi nhánh thường có sẵn: nhập Excel dùng chính dòng đó; trừ điểm không đè tên; bật/tắt theo chuỗi", async () => {
    const own = await prisma.branches.create({ data: { organization_id: t.organizationId, name: "Kho Q1", code: "CN1" } })
    expect(await repo.applyPenalty(t.organizationId, "CN1", "CANCELLATION", "x")).toEqual({ newQualityScore: 90, count: 1 })
    expect((await branchOf("CN1")).cancellation_count).toBe(0) // chi nhánh thường: không phạt

    const res = await repo.upsertMany(t.organizationId, [candidate("CN1", "Q1 chuỗi")])
    expect(res).toMatchObject({ created: 1, updated: 0, total: 1 })
    await repo.applyPenalty(t.organizationId, "CN1", "CANCELLATION", "huỷ nhận")
    const afterPenalty = await branchOf("CN1")
    expect(afterPenalty).toMatchObject({ id: own.id, name: "Q1 chuỗi", accepts_dispatch: true, quality_score: 88, cancellation_count: 1 })

    expect(await repo.setActive(t.organizationId, "CN1", false)).toBe(true)
    expect((await branchOf("CN1")).is_active).toBe(false)
  })

  it("liên kết Zalo: mã liên kết và người nhận Zalo ghi vào branches, không đè kênh khác", async () => {
    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận 1")])
    const [link] = await repo.listZaloLinks(t.organizationId)
    expect((await branchOf("CN1")).zalo_link_code).toBe(link?.linkCode)
    await repo.linkZaloUser(link!.linkCode, "zalo-user-1")
    expect((await branchOf("CN1")).channels).toMatchObject({ telegramChatId: "-100123", zaloUserId: "zalo-user-1" })
  })

  it("gắn chi nhánh cho thành viên ghi branch_id; gỡ thì bỏ; gỡ không xoá chi nhánh thường gán ở nơi khác", async () => {
    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận 1")])
    const membership = await prisma.memberships.findFirstOrThrow({ where: { organization_id: t.organizationId } })
    const portal = new BranchPortalRepository()

    expect(await portal.setMemberChainBranch(t.ctx, membership.id, "CN1")).toBe(true)
    const cn1 = await branchOf("CN1")
    expect((await prisma.memberships.findUniqueOrThrow({ where: { id: membership.id } })).branch_id).toBe(cn1.id)

    expect(await portal.setMemberChainBranch(t.ctx, membership.id, null)).toBe(true)
    expect((await prisma.memberships.findUniqueOrThrow({ where: { id: membership.id } })).branch_id).toBeNull()

    const kho = await prisma.branches.create({ data: { organization_id: t.organizationId, name: "Kho", code: "KHO" } })
    await prisma.memberships.update({ where: { id: membership.id }, data: { branch_id: kho.id } })
    await portal.setMemberChainBranch(t.ctx, membership.id, null)
    expect((await prisma.memberships.findUniqueOrThrow({ where: { id: membership.id } })).branch_id).toBe(kho.id)

    expect(await portal.setMemberChainBranch(t.ctx, membership.id, "KHONG-CO")).toBe(false)
  })

  it("chi nhánh chuỗi nhận đơn theo mã → orders.branch_id là chi nhánh đó", async () => {
    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận 1")])
    const code = "DH261106-0001"
    const order = await prisma.orders.create({
      data: { organization_id: t.organizationId, code, source: "BROCHURE", status: "CONFIRMED", total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test" },
    })
    await prisma.order_coordinations.create({
      data: {
        organization_id: t.organizationId, order_id: order.id,
        metadata: { subcontract_dispatch: { orderId: order.id, orderCode: code, dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null, graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: ["CN1"], roundExpiresAt: null } },
      },
    })
    await syncSubcontractShares(t.organizationId, order.id)
    const token = signSubcontractBranchToken(t.organizationId, code, "CN1")
    const res = await actOnSubcontract(
      new Request(`http://localhost/api/v1/public/subcontract/${code}?t=${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "CLAIM", branchId: "CN1" }) }),
      { params: Promise.resolve({ orderCode: code }) },
    )
    expect(res.status).toBe(200)
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })).branch_id).toBe((await branchOf("CN1")).id)
  })

  // ── T-4b: đọc từ branches ─────────────────────────────────────────────────
  it("danh sách ứng viên và tra theo mã chỉ gồm chi nhánh nhận đơn điều phối, không gồm chi nhánh thường", async () => {
    await prisma.branches.create({ data: { organization_id: t.organizationId, name: "Kho", code: "KHO" } })
    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận 1")])
    expect((await repo.listCandidates(t.organizationId)).map((c) => c.branchId)).toEqual(["CN1"])
    expect(await repo.findByCode(t.organizationId, "KHO")).toBeNull()
    expect((await repo.findByCode(t.organizationId, "CN1"))?.area?.serviceWards).toEqual(["Đa Kao"])

    const sub = new SubcontractOrderRepository()
    expect(await sub.findBranchInOrganization("CN1", t.organizationId)).toEqual({ id: "CN1", name: "Quận 1", is_active: true })
    expect(await sub.findBranchInOrganization("CN1", (await createTenant("khac")).organizationId)).toBeNull()
  })

  it("trang cửa hàng: chi nhánh của tài khoản theo branch_id; chi nhánh thường hoặc đang tạm dừng thì không có", async () => {
    await repo.upsertMany(t.organizationId, [candidate("CN1", "Quận 1")])
    const membership = await prisma.memberships.findFirstOrThrow({ where: { organization_id: t.organizationId } })
    const portal = new BranchPortalRepository()
    expect(await portal.memberChainBranch(t.ctx)).toBeNull()

    await portal.setMemberChainBranch(t.ctx, membership.id, "CN1")
    expect(await portal.memberChainBranch(t.ctx)).toEqual({ code: "CN1", name: "Quận 1" })
    expect(await portal.listChainBranches(t.ctx)).toEqual([{ code: "CN1", name: "Quận 1" }])

    await repo.setActive(t.organizationId, "CN1", false)
    expect(await portal.memberChainBranch(t.ctx)).toBeNull()

    const kho = await prisma.branches.create({ data: { organization_id: t.organizationId, name: "Kho", code: "KHO" } })
    await prisma.memberships.update({ where: { id: membership.id }, data: { branch_id: kho.id } })
    expect(await portal.memberChainBranch(t.ctx)).toBeNull()
  })
})
