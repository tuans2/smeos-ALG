import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import type { TenantContext } from "@/core/tenancy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { assertCanEditCatalog, assertCanEditSharedDisplay } from "@/modules/greeting-card/use-cases/catalog-edit-access"

/** PO 16/10/2026: Sale sửa bộ sưu tập của mình; bộ sưu tập người khác tạo → 403; tổ chức khác → 404. */

async function codeOf(p: Promise<unknown> | (() => unknown)): Promise<string | undefined> {
  try {
    await (typeof p === "function" ? p() : p)
    return undefined
  } catch (err) {
    return (err as { code?: string }).code
  }
}

describe("greeting-card: ai sửa được bộ sưu tập", () => {
  let a: Tenant
  let b: Tenant
  let lan: TenantContext
  const repo = new GreetingCardRepository()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    lan = { ...a.ctx, userId: randomUUID(), capabilities: new Set(["L1", "R1", "R2", "R9"]) }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const catalogBy = (createdBy: string) =>
    repo.createCatalog(a.ctx, { code: `bo-${randomUUID().slice(0, 6)}`, name: "Bộ", productIds: [], createdBy })

  it("Sale và Điều phối sửa bộ sưu tập của mình; bộ sưu tập chủ tiệm tạo → 403; chỉ L4 sửa mọi bộ sưu tập", async () => {
    const own = await catalogBy(lan.userId)
    const owners = await catalogBy(a.userId)
    expect(await codeOf(assertCanEditCatalog(lan, own.id))).toBeUndefined()
    expect(await codeOf(assertCanEditCatalog(lan, owners.id))).toBe("CAPABILITY_DENIED")
    // Điều phối có L3 (sửa sản phẩm) nhưng theo luật như Sale (PO 16/10/2026)
    const coordinator = { ...lan, capabilities: new Set(["L1", "L2", "L3", "R1", "R2", "R3", "R4", "R5"]) }
    expect(await codeOf(assertCanEditCatalog(coordinator, owners.id))).toBe("CAPABILITY_DENIED")
    expect(await codeOf(assertCanEditCatalog(coordinator, own.id))).toBeUndefined()
    expect(await codeOf(assertCanEditCatalog({ ...lan, capabilities: new Set(["R2", "L4"]) }, owners.id))).toBeUndefined()
  })

  it("bộ sưu tập của tổ chức khác → 404", async () => {
    const owners = await catalogBy(a.userId)
    expect(await codeOf(assertCanEditCatalog({ ...b.ctx, capabilities: new Set(["R2", "L4"]) }, owners.id))).toBe("NOT_FOUND")
  })

  it("cài đặt hiển thị chung cả tiệm: Sale và Điều phối không đổi được, chỉ L4 (Điều hành)", async () => {
    expect(await codeOf(() => assertCanEditSharedDisplay(lan))).toBe("CAPABILITY_DENIED")
    expect(await codeOf(() => assertCanEditSharedDisplay({ ...lan, capabilities: new Set(["R2", "L3"]) }))).toBe("CAPABILITY_DENIED")
    expect(await codeOf(() => assertCanEditSharedDisplay({ ...lan, capabilities: new Set(["R2", "L4"]) }))).toBeUndefined()
  })
})
