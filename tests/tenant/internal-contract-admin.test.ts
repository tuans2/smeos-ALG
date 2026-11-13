import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const SEPAY_KEY = "khoa-thu-nghiem-sepay-hop-dong" // trùng giá trị trong `vi.mock` (bị kéo lên đầu tệp)
vi.mock("@/lib/env", async (orig) => {
  const mod = await orig<typeof import("@/lib/env")>()
  return { ...mod, env: { ...mod.env, SEPAY_PLATFORM_API_KEY: "khoa-thu-nghiem-sepay-hop-dong" } }
})

import * as R from "@/app/api/v1/_contracts/responses-admin"
import { GET as aiCapabilities } from "@/app/api/v1/ai-capabilities/route"
import { GET as getAiPolicy, PUT as putAiPolicy } from "@/app/api/v1/ai-policy/route"
import { GET as reviewQueue, POST as reviewAi } from "@/app/api/v1/ai-requests/review/route"
import { GET as listAiRequests } from "@/app/api/v1/ai-requests/route"
import { GET as aiSummary } from "@/app/api/v1/ai-requests/summary/route"
import { GET as platformAccess } from "@/app/api/v1/audit-logs/platform-access/route"
import { GET as auditLogs } from "@/app/api/v1/audit-logs/route"
import { POST as sepay } from "@/app/api/v1/billing/sepay/route"
import { POST as validateContent } from "@/app/api/v1/content-guard/validate/route"
import { PATCH as patchRoleCaps } from "@/app/api/v1/roles/[id]/capabilities/route"
import { GET as listRoles, POST as createRole } from "@/app/api/v1/roles/route"
import { GET as subscription } from "@/app/api/v1/subscription/route"
import { GET as uxFlags } from "@/app/api/v1/ux-rollout-flags/route"
import { GET as listWorkspaces, POST as createWorkspace } from "@/app/api/v1/workspaces/route"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { upsertSubscription } from "@/modules/subscription/infra/subscription-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi nhóm quản trị & AI (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — vai trò, không gian, nhật ký, thuê bao, chính sách AI, sổ lời gọi AI", () => {
  let t: Tenant
  let other: Tenant
  let subT: Tenant
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-quan-tri")
    other = await createTenant("hop-dong-quan-tri-khac")
    // Gán gói chưa thanh toán đưa tổ chức về chế độ chỉ xem (402 cho lệnh ghi) — tách tổ chức riêng.
    subT = await createTenant("hop-dong-quan-tri-goi")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("vai trò, không gian làm việc, cờ giao diện", async () => {
    const created = await expectContract(await createRole(send("/roles", "POST", { name: "Thu ngân" })), 201, R.roleCreatedResponse, "role-create")
    const id = String((created.role as { id: string }).id)
    await expectContract(await listRoles(get("/roles")), 200, R.rolesResponse, "roles")
    await expectContract(await patchRoleCaps(send(`/roles/${id}/capabilities`, "PATCH", { changes: [{ code: "R1", allowed: true }, { code: "F1", allowed: false }] }), ps(id)), 200, R.roleCapabilitiesResponse, "role-caps")
    expect((await patchRoleCaps(send(`/roles/${id}/capabilities`, "PATCH", { changes: [{ code: "R1", allowed: true }] }, other), ps(id))).status).toBe(404)
    await expectContract(await createWorkspace(send("/workspaces", "POST", { name: "Thử nghiệm", kind: "EXPERIENCE" })), 201, R.workspaceCreatedResponse, "workspace-create")
    await expectContract(await listWorkspaces(get("/workspaces")), 200, R.workspacesResponse, "workspaces")
    await expectContract(await uxFlags(get("/ux-rollout-flags")), 200, R.uxFlagsResponse, "ux-flags")
  })

  it("nhật ký kiểm toán, truy cập của nền tảng, thuê bao, webhook SePay", async () => {
    await expectContract(await auditLogs(get("/audit-logs?limit=10")), 200, R.auditLogsResponse, "audit-logs")
    await expectContract(await auditLogs(get("/audit-logs?action=role&from=2026-01-01&to=2030-12-31")), 200, R.auditLogsResponse, "audit-logs-filter")
    expect((await auditLogs(get("/audit-logs?from=1/1/2026"))).status).toBe(400)
    await expectContract(await platformAccess(get("/audit-logs/platform-access")), 200, R.platformAccessResponse, "platform-access")
    await expectContract(await subscription(get("/subscription", subT)), 200, R.subscriptionResponse, "subscription-none")
    await runInTransaction((tx) => upsertSubscription(tx, subT.organizationId, { plan: "PRO", cycle: "MONTHLY", priceVnd: 500_000, includedCreditsMonthly: 0, actorId: subT.userId, now: new Date() }))
    await expectContract(await subscription(get("/subscription", subT)), 200, R.subscriptionResponse, "subscription")
    const code = String(((await readJson(await subscription(get("/subscription", subT)))).data as { invoices: { code: string }[] }).invoices[0]!.code)
    const hook = (key: string, id: number, amount: number) =>
      sepay(new Request(`${BASE}/billing/sepay`, { method: "POST", headers: { "content-type": "application/json", authorization: `Apikey ${key}` }, body: JSON.stringify({ id, transferType: "in", transferAmount: amount, content: `TT ${code}` }) }))
    expect((await hook("sai", 1, 500000)).status).toBe(401)
    await expectContract(await hook(SEPAY_KEY, 2, 400000), 200, R.sepayWebhookResponse, "sepay-short")
    await expectContract(await hook(SEPAY_KEY, 3, 500000), 200, R.sepayWebhookResponse, "sepay-paid")
  })

  it("chính sách AI, danh mục năng lực, sổ lời gọi, hàng chờ soát, kiểm từ cấm", async () => {
    await expectContract(await getAiPolicy(get("/ai-policy")), 200, R.aiPolicyResponse, "ai-policy")
    await expectContract(await putAiPolicy(send("/ai-policy", "PUT", { capability_code: "AIC-23", allowed_models: [], privacy_floor: "SHOP", quality_target: "cao" })), 200, R.aiPolicyResponse, "ai-policy-put")
    await expectContract(await aiCapabilities(get("/ai-capabilities")), 200, R.aiCapabilitiesResponse, "ai-capabilities")
    const row = await prisma.ai_requests.create({ data: { organization_id: t.organizationId, capability_code: "AIC-23", model_key: "mo-hinh-thu", source: "CORE", cost_usd: 0.002, latency_ms: 850, quality_score: 0.6, outcome: "NEEDS_REVIEW" } })
    await prisma.ai_requests.create({ data: { organization_id: t.organizationId, capability_code: "AIC-23", model_key: "mo-hinh-thu", source: "CORE", cost_usd: 0.001, latency_ms: 400, quality_score: 0.9, outcome: "ACCEPTED" } })
    await expectContract(await listAiRequests(get("/ai-requests?capability_code=AIC-23&limit=50")), 200, R.aiRequestsResponse, "ai-requests")
    await expectContract(await aiSummary(get("/ai-requests/summary")), 200, R.aiSummaryResponse, "ai-summary")
    await expectContract(await reviewQueue(get("/ai-requests/review")), 200, R.reviewQueueResponse, "review-queue")
    await expectContract(await reviewAi(send("/ai-requests/review", "POST", { id: row.id, action: "approve", note: "Ổn" })), 200, R.reviewDecisionResponse, "review-decision")
    expect((await reviewAi(send("/ai-requests/review", "POST", { id: row.id, action: "approve" }, other))).status).toBe(404)
    await expectContract(await validateContent(send("/content-guard/validate", "POST", { text: "Hoa tươi đẹp, cam kết 100% không héo", auto_sanitize: true })), 200, R.contentGuardResponse, "content-guard")
    await expectContract(await validateContent(send("/content-guard/validate", "POST", { text: "Bó hoa vĩnh cửu, giống hệt 100% hình mẫu" })), 200, R.contentGuardResponse, "content-guard-blocked")
    expect((await validateContent(send("/content-guard/validate", "POST", { text: "" }))).status).toBe(400)
    expect((await readJson(await reviewQueue(get("/ai-requests/review", other)))).data).toEqual([])
  })
})
