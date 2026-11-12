import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { listMembers } from "@/modules/organization/use-cases/list-members"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Danh sách nhân viên: chỉ người quản lý nhân viên thấy email (GD1 Bước 6 — S-03, PO 11/11/2026). */
describe("GET /members — email nhân viên", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("Sale (F1, không quản lý nhân viên) thấy tên và vai nhưng không thấy email", async () => {
    const rows = await listMembers({ ...a.ctx, capabilities: new Set(["F1", "R1"]) })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.user.email === "")).toBe(true)
  })

  it("người quản lý nhân viên (A3, F4 hoặc F5) thấy email", async () => {
    for (const code of ["A3", "F4", "F5"]) {
      const rows = await listMembers({ ...a.ctx, capabilities: new Set(["F1", code]) })
      expect(rows.some((r) => r.user.email === "alpha@vi-du.test")).toBe(true)
    }
  })
})
