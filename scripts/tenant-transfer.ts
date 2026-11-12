/**
 * Xuất / nhập toàn bộ dữ liệu một tổ chức (ADR-016 D-S3, bước S-2) — Render shell của smeos-web:
 *   npm run tenant:transfer -- export --org <id> --out <tệp.json> --operator <email>
 *   npm run tenant:transfer -- import --file <tệp.json> --operator <email>            (chỉ kiểm gói + phiên bản schema)
 *   npm run tenant:transfer -- import --file <tệp.json> --operator <email> --confirm  (nhập thật, một giao dịch)
 * Người vận hành cần mã `N2`; mỗi lần xuất / nhập ghi `platform_audit_logs`. Gói chứa dữ liệu cá nhân (bản mã) và băm
 * mật khẩu thành viên: lưu như bản sao lưu, xoá sau khi dùng. CSDL đích phải cùng phiên bản schema và cùng khoá chủ
 * `PII_ENCRYPTION_KEY`. Tệp trong kho (`files`) chép riêng. Không in dữ liệu, chỉ in số dòng.
 */
import { readFileSync, writeFileSync } from "node:fs"

import { asSystemDb } from "@/core/tenancy/db-context"
import { exportTenant, type TenantPackage } from "@/modules/organization/infra/tenant-export"
import { importTenant, verifyPackage } from "@/modules/organization/infra/tenant-import"
import { schemaVersion } from "@/modules/organization/infra/tenant-transfer-sources"
import { getUserRepository } from "@/modules/organization/infra/user-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { getPlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? (process.argv[i + 1] ?? null) : null
}

async function operator() {
  const email = arg("operator")
  if (!email) throw new Error("Cần --operator <email người vận hành>")
  const user = await getUserRepository().findByEmail(email.trim().toLowerCase())
  const op = user ? await getPlatformOperatorRepository().findActiveByUserId(user.id) : null
  if (!user || !op?.capabilityCodes.includes("N2")) throw new Error("Người vận hành không có quyền N2")
  return { userId: user.id, capabilities: new Set(op.capabilityCodes) }
}

const summary = (pkg: TenantPackage) => Object.entries(pkg.tables).map(([t, rows]) => `${t}\t${rows.length}`).join("\n")

async function main() {
  const mode = process.argv[2]
  const pctx = await operator()
  if (mode === "export") {
    const org = arg("org")
    const out = arg("out")
    if (!org || !out) throw new Error("Cần --org <id> và --out <tệp.json>")
    const pkg = await exportTenant(org, new Date())
    writeFileSync(out, JSON.stringify(pkg), { mode: 0o600 })
    await recordPlatformAuditLog(pctx, { action: "platform.organization_exported", entityType: "organizations", entityId: org, after: { tables: Object.keys(pkg.tables).length, files: pkg.files.length, schema: pkg.schemaVersion } })
    console.log(`${summary(pkg)}\nđã xuất ${Object.keys(pkg.tables).length} bảng, ${pkg.files.length} tệp cần chép riêng → ${out}`)
    return
  }
  if (mode === "import") {
    const file = arg("file")
    if (!file) throw new Error("Cần --file <tệp.json>")
    const pkg = JSON.parse(readFileSync(file, "utf8")) as TenantPackage
    const bad = verifyPackage(pkg)
    if (bad) throw new Error(bad)
    const target = await schemaVersion()
    if (target !== pkg.schemaVersion) throw new Error(`Khác phiên bản schema: gói ${pkg.schemaVersion}, CSDL đích ${target}`)
    console.log(summary(pkg))
    if (!process.argv.includes("--confirm")) return console.log("gói hợp lệ — thêm --confirm để nhập (sao lưu CSDL đích trước)")
    const result = await importTenant(pkg)
    await recordPlatformAuditLog(pctx, { action: "platform.organization_imported", entityType: "organizations", entityId: pkg.organizationId, after: { inserted: result.inserted, skipped_links: result.skippedLinks, schema: pkg.schemaVersion } })
    console.log(`đã nhập ${result.inserted.reduce((n, r) => n + r.rows, 0)} dòng; bỏ qua ${result.skippedLinks} liên kết tới tổ chức không có ở đây`)
    return
  }
  throw new Error("Dùng: tenant:transfer -- export|import …")
}

asSystemDb("script:tenant-transfer", main).then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
