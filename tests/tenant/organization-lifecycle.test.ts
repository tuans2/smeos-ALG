import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { randomUUID } from "node:crypto"

import { GET as listOrganizationsRoute } from "@/app/api/v1/organizations/route"
import { GET as listProducts, POST as createProduct } from "@/app/api/v1/products/route"
import { POST as switchOrganizationRoute } from "@/app/api/v1/session/organization/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { logIn } from "@/modules/organization/use-cases/log-in"
import { setOrganizationLifecycle } from "@/modules/platform/use-cases/set-organization-lifecycle"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * ADR-016 D-S5, bước S-3a: vòng đời tổ chức. Tạm ngưng → thành viên không vào được (kể cả đăng nhập), dữ liệu giữ
 * nguyên; rời nền tảng → chỉ xem; tổ chức khác không bị ảnh hưởng. Admin SaaS đổi trạng thái có ghi nhật ký.
 */
const BASE = "http://localhost/api/v1"
const pctx = { userId: "platform-admin", capabilities: new Set(["N2"]) }
const DAY = 24 * 60 * 60 * 1000
/** Mật khẩu của tài khoản thử do `createTenant` tạo (không phải bí mật thật). */
const TENANT_PASSWORD = "mat-khau-du-dai"
const credentialsOf = (label: string) => ({ email: `${label}@vi-du.test`, password: TENANT_PASSWORD })

describe("vòng đời tổ chức", () => {
  let a: Tenant
  let b: Tenant

  const list = (t: Tenant) => listProducts(withSession(`${BASE}/products`, t.token))
  const create = (t: Tenant, code: string) =>
    createProduct(withSession(`${BASE}/products`, t.token, { method: "POST", body: JSON.stringify({ code, name: code }) }))

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("vong-doi-a")
    b = await createTenant("vong-doi-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tạm ngưng: thành viên không xem, không ghi, không đăng nhập được; dữ liệu giữ nguyên; tổ chức khác bình thường", async () => {
    expect((await create(a, "SP-1")).status).toBe(201)
    await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "SUSPENDED" })

    const read = await list(a)
    expect(read.status).toBe(403)
    expect((await readJson(read)).error).toMatchObject({ code: "ORGANIZATION_INACTIVE" })
    expect((await create(a, "SP-2")).status).toBe(403)
    await expect(logIn(credentialsOf("vong-doi-a"))).rejects.toMatchObject({ code: "ORGANIZATION_INACTIVE" })
    expect(await prisma.products.count({ where: { organization_id: a.organizationId } })).toBe(1)

    expect((await list(b)).status).toBe(200)
    expect((await create(b, "SP-B")).status).toBe(201)

    await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "ACTIVE" })
    expect((await list(a)).status).toBe(200)
  })

  it("rời nền tảng: chỉ xem (để xuất bàn giao), không ghi; cần hạn giữ dữ liệu trong tương lai", async () => {
    await expect(setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "OFFBOARDING" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const until = new Date(Date.now() + 30 * DAY)
    const res = await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "OFFBOARDING", offboardingUntil: until })
    expect(res).toMatchObject({ lifecycleStatus: "OFFBOARDING", offboardingUntil: until.toISOString() })

    expect((await list(a)).status).toBe(200)
    expect((await create(a, "SP-3")).status).toBe(403)
    const login = await logIn(credentialsOf("vong-doi-a"))
    expect(login.organizationId).toBe(a.organizationId)
  })

  it("Admin SaaS: cần N2; ghi nhật ký nền tảng và nhật ký của tổ chức; không đặt DELETED, không đổi tổ chức lạ", async () => {
    await expect(setOrganizationLifecycle({ userId: "x", capabilities: new Set(["N1"]) }, { organizationId: a.organizationId, status: "SUSPENDED" })).rejects.toBeTruthy()
    await expect(setOrganizationLifecycle(pctx, { organizationId: "khong-co", status: "SUSPENDED" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "ACTIVE" })).rejects.toMatchObject({ code: "CONFLICT" })

    await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "SUSPENDED", note: "quá hạn hợp đồng" })
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })
    expect(org.lifecycle_status).toBe("SUSPENDED")
    expect(org.lifecycle_changed_at).not.toBeNull()
    expect(await prisma.platform_audit_logs.count({ where: { action: "platform.organization_lifecycle_changed", entity_id: a.organizationId } })).toBe(1)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "platform.organization_lifecycle_changed" } })).toBe(1)

    await prisma.organizations.update({ where: { id: a.organizationId }, data: { lifecycle_status: "DELETED" } })
    await expect(setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "ACTIVE" })).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("audit User Journey UJ-26: chủ tiệm nhận thông báo khi Admin tạm ngưng / mở lại / chuyển rời nền tảng", async () => {
    const inbox = () => prisma.notification_inbox.findMany({ where: { organization_id: a.organizationId, event_key: "ORGANIZATION_LIFECYCLE_CHANGED" }, orderBy: { created_at: "asc" } })
    await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "SUSPENDED" })
    await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "ACTIVE" })
    const rows = await inbox()
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.message)).toEqual([expect.stringMatching(/tạm ngưng/), expect.stringMatching(/hoạt động trở lại/)])
    expect(await prisma.notification_inbox.count({ where: { organization_id: b.organizationId, event_key: "ORGANIZATION_LIFECYCLE_CHANGED" } })).toBe(0)
  })

  describe("audit User Journey UJ-27 (R2-02): người thuộc nhiều tổ chức", () => {
    /** Chủ tiệm A (tham gia A trước) được mời làm nhân viên ở B. */
    async function joinB() {
      const role = await new RoleRepository().findSystemRoleByKey("sale")
      await prisma.memberships.create({
        data: { id: randomUUID(), organization_id: b.organizationId, user_id: a.userId, role_id: role!.id, status: "ACTIVE", invited_at: new Date(Date.now() + 1000), joined_at: new Date() },
      })
    }
    const listOrgs = async () => (await readJson(await listOrganizationsRoute(withSession(`${BASE}/organizations`, a.token)))).data as { id: string; lifecycle_status: string }[]
    const switchTo = (organizationId: string) =>
      switchOrganizationRoute(withSession(`${BASE}/session/organization`, a.token, { method: "POST", body: JSON.stringify({ organization_id: organizationId }) }))

    it("tổ chức cũ nhất bị tạm ngưng → đăng nhập vào tổ chức còn hoạt động, không bị khoá cả tài khoản", async () => {
      await joinB()
      await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "SUSPENDED" })
      const login = await logIn(credentialsOf("vong-doi-a"))
      expect(login.organizationId).toBe(b.organizationId)
    })

    it("mọi tổ chức đều tạm ngưng → vẫn báo tổ chức tạm ngưng như cũ", async () => {
      await joinB()
      await setOrganizationLifecycle(pctx, { organizationId: a.organizationId, status: "SUSPENDED" })
      await setOrganizationLifecycle(pctx, { organizationId: b.organizationId, status: "SUSPENDED" })
      await expect(logIn(credentialsOf("vong-doi-a"))).rejects.toMatchObject({ code: "ORGANIZATION_INACTIVE" })
    })

    it("danh sách 'Tổ chức của tôi' nêu trạng thái; không chuyển được sang tổ chức đang tạm ngưng (403 có câu báo), chuyển được sang tổ chức đang rời nền tảng", async () => {
      await joinB()
      await setOrganizationLifecycle(pctx, { organizationId: b.organizationId, status: "SUSPENDED" })
      expect(Object.fromEntries((await listOrgs()).map((o) => [o.id, o.lifecycle_status]))).toEqual({ [a.organizationId]: "ACTIVE", [b.organizationId]: "SUSPENDED" })

      const blocked = await switchTo(b.organizationId)
      expect(blocked.status).toBe(403)
      expect((await readJson(blocked)).error).toMatchObject({ code: "ORGANIZATION_INACTIVE" })
      expect((await prisma.sessions.findFirstOrThrow({ where: { user_id: a.userId, revoked_at: null } })).organization_id).toBe(a.organizationId)

      await setOrganizationLifecycle(pctx, { organizationId: b.organizationId, status: "OFFBOARDING", offboardingUntil: new Date(Date.now() + 30 * DAY) })
      expect((await switchTo(b.organizationId)).status).toBe(200)
    })
  })
})
