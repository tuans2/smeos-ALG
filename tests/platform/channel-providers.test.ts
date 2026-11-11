import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/platform/_contracts/responses-config"
import { GET as listProviders, PUT as saveProvider } from "@/app/api/v1/platform/notification/providers/route"
import { POST as testProvider } from "@/app/api/v1/platform/notification/providers/test/route"
import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Sổ nhà cung cấp kênh liên lạc (checklist 4.30): đăng ký một lần ở tầng Mẹ, khoá bí mật không bao giờ trả lại,
 * chỉ người vận hành có `N2` đọc/ghi. Giá trị khoá trong test là chuỗi giả.
 */
const URL = "http://localhost/api/v1/platform/notification/providers"
const FAKE_KEY = "khoa-gia"

describe("sổ nhà cung cấp kênh liên lạc — Console tầng Mẹ", () => {
  let op: Tenant
  let thieuQuyen: Tenant
  let shop: Tenant
  const put = (t: Tenant, body: unknown) => saveProvider(withSession(URL, t.token, { method: "PUT", body: JSON.stringify(body) }))

  beforeAll(async () => {
    await resetDatabase()
    op = await createTenant("van-hanh-kenh")
    thieuQuyen = await createTenant("van-hanh-thieu-n2")
    shop = await createTenant("tiem-kenh")
    await new PlatformOperatorRepository().grant(op.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)
    await new PlatformOperatorRepository().grant(thieuQuyen.userId, ["N1"], null)
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đăng ký SMS: khoá được niêm phong, phản hồi chỉ báo đã có khoá, không trả nguyên văn", async () => {
    const res = await put(op, { channel: "SMS", provider: "esms", values: { apiKey: FAKE_KEY, secretKey: FAKE_KEY, brandname: "HOAMAU" } })
    const saved = (await expectContract(res, 200, R.channelProviderSavedResponse, "provider-saved")).data
    expect(JSON.stringify(saved)).not.toContain(FAKE_KEY)
    expect(saved).toMatchObject({ provider: "esms", configured: true, values: { brandname: "HOAMAU" }, secretsSet: { apiKey: true, secretKey: true } })

    const row = await prisma.platform_secrets.findUnique({ where: { key: "notification_provider:SMS" } })
    expect(row?.sealed_value).toBeTruthy()
    expect(row?.sealed_value).not.toContain(FAKE_KEY)

    const list = await expectContract(await listProviders(withSession(URL, op.token)), 200, R.channelProvidersResponse, "providers")
    expect(JSON.stringify(list)).not.toContain(FAKE_KEY)
  })

  it("sửa ô thường, để trống ô bí mật → giữ khoá cũ; thiếu ô bắt buộc lần đầu → 400", async () => {
    const res = await put(op, { channel: "SMS", provider: "esms", values: { brandname: "HOAMAU2" } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { configured: boolean; values: Record<string, string> } }
    expect(body.data).toMatchObject({ configured: true, values: { brandname: "HOAMAU2" } })

    const missing = await put(op, { channel: "ZALO", provider: "zalo_zns", values: { appId: "123" } })
    expect(missing.status).toBe(400)
    const wrongProvider = await put(op, { channel: "ZALO", provider: "esms", values: {} })
    expect(wrongProvider.status).toBe(400)
  })

  it("Web Push chưa kết nối: tin thử trả NOT_CONFIGURED, không báo thành công", async () => {
    const res = await testProvider(withSession(`${URL}/test`, op.token, { method: "POST", body: JSON.stringify({ channel: "PUSH" }) }))
    const data = (await expectContract(res, 200, R.channelProviderTestResponse, "provider-test")).data
    expect(data).toMatchObject({ channel: "PUSH", success: false, error: "NOT_CONFIGURED" })
  })

  it("Web Push: chỉ nhập liên hệ → hệ thống tự tạo cặp khoá VAPID; khoá riêng không trả lại; cặp lệch → 400", async () => {
    const res = await put(op, { channel: "PUSH", provider: "vapid", values: { subject: "mailto:van-hanh@example.com" } })
    const saved = (await expectContract(res, 200, R.channelProviderSavedResponse, "provider-saved")).data as { configured: boolean; values: Record<string, string>; secretsSet: Record<string, boolean> }
    expect(saved.configured).toBe(true)
    expect(saved.values.publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/)
    expect(saved.secretsSet.privateKey).toBe(true)
    expect(Object.keys(saved.values)).not.toContain("privateKey")

    const again = await put(op, { channel: "PUSH", provider: "vapid", values: { subject: "mailto:khac@example.com" } })
    expect(((await again.json()) as { data: { values: Record<string, string> } }).data.values.publicKey).toBe(saved.values.publicKey)

    const mismatch = await put(op, { channel: "PUSH", provider: "vapid", values: { subject: "mailto:van-hanh@example.com", publicKey: "BAAA", privateKey: "khoa-gia" } })
    expect(mismatch.status).toBe(400)
  })

  it("SMS / Zalo gửi thử thiếu số điện thoại → 400", async () => {
    const res = await testProvider(withSession(`${URL}/test`, op.token, { method: "POST", body: JSON.stringify({ channel: "SMS" }) }))
    expect(res.status).toBe(400)
  })

  it("gỡ nhà cung cấp → kênh quay về chưa cấu hình", async () => {
    const res = await put(op, { channel: "SMS", provider: null, values: {} })
    const body = (await res.json()) as { data: { provider: string | null; configured: boolean } }
    expect(body.data).toMatchObject({ provider: null, configured: false })
  })

  it("thiếu N2 hoặc không phải người vận hành → 403, không đọc được cấu hình", async () => {
    for (const t of [thieuQuyen, shop]) {
      const res = await listProviders(withSession(URL, t.token))
      expect(res.status).toBe(403)
      expect((await put(t, { channel: "SMS", provider: null, values: {} })).status).toBe(403)
    }
  })
})
