import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { PATCH as patchRoleCaps } from "@/app/api/v1/roles/[id]/capabilities/route"
import { GET as listRoles } from "@/app/api/v1/roles/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hồi quy P2 (audit API §30): Điều hành từng bỏ được `F5` khỏi chính vai `dieu_hanh` (200) rồi không bật lại được (403
 * vì phiên đã mất `F5`). Nay tắt `F1`/`F5` trên vai Điều hành → 422 và không ghi gì.
 */
const BASE = "http://localhost/api/v1"

describe("sàn quyền của vai Điều hành", () => {
  let t: Tenant
  let ownerRoleId: string
  const patch = (changes: { code: string; allowed: boolean }[]) =>
    patchRoleCaps(withSession(`${BASE}/roles/${ownerRoleId}/capabilities`, t.token, { method: "PATCH", body: JSON.stringify({ changes }) }), { params: Promise.resolve({ id: ownerRoleId }) })
  const ownerCaps = async () =>
    ((await readJson(await listRoles(withSession(`${BASE}/roles`, t.token)))).data as { key: string; capabilities: string[] }[]).find((r) => r.key === "dieu_hanh")!.capabilities

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("san-dieu-hanh")
    const roles = (await readJson(await listRoles(withSession(`${BASE}/roles`, t.token)))).data as { id: string; key: string }[]
    ownerRoleId = roles.find((r) => r.key === "dieu_hanh")!.id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tắt F5 hoặc F1 trên vai Điều hành → 422, quyền giữ nguyên", async () => {
    for (const code of ["F5", "F1"]) {
      const res = await patch([{ code, allowed: false }])
      expect(res.status).toBe(422)
      expect((await readJson(res)).error).toMatchObject({ details: { capability: code } })
    }
    expect(await ownerCaps()).toEqual(expect.arrayContaining(["F1", "F5"]))
  })

  it("yêu cầu lẫn thay đổi hợp lệ với thay đổi xuyên sàn → không ghi gì", async () => {
    expect((await patch([{ code: "A4", allowed: false }, { code: "F5", allowed: false }])).status).toBe(422)
    expect(await prisma.capability_overrides.count({ where: { organization_id: t.organizationId, role_id: ownerRoleId } })).toBe(0)
    expect(await ownerCaps()).toContain("A4")
  })

  it("tắt mã khác trên vai Điều hành vẫn được, và bật lại được", async () => {
    const off = await patch([{ code: "A4", allowed: false }])
    expect(off.status).toBe(200)
    expect((await readJson(off)).capabilities).not.toContain("A4")
    const on = await patch([{ code: "A4", allowed: true }])
    expect(on.status).toBe(200)
    expect((await readJson(on)).capabilities).toContain("A4")
  })
})
