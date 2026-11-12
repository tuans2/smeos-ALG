import { prisma } from "@/core/tenancy/infra/prisma"
import { setPurgeReason } from "@/core/tenancy/infra/purge-reason"
import { eraseCustomerDataIn } from "@/modules/crm/infra/customer-erasure"

import type { Row, TenantPackage } from "./tenant-export"
import { checkTarget, IMPORT_TX, importPackage, type ImportResult } from "./tenant-import"
import { TRANSFER_SOURCES } from "./tenant-transfer-sources"

/**
 * Khôi phục riêng một tổ chức (ADR-016 D-S4, bước S-4) từ gói xuất của CSDL khôi phục PITR — một giao dịch trên CSDL
 * đích: xoá dữ liệu hiện tại của tổ chức (`app.purge_reason = tenant_restore`, kể cả chứng từ và nhật ký — chúng có lại
 * từ gói), nhập gói, rồi chạy lại các yêu cầu xoá dữ liệu cá nhân có sau mốc khôi phục (ADR-014 D-P5) để dữ liệu khách
 * đã xin xoá không sống lại. Người dùng (bảng chung) không xoá; liên kết với tổ chức khác nhập lại khi tổ chức kia còn.
 */
export interface RestoreResult extends ImportResult { reErased: number }

export async function restoreTenant(pkg: TenantPackage, now: Date): Promise<RestoreResult> {
  return prisma.$transaction(async (tx) => {
    if (!(await checkTarget(tx, pkg))) throw new Error("Tổ chức chưa có ở CSDL đích — dùng nhập (import), không phải khôi phục")
    await setPurgeReason(tx, "tenant_restore")
    const org = pkg.organizationId

    // Yêu cầu xoá dữ liệu cá nhân ở hiện tại mà gói (cũ hơn) chưa có — giữ để chạy lại sau khi nhập.
    const inPackage = new Set((pkg.tables["data_subject_requests"] ?? []).map((r) => r["id"]))
    const current = await tx.$queryRawUnsafe<Array<{ r: Row }>>(
      `SELECT to_jsonb(d) AS r FROM "data_subject_requests" d WHERE organization_id = $1 AND type = 'ERASE'`, org)
    const later = current.map((x) => x.r).filter((r) => !inPackage.has(r["id"]))

    for (const { table, where } of [...TRANSFER_SOURCES].reverse()) {
      if (table === "users") continue
      await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE ${where}`, org)
    }
    const result = await importPackage(tx, pkg)

    let reErased = 0
    for (const request of later) {
      const customerId = request["customer_id"]
      const exists = typeof customerId === "string"
        && (await tx.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "customers" WHERE organization_id = $1 AND id = $2`, org, customerId))[0]?.n
      await tx.$executeRawUnsafe(
        `INSERT INTO "data_subject_requests" SELECT r.* FROM jsonb_populate_recordset(NULL::"data_subject_requests", $1::jsonb) r`,
        JSON.stringify([{ ...request, customer_id: exists ? customerId : null }]),
      )
      if (exists) {
        await eraseCustomerDataIn(tx, org, customerId as string, now)
        reErased++
      }
    }
    return { ...result, reErased }
  }, IMPORT_TX)
}
