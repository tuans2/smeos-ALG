/**
 * Xoá hẳn một tổ chức đã rời nền tảng (ADR-016 D-S5, bước S-3b) — Render shell của smeos-web:
 *   npm run tenant:purge -- --org <id> --operator <email người vận hành>            (chỉ đọc: in số dòng sẽ xoá)
 *   npm run tenant:purge -- --org <id> --operator <email người vận hành> --confirm  (xoá thật)
 * Điều kiện: tổ chức `OFFBOARDING`, đã qua hạn giữ dữ liệu, không có legal hold. Giữ chứng từ ghi sổ và nhật ký, ẩn danh
 * khách trên chứng từ (`src/modules/organization/domain/tenant-purge-policy.ts`). Người vận hành phải có mã `N2`; mỗi lần
 * xoá ghi một dòng `platform_audit_logs`. Sao lưu trước khi chạy `--confirm`. Không in dữ liệu, chỉ in số dòng.
 */
import { asSystemDb } from "@/core/tenancy/db-context"
import { purgeBlockedReason } from "@/modules/organization/domain/tenant-purge-policy"
import { executeTenantPurge, findPurgeTarget, planTenantPurge } from "@/modules/organization/infra/tenant-purge"
import { getUserRepository } from "@/modules/organization/infra/user-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { getPlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? (process.argv[i + 1] ?? null) : null
}

async function main() {
  const organizationId = arg("org")
  const operatorEmail = arg("operator")
  if (!organizationId || !operatorEmail) throw new Error("Cần --org <id> và --operator <email người vận hành>")
  const user = await getUserRepository().findByEmail(operatorEmail.trim().toLowerCase())
  const operator = user ? await getPlatformOperatorRepository().findActiveByUserId(user.id) : null
  if (!user || !operator?.capabilityCodes.includes("N2")) throw new Error("Người vận hành không có quyền N2")

  const now = new Date()
  const blocked = purgeBlockedReason(await findPurgeTarget(organizationId), now)
  if (blocked) throw new Error(blocked)

  const plan = await planTenantPurge(organizationId)
  for (const row of plan) console.log(`${row.table}\t${row.rows}`)
  console.log(`tổng ${plan.reduce((a, r) => a + r.rows, 0)} dòng sẽ xoá ở ${plan.length} bảng`)
  if (!process.argv.includes("--confirm")) return console.log("chỉ đọc — thêm --confirm để xoá (sao lưu trước)")

  const result = await executeTenantPurge(organizationId, now)
  await recordPlatformAuditLog(
    { userId: user.id, capabilities: new Set(operator.capabilityCodes) },
    {
      action: "platform.organization_purged",
      entityType: "organizations",
      entityId: organizationId,
      before: { lifecycle_status: "OFFBOARDING" },
      after: { lifecycle_status: "DELETED", deleted: result.deleted, file_keys_queued: result.fileKeysQueued },
    },
  )
  console.log(`đã xoá ${result.deleted.reduce((a, r) => a + r.rows, 0)} dòng; ${result.fileKeysQueued} tệp vào hàng đợi xoá`)
}

asSystemDb("script:tenant-purge", main).then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
