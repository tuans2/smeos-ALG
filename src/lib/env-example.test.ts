import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * `.env.example` sau khi chép và điền khoá bí mật như README hướng dẫn phải nạp được (Bước 6 bàn giao GD1:
 * ô để trống `STORAGE_DELETE_PAYLOADS=` từng chặn `npm run db:seed` trên máy dựng mới). Áp cho cả smeOS và
 * lớp phủ của bản giao.
 */
const ROOT = path.resolve(__dirname, "../..")

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)=(.*)$/.exec(line)
    if (!m) continue
    out[m[1]!] = m[2]!.trim().replace(/^"(.*)"$/, "$1")
  }
  return out
}

// Giá trị giả cho các ô README bảo điền — không phải khoá thật
const FILLED = { SESSION_SECRET: "x".repeat(32), INTEGRATION_TOKEN_SECRET: "y".repeat(32), SSO_SESSION_SECRET: "z".repeat(32) }

// `./env` kiểm `process.env` ngay lúc nạp module: máy không có `.env` (bản cắt mới dựng) cần sẵn các ô bắt buộc
const REQUIRED = { DATABASE_URL: "postgresql://u:p@localhost:5432/db", ...FILLED }
for (const [k, v] of Object.entries(REQUIRED)) process.env[k] ||= v

describe(".env.example nạp được sau khi điền khoá theo README", () => {
  const files = [".env.example"]
  for (const rel of files) {
    it(rel, async () => {
      const { envSchema } = await import("./env")
      const result = envSchema.safeParse({ ...parseEnvFile(path.join(ROOT, rel)), ...FILLED })
      expect(result.success ? [] : result.error.issues.map((i) => i.path.join("."))).toEqual([])
    })
  }

  // Ứng viên 3 bàn giao GD1: lớp phủ còn trỏ tài khoản CSDL cũ nên `npm run db:deploy` theo README bị từ chối đăng nhập
  for (const rel of files) {
    it(`${rel} trỏ đúng CSDL mà docker-compose.yml dựng`, () => {
      const compose = readFileSync(path.join(ROOT, "docker-compose.yml"), "utf8")
      const pick = (key: string) => new RegExp(`${key}:\\s*(\\S+)`).exec(compose)?.[1]
      const port = /"(\d+):5432"/.exec(compose)?.[1]
      const base = `postgresql://${pick("POSTGRES_USER")}:${pick("POSTGRES_PASSWORD")}@localhost:${port}/${pick("POSTGRES_DB")}`
      const env = parseEnvFile(path.join(ROOT, rel))
      expect(env.DATABASE_URL).toBe(base)
      expect(env.DATABASE_URL_TEST).toBe(`${base}_test`)
    })
  }

  it("ô chọn-một để trống coi như chưa đặt", async () => {
    const { envSchema } = await import("./env")
    const parsed = envSchema.parse({ ...REQUIRED, STORAGE_DELETE_PAYLOADS: "", ALLOW_LOCAL_STORAGE: "", DB_RLS_MODE: "", STORAGE_SIGNING_SECRET: "" })
    expect(parsed.STORAGE_DELETE_PAYLOADS).toBeUndefined()
    expect(parsed.ALLOW_LOCAL_STORAGE).toBeUndefined()
    expect(parsed.DB_RLS_MODE).toBe("off")
    expect(parsed.STORAGE_SIGNING_SECRET).toBeUndefined() // lùi về SESSION_SECRET (storage-signing.ts)
  })
})
