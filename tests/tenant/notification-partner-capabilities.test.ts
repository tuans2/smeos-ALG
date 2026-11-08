import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchOrgPolicy } from "@/app/api/v1/notification/org-policy/route"
import { POST as postStoreLock } from "@/app/api/v1/notification/store-hard-locks/route"
import { POST as provisionPartner } from "@/app/api/v1/coordinator/partners/route"
import { PATCH as patchTools } from "@/app/api/v1/coordinator/partners/[id]/tools/route"
import { verifyPassword } from "@/modules/organization/infra/password-hasher"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, makeChainOrganization, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * AUD-002/004a/009 (PO duyệt 28/10/2026): ghi cấu hình cấp tổ chức và cấp tài khoản đối tác cần F2
 * (chỉ Điều hành). Tài khoản đối tác không còn dùng chung một mật khẩu mặc định.
 */
describe("mã năng lực cho cấu hình thông báo & đối tác chuỗi", () => {
  let chain: Tenant
  let saleToken: string
  const send = (token: string, path: string, method: string, body: unknown) =>
    withSession(`http://localhost/api/v1/${path}`, token, { method, body: JSON.stringify(body) })
  const lock = { eventKey: "ORDER_RECEIVED", channel: "EMAIL", enabled: false }
  const partner = (code: string) => ({
    partnerStoreName: `Tiệm ${code}`, partnerCode: code, contactName: "Chủ tiệm",
    contactPhone: "0987654321", contactEmail: `${code.toLowerCase()}@vi-du.test`,
  })

  beforeEach(async () => {
    await resetDatabase()
    chain = await createTenant("chain")
    await makeChainOrganization(chain)
    saleToken = (await addStaffWithSession(chain, "sale", "sale")).token
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nhân viên bán hàng (không có F2) không sửa được chính sách / khoá cứng của tổ chức", async () => {
    expect((await patchOrgPolicy(send(saleToken, "notification/org-policy", "PATCH", { ...lock, roleKey: "*" }))).status).toBe(403)
    expect((await postStoreLock(send(saleToken, "notification/store-hard-locks", "POST", lock))).status).toBe(403)
    expect(await prisma.governance_decisions.count({ where: { system: "notification.hard_lock" } })).toBe(0)
  })

  it("Điều hành (F2) sửa được", async () => {
    expect((await postStoreLock(send(chain.token, "notification/store-hard-locks", "POST", lock))).status).toBe(200)
  })

  it("nhân viên không có F2 không cấp được tài khoản đối tác, không mở khoá công cụ", async () => {
    expect((await provisionPartner(send(saleToken, "coordinator/partners", "POST", partner("P-01")))).status).toBe(403)
    const res = await patchTools(send(saleToken, "coordinator/partners/x/tools", "PATCH", { unlockedTools: [] }), {
      params: Promise.resolve({ id: "x" }),
    })
    expect(res.status).toBe(403)
  })

  it("mỗi tài khoản đối tác có mật khẩu ngẫu nhiên riêng, trả về một lần", async () => {
    const a = await readJson(await provisionPartner(send(chain.token, "coordinator/partners", "POST", partner("P-01"))))
    const b = await readJson(await provisionPartner(send(chain.token, "coordinator/partners", "POST", partner("P-02"))))
    const pa = a.temporaryPassword as string
    const pb = b.temporaryPassword as string
    expect(pa).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(pa).not.toBe(pb)
    const user = await prisma.users.findFirstOrThrow({ where: { email: "p-01@vi-du.test" } })
    expect(await verifyPassword(pa, user.password_hash!)).toBe(true)
  })
})
