/**
 * Phiên đăng nhập và dữ liệu đầu vào cho scripts/measure-web-vitals.ts.
 * Chỉ chạy trên database đo (bản build cục bộ hoặc staging), không chạy trên production.
 */
import { randomUUID } from "node:crypto"
import type { Browser, BrowserContext } from "@playwright/test"
import type { Client } from "pg"

const PLATFORM_CODES = ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N12", "N13", "N14", "N15", "N16", "N17", "N18"]

/** Cookie phiên và localStorage dùng lại cho mọi lần đo. */
export type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>

export type MeasureAccount = { kind: "env" | "signup"; platformOperator: boolean }

/** Đăng nhập (PERF_EMAIL/PERF_PASSWORD hoặc tài khoản đăng ký mới) và trả về storageState có cookie phiên. */
export async function loginStorageState(
  browser: Browser,
  base: string,
  db: Client,
  grantPlatform: boolean,
): Promise<{ storageState: StorageState; account: MeasureAccount }> {
  const context = await browser.newContext()
  const request = context.request
  let email = process.env.PERF_EMAIL
  let password = process.env.PERF_PASSWORD
  const kind: MeasureAccount["kind"] = email && password ? "env" : "signup"

  if (!email || !password) {
    email = `perf-${randomUUID().slice(0, 8)}@alg.test`
    password = `Perf-${randomUUID()}`
    const res = await request.post(`${base}/api/v1/auth/signup`, {
      data: { email, password, name: "Đo hiệu năng", organization_name: `Cửa hàng đo ${randomUUID().slice(0, 4)}` },
    })
    if (!res.ok()) throw new Error(`Đăng ký thất bại: ${res.status()}`)
    await db.query("UPDATE users SET approval_status = 'APPROVED', approval_decided_at = now() WHERE email = $1", [email])
  }

  if (grantPlatform) {
    const user = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email])
    const userId = user.rows[0]?.id
    if (!userId) throw new Error("Không tìm thấy tài khoản đo trong database")
    const op = await db.query<{ id: string }>(
      `INSERT INTO platform_operators (id, user_id, created_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL RETURNING id`,
      [randomUUID(), userId],
    )
    for (const code of PLATFORM_CODES) {
      await db.query(
        `INSERT INTO platform_role_capabilities (id, operator_id, capability_code) VALUES ($1, $2, $3)
         ON CONFLICT (operator_id, capability_code) DO NOTHING`,
        [randomUUID(), op.rows[0]!.id, code],
      )
    }
  }

  const login = await request.post(`${base}/api/v1/auth/login`, { data: { email, password } })
  if (!login.ok()) throw new Error(`Đăng nhập thất bại: ${login.status()}`)
  const storageState = await context.storageState()
  await context.close()
  return { storageState, account: { kind, platformOperator: grantPlatform } }
}

/** Một mã gửi bộ sưu tập còn mở (chưa thu hồi, chưa hết hạn) để đo trang công khai `/b/[sendCode]`. */
export async function pickSendCode(db: Client): Promise<string | null> {
  const res = await db.query<{ send_code: string }>(
    `SELECT send_code FROM greeting_sessions
     WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC LIMIT 1`,
  )
  return res.rows[0]?.send_code ?? null
}
