import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/platform/_contracts/responses-orgs"
import { GET as auditLogs } from "@/app/api/v1/platform/audit-logs/route"
import { GET as getBilling, PUT as putBilling } from "@/app/api/v1/platform/billing-account/route"
import { GET as getPricing, PUT as putPricing } from "@/app/api/v1/platform/credit-pricing/route"
import { POST as lockDomain } from "@/app/api/v1/platform/custom-domains/[id]/lock/route"
import { GET as health } from "@/app/api/v1/platform/health/route"
import { POST as jobAction } from "@/app/api/v1/platform/jobs/[id]/action/route"
import { GET as failedJobs } from "@/app/api/v1/platform/jobs/failed/route"
import { GET as margin } from "@/app/api/v1/platform/margin/route"
import { GET as getCredits, POST as postCredits } from "@/app/api/v1/platform/organizations/[id]/credits/route"
import { GET as customDomains } from "@/app/api/v1/platform/organizations/[id]/custom-domains/route"
import { GET as getOrg, PATCH as patchOrg } from "@/app/api/v1/platform/organizations/[id]/route"
import { DELETE as cancelSub, GET as getSub, PUT as putSub } from "@/app/api/v1/platform/organizations/[id]/subscription/route"
import { PUT as usageLimit } from "@/app/api/v1/platform/organizations/[id]/usage-limit/route"
import { GET as listOrgs, POST as createOrg } from "@/app/api/v1/platform/organizations/route"
import { GET as overview } from "@/app/api/v1/platform/overview/route"
import { GET as pendingApprovals } from "@/app/api/v1/platform/pending-approvals/route"
import { POST as decideRegistration } from "@/app/api/v1/platform/registrations/[userId]/decision/route"
import { GET as registrations } from "@/app/api/v1/platform/registrations/route"
import { POST as markPaid } from "@/app/api/v1/platform/subscription-invoices/[id]/mark-paid/route"
import { DELETE as stopPreview, POST as startPreview } from "@/app/api/v1/platform/tier-preview/route"
import { GET as usage } from "@/app/api/v1/platform/usage/route"
import { POST as signup } from "@/app/api/v1/auth/signup/route"
import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi Console Vận hành Nền tảng — tổ chức, thu phí, vận hành (OpenAPI `/platform/*`, PO 07/11/2026):
 * gọi route thật trên CSDL thật, phản hồi phải khớp lược đồ `strictObject` ở `_contracts/responses-orgs.ts`.
 */
const BASE = "http://localhost/api/v1/platform"
type Ps = { params: Promise<Record<string, string>> }
const ps = (params: Record<string, string>): Ps => ({ params: Promise.resolve(params) })

describe("hợp đồng — Console Vận hành Nền tảng: tổ chức, thu phí, vận hành", () => {
  let op: Tenant
  let shop: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, op.token)
  const send = (path: string, method: string, body: unknown) => withSession(`${BASE}${path}`, op.token, { method, body: JSON.stringify(body) })

  beforeAll(async () => {
    await resetDatabase()
    op = await createTenant("van-hanh-hop-dong")
    shop = await createTenant("tiem-hop-dong")
    await new PlatformOperatorRepository().grant(op.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tổ chức: danh sách, chi tiết, yêu cầu chờ duyệt, PATCH, tạo mới", async () => {
    await expectContract(await listOrgs(get("/organizations")), 200, R.organizationsResponse, "organizations")
    await prisma.organizations.update({
      where: { id: shop.organizationId },
      data: { settings: { pending_language_unlock: { requested_locales: ["en"], requested_at: new Date().toISOString(), note: null } } },
    })
    await expectContract(await getOrg(get(`/organizations/${shop.organizationId}`), ps({ id: shop.organizationId })), 200, R.organizationResponse, "organization")
    await expectContract(await pendingApprovals(get("/pending-approvals")), 200, R.pendingApprovalsResponse, "pending-approvals")
    const patch = (body: unknown) => patchOrg(send(`/organizations/${shop.organizationId}`, "PATCH", body), ps({ id: shop.organizationId }))
    await expectContract(await patch({ clear_pending_language_unlock: true }), 200, R.organizationPatchResponse, "organization-patch")
    await expectContract(await patch({ unlocked_locales: ["vi", "en"] }), 200, R.organizationPatchResponse, "organization-patch")
    await expectContract(await patch({ branch_scope_wave1: true }), 200, R.organizationPatchResponse, "organization-patch")
    await expectContract(await patch({ target_type: "CHAIN" }), 200, R.organizationPatchResponse, "organization-patch")
    await expectContract(await patch({}), 200, R.organizationPatchResponse, "organization-patch")
    const created = await expectContract(
      await createOrg(send("/organizations", "POST", { organizationName: "Tiệm Console", ownerEmail: "chu-tiem-console@vi-du.test" })),
      201,
      R.createOrganizationResponse,
      "organization-create"
    )
    expect((created.data as { temporaryPassword: string }).temporaryPassword.length).toBeGreaterThan(0)
  })

  it("đăng ký chờ duyệt và quyết định", async () => {
    const res = await signup(new Request("http://localhost/api/v1/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.50" },
      body: JSON.stringify({ email: "cho-duyet@vi-du.test", password: "mat-khau-du-dai", organization_name: "Tiệm chờ duyệt" }),
    }))
    const userId = (await readJson(res)).user_id as string
    await expectContract(await registrations(get("/registrations")), 200, R.registrationsResponse, "registrations")
    await expectContract(await decideRegistration(send(`/registrations/${userId}/decision`, "POST", { decision: "APPROVE" }), ps({ userId })), 200, R.registrationDecisionResponse, "registration-decision")
  })

  it("xem trước tầng/vai", async () => {
    await expectContract(await startPreview(send("/tier-preview", "POST", { roleKey: "store_admin" })), 200, R.tierPreviewResponse, "tier-preview")
    await expectContract(await stopPreview(send("/tier-preview", "DELETE", {})), 200, R.clearTierPreviewResponse, "tier-preview-clear")
  })

  it("credit, hạn mức, gói thuê bao, hoá đơn, tài khoản nhận tiền, quy đổi, biên lợi nhuận, mức dùng", async () => {
    const id = shop.organizationId
    await expectContract(await postCredits(send(`/organizations/${id}/credits`, "POST", { kind: "TOPUP", amount: 50, reason: "Nạp thử" }), ps({ id })), 200, R.adjustCreditsResponse, "credits-adjust")
    await expectContract(await getCredits(get(`/organizations/${id}/credits`), ps({ id })), 200, R.creditsResponse, "credits")
    await expectContract(await usageLimit(send(`/organizations/${id}/usage-limit`, "PUT", { monthlyLimit: 1000 }), ps({ id })), 200, R.usageLimitResponse, "usage-limit")
    await expectContract(await putBilling(send("/billing-account", "PUT", { bankBin: "970422", bankName: "MB", accountNumber: "0123456789", accountHolder: "CONG TY A" })), 200, R.setBillingAccountResponse, "billing-account-set")
    await expectContract(await getBilling(get("/billing-account")), 200, R.billingAccountResponse, "billing-account")
    await expectContract(await getSub(get(`/organizations/${id}/subscription`), ps({ id })), 200, R.subscriptionResponse, "subscription")
    await expectContract(
      await putSub(send(`/organizations/${id}/subscription`, "PUT", { plan: "PRO", cycle: "MONTHLY", priceVnd: 590_000, includedCreditsMonthly: 200 }), ps({ id })),
      200,
      R.assignSubscriptionResponse,
      "subscription-assign"
    )
    const sub = await expectContract(await getSub(get(`/organizations/${id}/subscription`), ps({ id })), 200, R.subscriptionResponse, "subscription")
    const invoiceId = ((sub.data as { invoices: { id: string }[] }).invoices[0] ?? { id: "khong-co" }).id
    await expectContract(await markPaid(send(`/subscription-invoices/${invoiceId}/mark-paid`, "POST", { note: "Đã nhận chuyển khoản" }), ps({ id: invoiceId })), 200, R.markInvoicePaidResponse, "invoice-paid")
    await expectContract(await cancelSub(send(`/organizations/${id}/subscription`, "DELETE", {}), ps({ id })), 200, R.cancelSubscriptionResponse, "subscription-cancel")
    await expectContract(await getPricing(get("/credit-pricing")), 200, R.creditPricingResponse, "credit-pricing")
    await expectContract(await putPricing(send("/credit-pricing", "PUT", { usdToVnd: 26_000 })), 200, R.creditPricingResponse, "credit-pricing")
    await expectContract(await margin(get("/margin")), 200, R.marginResponse, "margin")
    await expectContract(await usage(get("/usage")), 200, R.usageResponse, "usage")
  })

  it("tên miền riêng", async () => {
    const id = shop.organizationId
    const domain = await prisma.custom_domains.create({ data: { organization_id: id, hostname: "hoa.vi-du.test", verification_token: "tok" } })
    await expectContract(await customDomains(get(`/organizations/${id}/custom-domains`), ps({ id })), 200, R.customDomainsResponse, "custom-domains")
    await expectContract(await lockDomain(send(`/custom-domains/${domain.id}/lock`, "POST", { locked: true, reason: "Nội dung vi phạm" }), ps({ id: domain.id })), 200, R.customDomainLockResponse, "custom-domain-lock")
  })

  it("vận hành: tổng quan, sức khoẻ, job lỗi, nhật ký", async () => {
    const job = await prisma.generation_jobs.create({
      data: {
        organization_id: shop.organizationId, workspace_id: shop.ctx.workspaceId, user_id: shop.userId,
        feature: "vision.analyze", status: "FAILED", payload: {}, error: "hết giờ", failure_kind: "RETRYABLE", attempts: 3, completed_at: new Date(),
      },
    })
    await expectContract(await overview(get("/overview")), 200, R.overviewResponse, "overview")
    await expectContract(await health(get("/health")), 200, R.healthResponse, "health")
    await expectContract(await failedJobs(get("/jobs/failed")), 200, R.failedJobsResponse, "failed-jobs")
    await expectContract(await jobAction(send(`/jobs/${job.id}/action`, "POST", { action: "DISMISS" }), ps({ id: job.id })), 200, R.failedJobActionResponse, "job-action")
    await expectContract(await auditLogs(get("/audit-logs?limit=20")), 200, R.auditLogsResponse, "audit-logs")
  })
})
