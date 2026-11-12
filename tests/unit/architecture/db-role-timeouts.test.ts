import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * ADR-015 D-O5, bước O-8: giới hạn truy vấn đặt ở mức tài khoản CSDL (`scripts/db/create-roles.sql`) — 15 s cho web,
 * 120 s cho worker / hệ thống / chỉ đọc, giao dịch bỏ ngỏ bị cắt sau 60 s. Thao tác dài có chủ đích tự nâng trong giao dịch.
 */
const sql = readFileSync(path.join(process.cwd(), "scripts/db/create-roles.sql"), "utf8")
const setting = (role: string, name: string) => sql.match(new RegExp(`ALTER ROLE ${role} SET ${name} = '([^']+)'`))?.[1]

describe("giới hạn truy vấn theo tài khoản CSDL", () => {
  it("đúng giá trị ADR-015 D-O5", () => {
    expect(setting("alg_app", "statement_timeout")).toBe("15s")
    for (const role of ["alg_worker", "alg_system", "alg_readonly"]) expect(setting(role, "statement_timeout")).toBe("120s")
    for (const role of ["alg_app", "alg_worker", "alg_system", "alg_readonly"]) {
      expect(setting(role, "idle_in_transaction_session_timeout")).toBe("60s")
    }
  })

  it("thao tác dài chạy bằng alg_system tự nâng giới hạn trong giao dịch", () => {
    for (const file of ["src/modules/organization/infra/tenant-import.ts", "src/modules/organization/infra/tenant-purge.ts"]) {
      expect(readFileSync(path.join(process.cwd(), file), "utf8")).toContain("SET LOCAL statement_timeout")
    }
  })
})
