import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { assignSubscription, cancelSubscription } from "@/modules/subscription/use-cases/manage-subscription"
import { setOrganizationIsolationTier } from "@/modules/platform/use-cases/set-organization-isolation-tier"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-016 D-S2, bước S-5 (PO 12/11/2026, "theo quy mô"): mức cô lập gắn gói. Gói không cho phép → 422; đổi gói xuống hoặc
 * huỷ thuê bao làm mức hiện tại không còn được phép → 422, không đổi gì; tổ chức khác không bị chạm.
 */
const pctx = { userId: "platform-admin", capabilities: new Set(["N1", "N2", "N19"]) }
const plan = (p: string) => ({ plan: p, cycle: "MONTHLY" as const, priceVnd: 0, includedCreditsMonthly: 0 })
const tierOf = async (id: string) => (await prisma.organizations.findUniqueOrThrow({ where: { id } })).isolation_tier

describe("mức cô lập theo gói", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("co-lap-a")
    b = await createTenant("co-lap-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("mặc định dùng chung; chưa có thuê bao hoặc gói nhỏ → nâng mức bị từ chối 422", async () => {
    expect(await tierOf(a.organizationId)).toBe("SHARED")
    await expect(setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "SHARED_PLUS" })).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    await assignSubscription(pctx, a.organizationId, plan("PRO"))
    await expect(setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "SHARED_PLUS" })).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    expect(await tierOf(a.organizationId)).toBe("SHARED")
  })

  it("Mạng lưới → khôi phục riêng được, triển khai riêng không; Doanh nghiệp → cả ba; ghi nhật ký", async () => {
    await assignSubscription(pctx, a.organizationId, plan("FLOWER_NETWORK"))
    expect(await setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "SHARED_PLUS", note: "hợp đồng chuỗi" })).toMatchObject({ isolationTier: "SHARED_PLUS" })
    await expect(setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "DEDICATED" })).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    await expect(setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "SHARED_PLUS" })).rejects.toMatchObject({ code: "CONFLICT" })

    await assignSubscription(pctx, a.organizationId, plan("ENTERPRISE"))
    await setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "DEDICATED" })
    expect(await tierOf(a.organizationId)).toBe("DEDICATED")
    expect(await prisma.platform_audit_logs.count({ where: { action: "platform.organization_isolation_changed", entity_id: a.organizationId } })).toBe(2)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "platform.organization_isolation_changed" } })).toBe(2)
    expect(await tierOf(b.organizationId)).toBe("SHARED")
  })

  it("đổi gói xuống / huỷ thuê bao khi mức hiện tại không còn được phép → 422, gói giữ nguyên; hạ mức trước thì được", async () => {
    await assignSubscription(pctx, a.organizationId, plan("ENTERPRISE"))
    await setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "SHARED_PLUS" })
    await expect(assignSubscription(pctx, a.organizationId, plan("PRO"))).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    await expect(cancelSubscription(pctx, a.organizationId)).rejects.toMatchObject({ code: "UNPROCESSABLE_ENTITY" })
    expect((await prisma.subscriptions.findUniqueOrThrow({ where: { organization_id: a.organizationId } })).plan).toBe("ENTERPRISE")

    await assignSubscription(pctx, a.organizationId, plan("FLOWER_NETWORK")) // vẫn cho phép SHARED_PLUS
    await setOrganizationIsolationTier(pctx, { organizationId: a.organizationId, tier: "SHARED" })
    await assignSubscription(pctx, a.organizationId, plan("PRO"))
    await cancelSubscription(pctx, a.organizationId)
  })

  it("cần quyền N2; tổ chức không tồn tại → 404", async () => {
    await expect(setOrganizationIsolationTier({ userId: "x", capabilities: new Set(["N1"]) }, { organizationId: a.organizationId, tier: "SHARED_PLUS" })).rejects.toBeTruthy()
    await expect(setOrganizationIsolationTier(pctx, { organizationId: "khong-co", tier: "SHARED_PLUS" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
