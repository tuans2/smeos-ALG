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

describe(".env.example nạp được sau khi điền khoá theo README", () => {
  for (const rel of [".env.example", "releases/gd1/overlay/.env.example"]) {
    it(rel, async () => {
      process.env.DATABASE_URL ??= "postgresql://u:p@localhost:5432/db"
      const { envSchema } = await import("./env")
      const result = envSchema.safeParse({ ...parseEnvFile(path.join(ROOT, rel)), ...FILLED })
      expect(result.success ? [] : result.error.issues.map((i) => i.path.join("."))).toEqual([])
    })
  }

  it("ô chọn-một để trống coi như chưa đặt", async () => {
    const { envSchema } = await import("./env")
    const parsed = envSchema.parse({ DATABASE_URL: "postgresql://u:p@localhost:5432/db", ...FILLED, STORAGE_DELETE_PAYLOADS: "", ALLOW_LOCAL_STORAGE: "", DB_RLS_MODE: "", STORAGE_SIGNING_SECRET: "" })
    expect(parsed.STORAGE_DELETE_PAYLOADS).toBeUndefined()
    expect(parsed.ALLOW_LOCAL_STORAGE).toBeUndefined()
    expect(parsed.DB_RLS_MODE).toBe("off")
    expect(parsed.STORAGE_SIGNING_SECRET).toBeUndefined() // lùi về SESSION_SECRET (storage-signing.ts)
  })
})
