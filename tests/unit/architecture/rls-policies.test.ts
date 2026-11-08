import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { rlsSettingsFor, tenantTablesIn } from "@/core/tenancy/infra/rls-pool"
import { dbContextForPath } from "@/core/tenancy/db-context"

/**
 * Checklist ALG 1.18, ADR-013 D-I2: mọi bảng thuộc tổ chức (sổ bảng-thuộc-tenant) có chính sách RLS trong migration.
 * Thêm bảng có `organization_id` mà quên chính sách → đỏ; sinh SQL bằng `node scripts/gen-rls-policies.mjs`.
 */
const ROOT = path.resolve(__dirname, "../../..")

describe("RLS theo tổ chức", () => {
  it("mọi bảng thuộc tổ chức đã có chính sách tenant_isolation", () => {
    const out = execFileSync("node", [path.join(ROOT, "scripts/gen-rls-policies.mjs")], { encoding: "utf8" })
    expect(out.trim()).toBe("-- Mọi bảng thuộc tổ chức đã có chính sách RLS.")
  })

  it("biến phiên theo ngữ cảnh: tổ chức, hệ thống, chưa gắn, ngoài request", () => {
    expect(rlsSettingsFor({ kind: "tenant", organizationId: "org-a" }, "enforce")).toEqual({ orgId: "org-a", system: "", mode: "enforce" })
    expect(rlsSettingsFor({ kind: "system", label: "x" }, "enforce")).toEqual({ orgId: "", system: "on", mode: "enforce" })
    expect(rlsSettingsFor({ kind: "pending" }, "enforce")).toEqual({ orgId: "", system: "", mode: "enforce" })
    expect(rlsSettingsFor(undefined, "audit").system).toBe("on")
  })

  it("nhận ra bảng thuộc tổ chức trong SQL của Prisma và SQL thô", () => {
    expect(tenantTablesIn('SELECT "public"."customers"."id" FROM "public"."customers" WHERE 1=1')).toEqual(["customers"])
    expect(tenantTablesIn("UPDATE usage_limits SET used = used + 1")).toEqual(["usage_limits"])
    expect(tenantTablesIn('SELECT 1 FROM "public"."organizations"')).toEqual([])
  })

  it("đường dẫn không thuộc một tổ chức chạy quyền hệ thống; còn lại chờ gắn tổ chức", () => {
    expect(dbContextForPath("/api/v1/public/greeting-catalog/x/order").kind).toBe("system")
    expect(dbContextForPath("/api/v1/platform/organizations").kind).toBe("system")
    expect(dbContextForPath("/api/v1/organizations").kind).toBe("system")
    expect(dbContextForPath("/api/v1/organizations/current").kind).toBe("pending")
    expect(dbContextForPath("/api/v1/orders").kind).toBe("pending")
  })

  it("route Console (requirePlatformContext) ở bất kỳ đâu cũng chạy quyền hệ thống (I-5: 0 vi phạm ghi nhận)", () => {
    const api = path.join(ROOT, "src/app")
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const full = path.join(dir, e)
        return statSync(full).isDirectory() ? walk(full) : e === "route.ts" ? [full] : []
      })
    const pending = walk(path.join(api, "api"))
      .filter((file) => /\brequirePlatformContext\(/.test(readFileSync(file, "utf8")))
      .map((file) => "/" + path.relative(api, path.dirname(file)).split(path.sep).join("/"))
      .filter((route) => dbContextForPath(route).kind !== "system")
    expect(pending).toEqual([])
  })
})
