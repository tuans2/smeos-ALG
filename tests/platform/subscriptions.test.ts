import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getSub, PUT as putSub, DELETE as deleteSub } from "@/app/api/v1/platform/organizations/[id]/subscription/route"
import { POST as markPaid } from "@/app/api/v1/platform/subscription-invoices/[id]/mark-paid/route"
import { PUT as putAccount } from "@/app/api/v1/platform/billing-account/route"
import { POST as createOrg } from "@/app/api/v1/platform/organizations/route"
import { GET as getOverview } from "@/app/api/v1/platform/overview/route"
import { POST as login } from "@/app/api/v1/auth/login/route"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/platform"
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (method: string, body?: unknown) => ({ method, ...(body ? { body: JSON.stringify(body) } : {}) })

/** Checklist ALG 10.7, 9.10, 9.8 — Console gán gói, xác nhận thu, tạo tổ chức, tổng quan; thiếu mã → 403. */
describe("thuê bao trên Console", () => {
  let a: Tenant
  let op: Tenant
  let reader: Tenant
  let creator: Tenant

  beforeEach(async () => {
    await resetDatabase()
    await prisma.platform_settings.deleteMany({ where: { key: "platform_billing_account" } })
    a = await createTenant("subc-a")
    op = await createTenant("subc-op")
    reader = await createTenant("subc-reader")
    creator = await createTenant("subc-creator")
    await new PlatformOperatorRepository().grant(op.userId, ["N1", "N7", "N19"], null)
    await new PlatformOperatorRepository().grant(reader.userId, ["N1"], null)
    await new PlatformOperatorRepository().grant(creator.userId, ["N7"], null)
  })

  afterAll(async () => {
    await prisma.platform_settings.deleteMany({ where: { key: "platform_billing_account" } })
    await disconnectDatabase()
  })

  const plan = { plan: "PRO", cycle: "MONTHLY", priceVnd: 590_000, includedCreditsMonthly: 200 }

  it("N19 mới gán được; chưa thu kỳ đầu → quá hạn; xác nhận thu → hoạt động; hoá đơn có mã VietQR khi đã khai tài khoản; huỷ gói", async () => {
    expect((await putSub(withSession(`${BASE}/organizations/${a.organizationId}/subscription`, reader.token, json("PUT", plan)), params(a.organizationId))).status).toBe(403)
    expect((await putSub(withSession(`${BASE}/organizations/${a.organizationId}/subscription`, op.token, json("PUT", { ...plan, plan: "VANG" })), params(a.organizationId))).status).toBe(400)
    expect((await putSub(withSession(`${BASE}/organizations/${a.organizationId}/subscription`, op.token, json("PUT", plan)), params(a.organizationId))).status).toBe(200)

    expect((await putAccount(withSession(`${BASE}/billing-account`, reader.token, json("PUT", {})))).status).toBe(403)
    expect((await putAccount(withSession(`${BASE}/billing-account`, op.token, json("PUT", { bankBin: "12", accountNumber: "x", accountHolder: "" })))).status).toBe(400)
    const acc = { bankBin: "970436", bankName: "Vietcombank", accountNumber: "0123456789", accountHolder: "CONG TY NEN TANG" }
    expect((await putAccount(withSession(`${BASE}/billing-account`, op.token, json("PUT", acc)))).status).toBe(200)

    const view = (await readJson(await getSub(withSession(`${BASE}/organizations/${a.organizationId}/subscription`, reader.token), params(a.organizationId)))) as {
      data: { subscription: { status: string }; invoices: Array<{ id: string; code: string; payment: { transferContent: string; qrImageUrl: string } | null }> }
    }
    expect(view.data.subscription.status).toBe("OVERDUE")
    const inv = view.data.invoices[0]!
    expect(inv.payment?.transferContent).toBe(inv.code)
    expect(inv.payment?.qrImageUrl).toContain("970436-0123456789")

    expect((await markPaid(withSession(`${BASE}/subscription-invoices/${inv.id}/mark-paid`, reader.token, json("POST", { note: "CK 05/11" })), params(inv.id))).status).toBe(403)
    expect((await markPaid(withSession(`${BASE}/subscription-invoices/${inv.id}/mark-paid`, op.token, json("POST", { note: "CK VCB 05/11" })), params(inv.id))).status).toBe(200)
    expect((await markPaid(withSession(`${BASE}/subscription-invoices/${inv.id}/mark-paid`, op.token, json("POST", { note: "CK VCB 05/11" })), params(inv.id))).status).toBe(404)
    expect((await prisma.subscriptions.findUniqueOrThrow({ where: { organization_id: a.organizationId } })).status).toBe("ACTIVE")

    expect((await deleteSub(withSession(`${BASE}/organizations/${a.organizationId}/subscription`, op.token, json("DELETE")), params(a.organizationId))).status).toBe(200)
    expect((await prisma.subscriptions.findUniqueOrThrow({ where: { organization_id: a.organizationId } })).status).toBe("CANCELLED")
    expect(await prisma.platform_audit_logs.count({ where: { user_id: op.userId, action: { startsWith: "platform.subscription" } } })).toBe(3)
  })

  it("tạo tổ chức (9.10): thiếu N7 → 403, gán gói cần N19; tạo xong chủ tiệm đăng nhập bằng mật khẩu tạm và bị buộc đổi; có gói và nhật ký", async () => {
    const body = { organizationName: "Tiệm Console", ownerEmail: "chu-tiem@vi-du.test", ownerName: "Chủ tiệm", industry: "FLORAL", subscription: { ...plan, firstPeriodPaid: true } }
    expect((await createOrg(withSession(`${BASE}/organizations`, reader.token, json("POST", body)))).status).toBe(403)
    expect((await createOrg(withSession(`${BASE}/organizations`, creator.token, json("POST", body)))).status).toBe(403)
    const res = await createOrg(withSession(`${BASE}/organizations`, op.token, json("POST", body)))
    expect(res.status).toBe(201)
    const created = ((await readJson(res)) as { data: { organizationId: string; temporaryPassword: string } }).data
    expect((await createOrg(withSession(`${BASE}/organizations`, op.token, json("POST", body)))).status).toBe(409)
    // Có danh mục dịp mặc định như cửa hàng tự đăng ký (1.7)
    expect(await prisma.occasions.count({ where: { organization_id: created.organizationId, is_active: true } })).toBeGreaterThan(0)

    const user = await prisma.users.findUniqueOrThrow({ where: { email: "chu-tiem@vi-du.test" } })
    expect(user.must_change_password).toBe(true)
    const signin = await login(new Request("http://localhost/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "chu-tiem@vi-du.test", password: created.temporaryPassword }) }))
    expect(signin.status).toBe(200)
    expect(await prisma.subscriptions.findUniqueOrThrow({ where: { organization_id: created.organizationId } })).toMatchObject({ plan: "PRO", status: "ACTIVE" })
    const audit = await prisma.platform_audit_logs.findFirstOrThrow({ where: { action: "platform.organization.create", entity_id: created.organizationId } })
    expect(JSON.stringify(audit.after)).not.toContain(created.temporaryPassword)
  })

  it("tổng quan (9.8): số cửa hàng theo trạng thái thuê bao và doanh thu đã thu tháng này", async () => {
    await putSub(withSession(`${BASE}/organizations/${a.organizationId}/subscription`, op.token, json("PUT", { ...plan, firstPeriodPaid: true })), params(a.organizationId))
    await putSub(withSession(`${BASE}/organizations/${reader.organizationId}/subscription`, op.token, json("PUT", plan)), params(reader.organizationId))
    const res = await getOverview(withSession(`${BASE}/overview`, reader.token))
    expect(res.status).toBe(200)
    const data = ((await readJson(res)) as { data: { organizations: Record<string, number>; subscriptionRevenue: Array<{ amountVnd: number }>; health: unknown } }).data
    expect(data.organizations).toMatchObject({ active: 1, overdue: 1, withoutSubscription: data.organizations.total! - 2 })
    expect(data.subscriptionRevenue.at(-1)?.amountVnd).toBe(590_000)
    expect(data.health).toBeNull()
    expect((await getOverview(withSession(`${BASE}/overview`, a.token))).status).toBe(403)
  })
})
