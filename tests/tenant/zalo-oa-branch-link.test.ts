import { createHash } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"

import { POST as zaloWebhook } from "@/app/api/v1/public/zalo-oa/webhook/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { PlatformSecretRepository } from "@/modules/greeting-card/infra/platform-secret-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

const repo = new ChainBranchRepository()

async function addBranch(t: Tenant, code: string) {
  await repo.upsertMany(t.organizationId, [{
    branchId: code, branchName: `CN ${code}`, qualityScore: 90, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true,
    channels: { telegramChatId: `tg-${code}` },
  }])
}

function signedRequest(event: Record<string, unknown>, secret = "oa-secret"): Request {
  const body = JSON.stringify(event)
  const mac = createHash("sha256").update(`app-1${body}${String(event.timestamp)}${secret}`).digest("hex")
  return new Request("http://localhost/api/v1/public/zalo-oa/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-zevent-signature": `mac=${mac}` },
    body,
  })
}

describe("Zalo OA chung — liên kết chi nhánh", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    process.env.ZALO_OA_APP_ID = "app-1"
    process.env.ZALO_OA_WEBHOOK_SECRET = "oa-secret"
  })

  afterEach(async () => {
    // Bảng cấp nền tảng — không nằm trong TRUNCATE của bộ test tenant, tự dọn
    await prisma.platform_secrets.deleteMany({})
    delete process.env.ZALO_OA_APP_ID
    delete process.env.ZALO_OA_WEBHOOK_SECRET
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("mã liên kết chỉ gắn Zalo vào đúng chi nhánh của đúng tổ chức; nhập Excel lại không xoá liên kết", async () => {
    await addBranch(a, "Q1")
    await addBranch(b, "Q1")
    const [linkA] = await repo.listZaloLinks(a.organizationId)
    const [linkB] = await repo.listZaloLinks(b.organizationId)
    expect(linkA?.linkCode).toMatch(/^ZL[A-Z2-9]{8}$/)
    expect(linkA?.linkCode).not.toBe(linkB?.linkCode)
    // Gọi lại không đổi mã
    expect((await repo.listZaloLinks(a.organizationId))[0]?.linkCode).toBe(linkA?.linkCode)

    const linked = await repo.linkZaloUser(linkA!.linkCode, "zalo-user-1")
    expect(linked?.organizationId).toBe(a.organizationId)
    expect((await repo.findByCode(a.organizationId, "Q1"))?.channels?.zaloUserId).toBe("zalo-user-1")
    expect((await repo.findByCode(a.organizationId, "Q1"))?.channels?.telegramChatId).toBe("tg-Q1")
    expect((await repo.findByCode(b.organizationId, "Q1"))?.channels?.zaloUserId).toBeUndefined()

    await addBranch(a, "Q1")
    expect((await repo.findByCode(a.organizationId, "Q1"))?.channels?.zaloUserId).toBe("zalo-user-1")
  })

  it("webhook sai chữ ký hoặc sự kiện cũ: 401, không liên kết gì", async () => {
    await addBranch(a, "Q1")
    const [link] = await repo.listZaloLinks(a.organizationId)
    const event = {
      app_id: "app-1", event_name: "user_send_text", timestamp: String(Date.now()),
      sender: { id: "attacker" }, message: { text: link!.linkCode },
    }
    expect((await zaloWebhook(signedRequest(event, "sai-khoa"))).status).toBe(401)
    expect((await zaloWebhook(signedRequest({ ...event, timestamp: String(Date.now() - 3_600_000) }))).status).toBe(401)
    expect((await repo.findByCode(a.organizationId, "Q1"))?.channels?.zaloUserId).toBeUndefined()
  })

  it("webhook hợp lệ chứa mã: liên kết chi nhánh", async () => {
    await addBranch(a, "Q1")
    const [link] = await repo.listZaloLinks(a.organizationId)
    const event = {
      app_id: "app-1", event_name: "user_send_text", timestamp: String(Date.now()),
      sender: { id: "zalo-user-2" }, message: { text: `mã ${link!.linkCode}` },
    }
    expect((await zaloWebhook(signedRequest(event))).status).toBe(200)
    expect((await repo.findByCode(a.organizationId, "Q1"))?.channels?.zaloUserId).toBe("zalo-user-2")
  })

  it("làm mới token chạy dưới khoá: hai tiến trình xếp hàng, tiến trình sau thấy giá trị mới", async () => {
    const secrets = new PlatformSecretRepository()
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const first = secrets.withLock("k", async (_cur, save) => { order.push("first-start"); await gate; await save("v1"); order.push("first-end") })
    await new Promise((r) => setTimeout(r, 200))
    const second = secrets.withLock("k", async (cur) => { order.push(`second-saw-${cur}`) })
    await new Promise((r) => setTimeout(r, 200))
    release()
    await Promise.all([first, second])
    expect(order).toEqual(["first-start", "first-end", "second-saw-v1"])
    expect(await prisma.platform_secrets.count()).toBe(1)
  })
})
