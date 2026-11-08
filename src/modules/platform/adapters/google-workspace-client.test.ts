import { generateKeyPairSync, createVerify } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

import { GoogleWorkspaceError, createGoogleWorkspaceClient, loadServiceAccount, signServiceAccountJwt } from "./google-workspace-client"

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
const sa = { client_email: "bot@x.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString() }
const env = { GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(sa) }

describe("google-workspace-client", () => {
  it("chưa cấu hình tài khoản dịch vụ → vẫn tải được tệp Drive công khai qua link", async () => {
    const fetch = vi.fn(async (url: string | URL | Request) =>
      new URL(String(url)).hostname === "drive.usercontent.google.com" ? new Response(new Uint8Array([0xff, 0xd8, 0xff])) : new Response("", { status: 500 })
    )
    const client = createGoogleWorkspaceClient({ fetch: fetch as typeof globalThis.fetch, env: {} })
    await expect(client.downloadDriveFile("publicfile01", 100)).resolves.toEqual(new Uint8Array([0xff, 0xd8, 0xff]))
    expect(fetch.mock.calls.some(([u]) => String(u).includes("oauth2"))).toBe(false)
  })

  it("JWT RS256 ký đúng, đủ claim cho luồng service account", () => {
    const jwt = signServiceAccountJwt(sa, 1000)
    const [h, c, sig] = jwt.split(".")
    const v = createVerify("RSA-SHA256")
    v.update(`${h}.${c}`)
    expect(v.verify(publicKey, Buffer.from(sig!, "base64url"))).toBe(true)
    expect(JSON.parse(Buffer.from(c!, "base64url").toString())).toMatchObject({ iss: sa.client_email, iat: 1000, exp: 4600 })
  })

  it("thiếu / hỏng cấu hình → not_configured, không lộ nội dung khoá", () => {
    expect(() => loadServiceAccount({})).toThrow(GoogleWorkspaceError)
    try {
      loadServiceAccount({ GOOGLE_SERVICE_ACCOUNT_JSON: "{bí-mật" })
    } catch (e) {
      expect((e as Error).message).not.toContain("bí-mật")
    }
  })

  it("đọc đúng tab theo gid, lưu mã truy cập, chặn tệp Drive vượt cỡ và id lạ", async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes("oauth2")) return Response.json({ access_token: "t", expires_in: 3600 })
      if (u.includes("fields=")) return Response.json({ sheets: [{ properties: { sheetId: 1, title: "A" } }, { properties: { sheetId: 7, title: "Khảo sát" } }] })
      if (u.includes("/values/")) return Response.json({ values: [["h"], ["x"]] })
      return new Response(new Uint8Array(50), { headers: { "content-length": "50" } })
    })
    const client = createGoogleWorkspaceClient({ fetch: fetch as typeof globalThis.fetch, env })
    await expect(client.readSheet("sid", "7")).resolves.toEqual([["h"], ["x"]])
    expect(fetch.mock.calls.some(([u]) => String(u).includes(encodeURIComponent("'Khảo sát'!A:BW")))).toBe(true)
    await expect(client.downloadDriveFile("abcdefghijkl", 10)).resolves.toBeNull()
    await expect(client.downloadDriveFile("../etc", 100)).resolves.toBeNull()
    expect(fetch.mock.calls.filter(([u]) => String(u).includes("oauth2"))).toHaveLength(1)
  })
})
