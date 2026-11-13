/**
 * Đọc Google Sheets + tải tệp Google Drive bằng Service Account — REST + JWT
 * tự ký (RS256, `node:crypto`), không dùng SDK. Mọi lệnh gọi có hạn thời gian.
 *
 * Thông tin xác thực: env `GOOGLE_SERVICE_ACCOUNT_JSON` (toàn bộ tệp khoá JSON).
 * Không log, không trả khoá ra ngoài.
 */
import { createSign } from "node:crypto"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly"
const TIMEOUT_MS = 20_000

export class GoogleWorkspaceError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "auth" | "request"
  ) {
    super(message)
  }
}

type ServiceAccount = { client_email: string; private_key: string }

export function loadServiceAccount(env: Env = process.env): ServiceAccount {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new GoogleWorkspaceError("Chưa cấu hình tài khoản dịch vụ Google", "not_configured")
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>
    if (parsed.client_email && parsed.private_key) return { client_email: parsed.client_email, private_key: parsed.private_key }
  } catch {
    // rơi xuống lỗi chung — không lặp lại nội dung khoá
  }
  throw new GoogleWorkspaceError("Cấu hình tài khoản dịch vụ Google không hợp lệ", "not_configured")
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url")

/** JWT assertion cho luồng OAuth2 service account (RFC 7523). */
export function signServiceAccountJwt(sa: ServiceAccount, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 })
  )
  const signer = createSign("RSA-SHA256")
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`
}

type FetchLike = typeof fetch

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  if (Number(res.headers.get("content-length")) > maxBytes) return null
  const buf = new Uint8Array(await res.arrayBuffer())
  return buf.length > maxBytes || buf.length === 0 ? null : buf
}
export type Env = Readonly<Record<string, string | undefined>>

export function createGoogleWorkspaceClient(deps: { fetch?: FetchLike; env?: Env; now?: () => number } = {}) {
  const doFetch = deps.fetch ?? fetch
  const now = deps.now ?? Date.now
  let cached: { token: string; expiresAt: number } | null = null

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt - 60_000 > now()) return cached.token
    const sa = loadServiceAccount(deps.env)
    let assertion: string
    try {
      assertion = signServiceAccountJwt(sa, Math.floor(now() / 1000))
    } catch {
      throw new GoogleWorkspaceError("Khoá tài khoản dịch vụ Google không hợp lệ", "not_configured")
    }
    const res = await doFetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new GoogleWorkspaceError(`Google từ chối xác thực (${res.status})`, "auth")
    const body = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!body.access_token) throw new GoogleWorkspaceError("Google không trả mã truy cập", "auth")
    cached = { token: body.access_token, expiresAt: now() + (body.expires_in ?? 3600) * 1000 }
    return cached.token
  }

  async function get(url: string): Promise<Response> {
    const res = await doFetch(url, {
      headers: { authorization: `Bearer ${await accessToken()}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new GoogleWorkspaceError(`Google trả lỗi ${res.status}`, "request")
    return res
  }

  return {
    /** Mọi ô của một tab (theo gid; không có gid thì tab đầu), dạng chuỗi đã định dạng. */
    async readSheet(sheetId: string, gid?: string): Promise<string[][]> {
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`
      const meta = (await (await get(`${base}?fields=sheets.properties(sheetId,title)`)).json()) as {
        sheets?: { properties?: { sheetId?: number; title?: string } }[]
      }
      const tabs = meta.sheets ?? []
      const tab = (gid ? tabs.find((t) => String(t.properties?.sheetId) === gid) : undefined) ?? tabs[0]
      if (!tab?.properties?.title) throw new GoogleWorkspaceError("Không tìm thấy tab dữ liệu trong Sheet", "request")
      const range = encodeURIComponent(`'${tab.properties.title.replace(/'/g, "''")}'!A:BW`)
      const values = (await (await get(`${base}/values/${range}?valueRenderOption=FORMATTED_VALUE`)).json()) as {
        values?: string[][]
      }
      return values.values ?? []
    },

    /**
     * Tải nội dung một tệp Drive; vượt `maxBytes` thì trả null (không nạp quá cỡ).
     * Có tài khoản dịch vụ thì đọc qua API (cả tệp riêng tư được chia sẻ cho nó);
     * chưa cấu hình hoặc API từ chối thì thử link công khai ("ai có link đều xem được").
     * Nội dung trả về có thể là trang HTML của Google — bên gọi phải kiểm nội dung.
     */
    async downloadDriveFile(fileId: string, maxBytes: number): Promise<Uint8Array | null> {
      if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return null
      try {
        const res = await get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`)
        const viaApi = await readCapped(res, maxBytes)
        if (viaApi) return viaApi
      } catch {
        // rơi xuống link công khai
      }
      const res = await doFetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      return res.ok ? readCapped(res, maxBytes) : null
    },
  }
}

export type GoogleWorkspaceClient = ReturnType<typeof createGoogleWorkspaceClient>

let shared: GoogleWorkspaceClient | null = null
export function getGoogleWorkspaceClient(): GoogleWorkspaceClient {
  shared ??= createGoogleWorkspaceClient()
  return shared
}
