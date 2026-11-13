import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GovernanceRepository } from "@/modules/integration-hub/infra/governance-repository"
import { NotificationHardLockRepository } from "@/modules/notification/infra/notification-hard-lock-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"

/**
 * ADR-012 D-T5: phạm vi lưu theo địa chỉ chuẩn (`platform`, `industry:<key>`, `org:<id>`) ở cột `scope` của
 * `governance_decisions` (T-7c: bảng `notification_hard_locks` / `integration_governance` đã bỏ); domain/API vẫn dùng
 * dạng cũ ("GLOBAL", id tổ chức). Repository đổi qua lại ngay khi ghi và đọc.
 */
describe("khoá phạm vi dạng D-T5", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const scopes = async (system: string) =>
    (await prisma.governance_decisions.findMany({ where: { system }, orderBy: { version: "asc" } })).map((r) => r.scope)

  it("khoá thông báo: ghi dạng D-T5, đọc trả dạng domain; gỡ khoá thành dòng gỡ", async () => {
    const repo = new NotificationHardLockRepository()
    await repo.setHardLock({ eventKey: "order.created", channel: "EMAIL", tier: "MOTHER", scopeId: "GLOBAL", enabled: false, lockedBy: "u" })
    await repo.setHardLock({ eventKey: "order.created", channel: "EMAIL", tier: "CHAIN", scopeId: "org-a", enabled: false, lockedBy: "u" })
    expect(await scopes("notification.hard_lock")).toEqual(["platform", "org:org-a"])

    expect((await repo.getHardLocks({ scopeId: "GLOBAL" })).map((l) => l.scopeId)).toEqual(["GLOBAL"])
    expect((await repo.getHardLocks({ scopeId: "org-a" })).map((l) => l.scopeId)).toEqual(["org-a"])

    await repo.deleteHardLock("order.created", "EMAIL", "CHAIN", "org-a", "u")
    expect(await repo.getHardLocks({ scopeId: "org-a" })).toEqual([])
    expect((await repo.getHardLocks({ scopeId: "GLOBAL" })).map((l) => l.eventKey)).toEqual(["order.created"])
  })

  it("quản trị tích hợp: ghi dạng D-T5, đọc theo phạm vi domain; ALLOW_OWN là dòng gỡ", async () => {
    const repo = new GovernanceRepository()
    await repo.set({ connectorKey: "zalo", tier: "MOTHER", scopeId: "GLOBAL", mode: "FORBID", updatedBy: "u" })
    await repo.set({ connectorKey: "zalo", tier: "INDUSTRY", scopeId: "industry:FLORAL", mode: "FORBID", updatedBy: "u" })
    await repo.set({ connectorKey: "zalo", tier: "CHAIN", scopeId: "chain-1", mode: "INHERIT_ONLY", updatedBy: "u" })
    expect((await scopes("integration")).sort()).toEqual(["industry:FLORAL", "org:chain-1", "platform"])

    const rows = await repo.listForScopes(["GLOBAL", "industry:FLORAL", "chain-1"])
    expect(rows.map((r) => r.scopeId).sort()).toEqual(["GLOBAL", "chain-1", "industry:FLORAL"])

    await repo.set({ connectorKey: "zalo", tier: "CHAIN", scopeId: "chain-1", mode: "ALLOW_OWN", updatedBy: "u" })
    expect((await repo.listForScopes(["chain-1"])).map((r) => r.connectorKey)).toEqual([])
  })
})
