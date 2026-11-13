import { withCircuitBreaker } from "@/core/http/circuit-breaker"
import { log } from "@/core/observability/log"
import type { FetchLike } from "../zalo-zns-adapter"

/**
 * Zalo OA CHUNG của nền tảng — gửi tin tư vấn (CS message) cho nhân viên chi nhánh đã theo dõi OA.
 * Tài liệu: https://developers.zalo.me/docs/official-account
 *
 * Giới hạn của Zalo: chỉ gửi được cho người đã quan tâm OA và tương tác trong 7 ngày gần nhất
 * (ngoài cửa sổ đó Zalo từ chối — kênh khác vẫn chạy). Access token sống ~25 giờ; refresh token
 * dùng MỘT lần, nên việc làm mới chạy dưới khoá dòng (`IZaloTokenVault.withLock`).
 */

export interface ZaloOaTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
}

export interface IZaloTokenVault {
  read(): Promise<ZaloOaTokens | null>
  withLock<T>(fn: (current: ZaloOaTokens | null, save: (tokens: ZaloOaTokens) => Promise<void>) => Promise<T>): Promise<T>
}

export interface ZaloOaConfig {
  appId: string | undefined
  appSecret: string | undefined
  /** Refresh token ban đầu (lấy khi cấp quyền OA cho app) — chỉ dùng khi kho chưa có token */
  bootstrapRefreshToken: string | undefined
}

export function zaloOaConfigFromEnv(): ZaloOaConfig {
  return {
    appId: process.env.ZALO_OA_APP_ID,
    appSecret: process.env.ZALO_OA_APP_SECRET,
    bootstrapRefreshToken: process.env.ZALO_OA_REFRESH_TOKEN,
  }
}

const SEND_URL = "https://openapi.zalo.me/v3.0/oa/message/cs"
const TOKEN_URL = "https://oauth.zaloapp.com/v4/oa/access_token"
/** Mã lỗi Zalo báo access token sai / hết hạn → làm mới rồi thử lại đúng một lần */
const TOKEN_ERRORS = new Set([-124, -216, -14014])
/** Làm mới sớm trước khi hết hạn để không gửi bằng token sắp chết */
const REFRESH_MARGIN_MS = 5 * 60 * 1000

export interface ZaloSendResult {
  sent: boolean
  msgId?: string | null
  error?: string
}

export class ZaloOaPlatformClient {
  constructor(
    private readonly vault: IZaloTokenVault,
    private readonly config: ZaloOaConfig = zaloOaConfigFromEnv(),
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => number = Date.now
  ) {}

  get configured(): boolean {
    return Boolean(this.config.appId && this.config.appSecret)
  }

  async sendText(zaloUserId: string, text: string): Promise<ZaloSendResult> {
    if (!this.configured) return { sent: false, error: "Chưa cấu hình Zalo OA của nền tảng" }
    try {
      let tokens = await this.vault.read()
      if (!tokens || this.expiring(tokens)) tokens = await this.refresh(tokens)
      let res = await this.post(tokens.accessToken, zaloUserId, text)
      if (TOKEN_ERRORS.has(res.error)) {
        tokens = await this.refresh(tokens, true)
        res = await this.post(tokens.accessToken, zaloUserId, text)
      }
      if (res.error !== 0) {
        log.warn("zalo_oa.send_failed", { code: res.error, message: res.message })
        return { sent: false, error: res.message ?? `Zalo từ chối (${res.error})` }
      }
      return { sent: true, msgId: res.msgId ?? null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn("zalo_oa.send_exception", { error: message })
      return { sent: false, error: message }
    }
  }

  private expiring(tokens: ZaloOaTokens): boolean {
    return new Date(tokens.accessTokenExpiresAt).getTime() - this.now() < REFRESH_MARGIN_MS
  }

  /**
   * Làm mới dưới khoá. Nếu tiến trình khác vừa làm mới (token trong kho khác token ta đang cầm
   * và chưa sắp hết hạn) thì dùng luôn token đó — không đốt refresh token lần nữa.
   */
  private async refresh(stale: ZaloOaTokens | null, force = false): Promise<ZaloOaTokens> {
    return this.vault.withLock(async (current, save) => {
      const someoneElseRefreshed = current && current.accessToken !== stale?.accessToken
      if (current && !this.expiring(current) && (!force || someoneElseRefreshed)) return current
      const refreshToken = current?.refreshToken || this.config.bootstrapRefreshToken
      if (!refreshToken) throw new Error("Chưa có refresh token Zalo OA — cần cấp quyền OA cho ứng dụng")
      const next = await this.callRefresh(refreshToken)
      await save(next)
      return next
    })
  }

  private async callRefresh(refreshToken: string): Promise<ZaloOaTokens> {
    return withCircuitBreaker("zalo-oa-token", async (signal) => {
      const res = await this.fetchImpl(TOKEN_URL, {
        method: "POST",
        signal,
        headers: { secret_key: this.config.appSecret ?? "", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ refresh_token: refreshToken, app_id: this.config.appId ?? "", grant_type: "refresh_token" }).toString(),
      })
      const json = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: string | number }
      if (!res.ok || !json.access_token || !json.refresh_token) throw new Error("Không làm mới được access token Zalo OA — cần cấp quyền lại")
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        accessTokenExpiresAt: new Date(this.now() + Number(json.expires_in ?? 90_000) * 1000).toISOString(),
      }
    })
  }

  private async post(accessToken: string, userId: string, text: string): Promise<{ error: number; message?: string; msgId?: string }> {
    return withCircuitBreaker("zalo-oa-send", async (signal) => {
      const res = await this.fetchImpl(SEND_URL, {
        method: "POST",
        signal,
        headers: { access_token: accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { user_id: userId }, message: { text: text.slice(0, 2000) } }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: number; message?: string; data?: { message_id?: string } }
      return {
        error: json.error ?? (res.ok ? 0 : -1),
        ...(json.message ? { message: json.message } : {}),
        ...(json.data?.message_id ? { msgId: json.data.message_id } : {}),
      }
    })
  }
}
