import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as viewSubcontract } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import type { TenantContext } from "@/core/tenancy"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { cancelClaimSubcontractOrder, claimSubcontractOrder, type SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import { subcontractShares } from "@/modules/greeting-card/domain/subcontract-share"
import { signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const CODE = "DH261107-0001"
const DAY = 86_400_000

/** Khối backfill của migration `*_shared_order_access` (CSDL test dựng bằng `db push`, không chạy migration). */
function backfillSql(): string {
  const dir = path.join(process.cwd(), "prisma/migrations")
  const migration = readdirSync(dir).find((d) => d.endsWith("_shared_order_access"))
  if (!migration) throw new Error("Không thấy migration shared_order_access")
  const block = readFileSync(path.join(dir, migration, "migration.sql"), "utf8").match(/-- P4-BACKFILL-BEGIN[\s\S]*?-- P4-BACKFILL-END/)?.[0]
  if (!block) throw new Error("Migration shared_order_access thiếu khối backfill")
  return block.replace(/^--.*$/gm, "").trim().replace(/;$/, "")
}

function openState(orderId: string, invited: string[]): SubcontractOrderState {
  return {
    orderId, orderCode: CODE, dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null,
    graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: invited, roundExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

/**
 * ADR-014 D-P6, bước P-4 (PO duyệt 07/11/2026): chi nhánh xem Thẻ Gia Công theo `shared_order_access` — được mời thì
 * xem được; chi nhánh khác nhận / hết vòng / huỷ nhận → mất quyền ngay (404); đang làm đơn → còn 7 ngày sau khi đơn đóng.
 */
describe("shared_order_access — quyền xem đơn của chi nhánh gia công", () => {
  let t: Tenant
  let ctx: TenantContext
  let orderId: string
  const repo = new SubcontractOrderRepository()

  beforeEach(async () => {
    await resetDatabase()
    t = await createTenant("chuoi")
    ctx = t.ctx
    for (const code of ["CN-A", "CN-B", "CN-C"]) {
      await prisma.branches.create({ data: { organization_id: t.organizationId, name: `Chi nhánh ${code}`, code, accepts_dispatch: true } })
    }
    const order = await prisma.orders.create({
      data: {
        organization_id: t.organizationId, code: CODE, source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: "test",
      },
    })
    orderId = order.id
    await repo.saveSubcontractState(ctx, openState(orderId, ["CN-A", "CN-B"]))
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const status = async (branch: string, now = Date.now()) => { // GET Thẻ Gia Công bằng link đã ký cho chi nhánh
    const token = signSubcontractBranchToken(t.organizationId, CODE, branch, now)
    const req = new Request(`http://localhost/api/v1/public/subcontract/${CODE}?${new URLSearchParams({ branch, t: token })}`)
    return (await viewSubcontract(req, { params: Promise.resolve({ orderCode: CODE }) })).status
  }
  const change = (fn: (s: SubcontractOrderState) => SubcontractOrderState) =>
    repo.updateSubcontractState(ctx, orderId, (current) => ({ next: fn(current!), result: undefined }))
  const claim = (branch: string) => change((s) => {
    const r = claimSubcontractOrder(s, branch, branch, 15)
    if (!r.success) throw new Error(r.reason)
    return r.nextState
  })

  it("được mời → xem được; chi nhánh không được mời → 404; chi nhánh khác nhận → chi nhánh còn lại mất quyền ngay", async () => {
    expect(await status("CN-A")).toBe(200)
    expect(await status("CN-B")).toBe(200)
    expect(await status("CN-C")).toBe(404)

    await claim("CN-A")
    expect(await status("CN-A")).toBe(200)
    expect(await status("CN-B")).toBe(404)
    const rows = await prisma.shared_order_access.findMany({ where: { order_id: orderId }, orderBy: { branch_key: "asc" } })
    expect(rows.map((r) => [r.branch_key, r.level, r.revoked_at !== null])).toEqual([["CN-A", "ASSIGNED", false], ["CN-B", "INVITED", true]])
  })

  it("huỷ nhận → mất quyền; vòng mới chỉ mời chi nhánh khác → chi nhánh vòng cũ mất quyền", async () => {
    await claim("CN-A")
    await change((s) => {
      const r = cancelClaimSubcontractOrder(s, "CN-A")
      if (!r.success) throw new Error(r.reason)
      return r.nextState
    })
    expect(await status("CN-A")).toBe(404)
    expect(await status("CN-B")).toBe(200)

    await change((s) => ({ ...s, currentRound: 2, invitedBranchIds: ["CN-C"], previouslyInvitedBranchIds: ["CN-A", "CN-B"] }))
    expect(await status("CN-B")).toBe(404)
    expect(await status("CN-C")).toBe(200)
  })

  it("đơn đóng: chi nhánh được mời mất quyền ngay; chi nhánh làm đơn còn 7 ngày rồi 404", async () => {
    await claim("CN-A")
    await change((s) => ({ ...s, dispatchStatus: "COMMITTED" }))
    const deliveredAt = new Date(Date.now() - 6 * DAY)
    await prisma.orders.update({ where: { id: orderId }, data: { delivery_status: "DELIVERED" } })
    await prisma.order_events.create({ data: { organization_id: t.organizationId, order_id: orderId, axis: "delivery", to_value: "DELIVERED", created_at: deliveredAt } })
    expect(await status("CN-A")).toBe(200)
    expect(await repo.hasBranchShare(t.organizationId, orderId, "CN-A", new Date(deliveredAt.getTime() + 7 * DAY + 1000))).toBe(false)

    await change((s) => ({ ...s, dispatchStatus: "OPEN", claimedBranchId: null, invitedBranchIds: ["CN-B"] }))
    expect(await repo.hasBranchShare(t.organizationId, orderId, "CN-B")).toBe(false) // được mời nhưng đơn đã đóng
  })

  it("tổ chức khác không đọc được quyền; xoá đơn xoá quyền", async () => {
    const other = await createTenant("khac")
    expect(await new SubcontractOrderRepository().hasBranchShare(other.organizationId, orderId, "CN-A")).toBe(false)
    expect(await prisma.shared_order_access.count({ where: { organization_id: t.organizationId } })).toBe(2)
    await prisma.order_coordinations.deleteMany({ where: { order_id: orderId } })
    await prisma.orders.delete({ where: { id: orderId } })
    expect(await prisma.shared_order_access.count({ where: { order_id: orderId } })).toBe(0)
  })

  it("backfill của migration cấp quyền đúng như `subcontractShares` từ phiên điều phối đang lưu", async () => {
    const states: Array<Partial<SubcontractOrderState>> = [
      { dispatchStatus: "OPEN", invitedBranchIds: ["CN-A", "CN-B"], declinedBranchIds: ["CN-B"] },
      { dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "CN-C", invitedBranchIds: ["CN-A", "CN-C"] },
      { dispatchStatus: "COMMITTED", claimedBranchId: "CN-A" },
      { dispatchStatus: "ESCALATED", invitedBranchIds: ["CN-A"] },
      { dispatchStatus: "OPEN" },
    ]
    const ids: string[] = []
    for (const [i, s] of states.entries()) {
      const o = await prisma.orders.create({ data: { organization_id: t.organizationId, code: `DH-BF-${i}`, total_vnd: 0, balance_vnd: 0, created_by: "test" } })
      await prisma.order_coordinations.create({ data: { organization_id: t.organizationId, order_id: o.id, metadata: { subcontract_dispatch: { orderId: o.id, ...s } } as unknown as Prisma.InputJsonValue } })
      ids.push(o.id)
    }
    await prisma.$executeRawUnsafe(backfillSql())
    await prisma.$executeRawUnsafe(backfillSql()) // chạy lại không thêm dòng
    for (const [i, id] of ids.entries()) {
      const rows = await prisma.shared_order_access.findMany({ where: { order_id: id }, orderBy: { branch_key: "asc" } })
      const expected = [...subcontractShares(states[i] as SubcontractOrderState)].sort(([x], [y]) => x.localeCompare(y))
      expect(rows.map((r) => [r.branch_key, r.level]), `phiên #${i}`).toEqual(expected)
    }
  })
})
