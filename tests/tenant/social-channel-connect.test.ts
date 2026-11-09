import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { FetchLike } from "@/modules/social-publishing/adapters/http-call"
import { findActiveConnection } from "@/modules/social-publishing/infra/channel-connections"
import { disconnect, finishConnect, listPendingPages, selectFacebookPage, startConnect } from "@/modules/social-publishing/use-cases/connect-channel"
import { listChannelStatuses } from "@/modules/social-publishing/use-cases/manage-posts"
import { refreshConnection } from "@/modules/social-publishing/use-cases/refresh-connection"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Kết nối kênh đăng bài bằng OAuth (Bước 4, PO 08/11/2026 — ứng dụng đăng ký mới): ứng dụng chưa cấu hình → kênh "chưa
 * mở"; `state` mã hoá gắn tổ chức + người + hạn; Facebook một Trang → kết nối luôn (kèm Instagram), nhiều Trang → chờ
 * chọn; Zalo/TikTok PKCE; làm mới token Zalo (dùng một lần) an toàn khi hai tiến trình cùng làm. Nền tảng giả lập.
 */
const ENV_KEYS = ["META_APP_ID", "META_APP_SECRET", "ZALO_SOCIAL_APP_ID", "ZALO_SOCIAL_APP_SECRET", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "PUBLIC_APP_URL"] as const
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

function fake(routes: Array<[RegExp, unknown]>): { fn: FetchLike; urls: string[] } {
  const urls: string[] = []
  const fn: FetchLike = async (url) => {
    urls.push(url)
    const hit = routes.find(([re]) => re.test(url))
    if (!hit) throw new Error(`không có phản hồi giả cho ${url}`)
    return new Response(JSON.stringify(hit[1]), { status: 200, headers: { "content-type": "application/json" } })
  }
  return { fn, urls }
}

describe("kết nối kênh đăng bài", () => {
  let a: Tenant
  let b: Tenant
  const can = (t: Tenant, codes = ["W2", "J5"]): TenantContext => ({ ...t.ctx, capabilities: new Set(codes) })
  const stateOf = (url: string) => new URL(url).searchParams.get("state") ?? ""

  beforeEach(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    Object.assign(process.env, {
      META_APP_ID: "meta-app", META_APP_SECRET: "meta-secret", ZALO_SOCIAL_APP_ID: "zalo-app", ZALO_SOCIAL_APP_SECRET: "zalo-secret",
      TIKTOK_CLIENT_KEY: "tt-key", TIKTOK_CLIENT_SECRET: "tt-secret", PUBLIC_APP_URL: "https://app.smeos.test",
    })
    await resetDatabase()
    a = await createTenant("cc-a")
    b = await createTenant("cc-b")
  })
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })
  afterAll(async () => disconnectDatabase())

  const pagesResponse = (n: number) => ({
    data: Array.from({ length: n }, (_, i) => ({
      id: `page-${i}`, name: `Trang ${i}`, access_token: `page-token-${i}`,
      ...(i === 0 ? { instagram_business_account: { id: "ig-0", username: "cuahang" } } : {}),
    })),
  })

  it("ứng dụng chưa cấu hình → kênh chưa mở; đã cấu hình → link đồng ý có state, đúng địa chỉ gọi về", async () => {
    delete process.env.TIKTOK_CLIENT_KEY
    await expect(startConnect(can(a), "tiktok")).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("chưa mở") })
    expect((await listChannelStatuses(can(a))).find((c) => c.channel === "tiktok")?.app_configured).toBe(false)

    const { authorize_url } = await startConnect(can(a), "instagram")
    const u = new URL(authorize_url)
    expect(u.hostname).toBe("www.facebook.com")
    expect(u.searchParams.get("redirect_uri")).toBe("https://app.smeos.test/api/v1/social-publishing/channels/facebook/callback")
    expect(u.searchParams.get("scope")).toContain("instagram_content_publish")
    expect(new URL((await startConnect(can(a), "zalo")).authorize_url).searchParams.get("code_challenge")).toBeTruthy()
    await expect(startConnect(can(a, ["J5"]), "zalo")).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })

  it("Facebook một Trang → kết nối Facebook + Instagram ngay; state của tổ chức khác / người khác bị từ chối", async () => {
    const { authorize_url } = await startConnect(can(a), "facebook")
    const f = fake([[/oauth\/access_token/, { access_token: "user-token" }], [/me\/accounts/, pagesResponse(1)]])
    const r = await finishConnect(can(a), "facebook", { code: "c1", state: stateOf(authorize_url), error: null }, f.fn)
    expect(r).toEqual({ connected: ["facebook", "instagram"] })
    expect((await findActiveConnection(a.organizationId, "facebook"))?.bundle.access_token).toBe("page-token-0")
    expect((await findActiveConnection(a.organizationId, "instagram"))?.accountId).toBe("ig-0")
    expect(JSON.stringify(f.urls)).not.toContain("page-token-0")

    await expect(finishConnect(can(b), "facebook", { code: "c1", state: stateOf(authorize_url), error: null }, f.fn)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(finishConnect(can(a), "facebook", { code: "c1", state: "gia-mao", error: null }, f.fn)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(finishConnect(can(a), "facebook", { code: null, state: stateOf(authorize_url), error: "access_denied" }, f.fn)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(await findActiveConnection(b.organizationId, "facebook")).toBeNull()
  })

  it("Facebook nhiều Trang → chờ chọn (không lộ token), chọn xong thì kết nối đúng Trang; ngắt kết nối xoá khoá", async () => {
    const { authorize_url } = await startConnect(can(a), "facebook")
    const f = fake([[/oauth\/access_token/, { access_token: "user-token" }], [/me\/accounts/, pagesResponse(2)]])
    const r = await finishConnect(can(a), "facebook", { code: "c", state: stateOf(authorize_url), error: null }, f.fn)
    expect(r).toEqual({ pending_pages: [{ id: "page-0", name: "Trang 0", has_instagram: true }, { id: "page-1", name: "Trang 1", has_instagram: false }] })
    expect(JSON.stringify(await listPendingPages(can(a)))).not.toContain("token")
    expect(await listPendingPages(can(b))).toEqual([])
    expect(await findActiveConnection(a.organizationId, "facebook")).toBeNull()

    expect(await selectFacebookPage(can(a), "page-1")).toEqual({ connected: ["facebook"] })
    expect((await findActiveConnection(a.organizationId, "facebook"))?.accountId).toBe("page-1")
    expect(await listPendingPages(can(a))).toEqual([])

    await disconnect(can(a), "facebook")
    expect(await findActiveConnection(a.organizationId, "facebook")).toBeNull()
    const rows = await prisma.integration_connections.findMany({ where: { organization_id: a.organizationId, connector_key: "social_facebook" } })
    expect(rows.every((r) => r.credential_encrypted === null)).toBe(true)
  })

  it("Zalo: đổi mã có PKCE + đọc OA; làm mới token dùng-một-lần an toàn khi tiến trình khác đã làm mới trước", async () => {
    const { authorize_url } = await startConnect(can(a), "zalo")
    const now = new Date()
    const f = fake([
      [/oa\/access_token/, { access_token: "zalo-access-1", refresh_token: "zalo-refresh-1", expires_in: 90_000 }],
      [/oa\/getoa/, { error: 0, data: { oa_id: "oa-9", name: "Cửa hàng OA" } }],
    ])
    expect(await finishConnect(can(a), "zalo", { code: "z", state: stateOf(authorize_url), error: null }, f.fn, now)).toEqual({ connected: ["zalo"] })
    const conn = (await findActiveConnection(a.organizationId, "zalo"))!
    expect(conn).toMatchObject({ accountId: "oa-9", displayName: "Cửa hàng OA" })

    const refreshed = await refreshConnection(conn, fake([[/oa\/access_token/, { access_token: "zalo-access-2", refresh_token: "zalo-refresh-2", expires_in: 90_000 }]]).fn)
    expect(refreshed).toMatchObject({ access_token: "zalo-access-2", refresh_token: "zalo-refresh-2" })
    // Tiến trình thứ hai cầm bản cũ (`conn`) làm mới muộn: không ghi đè, dùng khoá bản đã lưu
    const late = await refreshConnection(conn, fake([[/oa\/access_token/, { access_token: "zalo-access-3", refresh_token: "zalo-refresh-3", expires_in: 90_000 }]]).fn)
    expect(late?.access_token).toBe("zalo-access-2")
    expect((await findActiveConnection(a.organizationId, "zalo"))?.bundle.refresh_token).toBe("zalo-refresh-2")
  })

  it("TikTok: đổi mã lấy open_id + tên tài khoản", async () => {
    const { authorize_url } = await startConnect(can(a), "tiktok")
    const f = fake([
      [/oauth\/token/, { access_token: "tt-access", refresh_token: "tt-refresh", expires_in: 86_400, refresh_expires_in: 31_536_000, open_id: "open-1" }],
      [/user\/info/, { data: { user: { display_name: "Cửa hàng TT" } } }],
    ])
    expect(await finishConnect(can(a), "tiktok", { code: "t", state: stateOf(authorize_url), error: null }, f.fn)).toEqual({ connected: ["tiktok"] })
    expect(await findActiveConnection(a.organizationId, "tiktok")).toMatchObject({ accountId: "open-1", displayName: "Cửa hàng TT" })
  })
})
