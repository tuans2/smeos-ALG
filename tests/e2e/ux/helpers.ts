import { randomUUID } from "node:crypto"
import type { APIRequestContext, Page } from "@playwright/test"
import { Client } from "pg"

const dbUrl = process.env.DATABASE_URL || "postgresql://alg:alg@localhost:5432/alg"

/**
 * Mỗi tài khoản E2E đóng vai một khách riêng: địa chỉ trong dải TEST-NET (RFC 5737) gửi qua
 * `x-forwarded-for`. Giới hạn đăng ký 20 lượt/giờ/IP của `/api/v1/auth/signup` vẫn giữ nguyên;
 * cả bộ E2E chạy trên một máy nên nếu không tách IP sẽ vượt giới hạn.
 */
export function testClientHeaders(): Record<string, string> {
  const bytes = randomUUID().replace(/-/g, "")
  const net = parseInt(bytes.slice(0, 2), 16) % 2 === 0 ? "198.51.100" : "203.0.113"
  return { "x-forwarded-for": `${net}.${1 + (parseInt(bytes.slice(2, 4), 16) % 254)}` }
}

/**
 * Đăng ký công khai chờ superadmin duyệt (PO 22/10/2026) và không mở phiên. E2E duyệt thẳng trong
 * CSDL test rồi đăng nhập thật, để cookie phiên nằm trong ngữ cảnh của `request`.
 */
export async function approveAndLogin(
  request: APIRequestContext,
  email: string,
  password: string,
  base = "",
  headers: Record<string, string> = testClientHeaders(),
): Promise<void> {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    await client.query("UPDATE users SET approval_status = 'APPROVED', approval_decided_at = now() WHERE email = $1", [email])
  } finally {
    await client.end()
  }
  const res = await request.post(`${base}/api/v1/auth/login`, { headers, data: { email, password } })
  if (!res.ok()) throw new Error(`Login failed after approval: ${res.status()} ${await res.text()}`)
}

export async function createTestUserAndLogin(
  page: Page,
  options?: {
    roleKey?: string
    workspaceKind?: "EXPERIENCE" | "PRODUCTION"
  }
): Promise<{ email: string; orgId: string; userId: string }> {
  const email = `e2e-ux-${randomUUID().slice(0, 8)}@alg.test`
  const password = "MatKhau-E2E-2026!"
  const orgName = `Tiệm E2E UX ${randomUUID().slice(0, 4)}`

  const headers = testClientHeaders()
  const res = await page.request.post("/api/v1/auth/signup", {
    headers,
    data: { email, password, name: "E2E Tester", organization_name: orgName },
  })
  if (!res.ok()) {
    throw new Error(`Signup failed: ${res.status()} ${await res.text()}`)
  }
  const body = (await res.json()) as { organization_id: string; user_id: string }
  await approveAndLogin(page.request, email, password, "", headers)
  const orgId = body.organization_id
  const userId = body.user_id

  if (
    (options?.workspaceKind && options.workspaceKind !== "EXPERIENCE") ||
    (options?.roleKey && options.roleKey !== "dieu_hanh")
  ) {
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    try {
      if (options?.workspaceKind && options.workspaceKind !== "EXPERIENCE") {
        await client.query("UPDATE workspaces SET kind = $1 WHERE organization_id = $2", [
          options.workspaceKind,
          orgId,
        ])
      }
      if (options?.roleKey && options.roleKey !== "dieu_hanh") {
        const roleRes = await client.query(
          "SELECT id FROM roles WHERE key = $1 AND (organization_id = $2 OR organization_id IS NULL) LIMIT 1",
          [options.roleKey, orgId]
        )
        if (roleRes.rows.length > 0) {
          const roleId = roleRes.rows[0].id
          await client.query(
            "UPDATE memberships SET role_id = $1 WHERE organization_id = $2 AND user_id = $3",
            [roleId, orgId, userId]
          )
        }
      }
    } finally {
      await client.end()
    }
  }

  return { email, orgId, userId }
}
