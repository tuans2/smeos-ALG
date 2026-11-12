import type { TenantContext } from "@/core/tenancy"
import { TABLES_CHILD_FIRST, TENANT_SCOPED_TABLES } from "@/core/tenancy/generated/tenant-table-registry"
import { prisma } from "@/core/tenancy/infra/prisma"
import { setPurgeReason } from "@/core/tenancy/infra/purge-reason"
import { payloadKeysToPurge } from "@/modules/assets/domain/payload-deletion"
import { enqueuePayloadDeletes } from "@/modules/assets/infra/payload-outbox"
import { Prisma } from "@/generated/prisma/client"

import {
  ERASED_CUSTOMER_NAME,
  ERASED_MARKER,
  PURGE_KEEP_TABLES,
  PURGE_KEEP_WITH_PAID_ORDERS,
  purgeBlockedReason,
} from "../domain/tenant-purge-policy"

/**
 * Xoá hẳn một tổ chức theo sổ bảng-thuộc-tenant (ADR-016 D-S5, bước S-3b) — luật ở `../domain/tenant-purge-policy.ts`.
 * Một giao dịch, đặt `app.purge_reason = tenant_offboarding` (nhật ký bất biến chỉ xoá được như vậy). Tên bảng lấy từ
 * sổ sinh từ schema, không từ người gọi; mọi giá trị đi qua tham số.
 */
const TENANT_TABLES = new Set(TENANT_SCOPED_TABLES)
const PAID_ORDERS = `SELECT id FROM "orders" WHERE organization_id = $1 AND paid_vnd > 0`

/** Điều kiện `WHERE` chọn dòng sẽ xoá của một bảng, hoặc `null` khi bảng giữ nguyên. */
function deleteWhere(table: string): string | null {
  if (PURGE_KEEP_TABLES.has(table)) return null
  if (table === "orders") return `organization_id = $1 AND NOT (paid_vnd > 0)`
  if (PURGE_KEEP_WITH_PAID_ORDERS.has(table)) return `organization_id = $1 AND order_id NOT IN (${PAID_ORDERS})`
  if (table === "customers") {
    return `organization_id = $1 AND id NOT IN (SELECT customer_id FROM "orders" WHERE organization_id = $1 AND paid_vnd > 0 AND customer_id IS NOT NULL)`
  }
  return `organization_id = $1`
}

/** Thứ tự xoá: con trước cha, chỉ bảng có `organization_id`. */
const PURGE_ORDER = TABLES_CHILD_FIRST.filter((t) => TENANT_TABLES.has(t))

/** Bảng không có `organization_id` nhưng mang dòng của tổ chức. */
const CROSS_TABLE_DELETES: ReadonlyArray<{ table: string; where: string }> = [
  { table: "organization_links", where: `parent_org_id = $1 OR child_org_id = $1` },
  { table: "governance_decisions", where: `scope = 'org:' || $1` },
]

export interface PurgePlanRow { table: string; rows: number }
export interface PurgeOrganizationRow { lifecycleStatus: string; offboardingUntil: Date | null; legalHoldUntil: Date | null }

type Tx = Prisma.TransactionClient

async function countRows(db: Tx | typeof prisma, table: string, where: string, organizationId: string): Promise<number> {
  const [row] = await db.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "${table}" WHERE ${where}`, organizationId)
  return row?.n ?? 0
}

export async function findPurgeTarget(organizationId: string): Promise<PurgeOrganizationRow | null> {
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: { lifecycle_status: true, offboarding_until: true, legal_hold_until: true },
  })
  return org ? { lifecycleStatus: org.lifecycle_status, offboardingUntil: org.offboarding_until, legalHoldUntil: org.legal_hold_until } : null
}

/** Số dòng sẽ xoá theo từng bảng (chỉ đọc) — bảng không có dòng nào bị bỏ khỏi danh sách. */
export async function planTenantPurge(organizationId: string): Promise<PurgePlanRow[]> {
  const plan: PurgePlanRow[] = []
  for (const table of PURGE_ORDER) {
    const where = deleteWhere(table)
    if (!where) continue
    const rows = await countRows(prisma, table, where, organizationId)
    if (rows > 0) plan.push({ table, rows })
  }
  for (const { table, where } of CROSS_TABLE_DELETES) {
    const rows = await countRows(prisma, table, where, organizationId)
    if (rows > 0) plan.push({ table, rows })
  }
  return plan
}

/** Tệp của asset vào hàng đợi xoá tệp (cron xoá trên kho) — trước khi xoá dòng `assets`. */
async function enqueueAssetFiles(tx: Tx, organizationId: string): Promise<number> {
  const assets = await tx.assets.findMany({ where: { organization_id: organizationId }, select: { id: true, storage_key: true, thumb_key: true } })
  const ctx = { organizationId } as TenantContext
  let keys = 0
  for (const asset of assets) {
    const own = payloadKeysToPurge(organizationId, asset)
    await enqueuePayloadDeletes(tx, ctx, own, null)
    keys += own.length
  }
  return keys
}

/** Ẩn danh dữ liệu cá nhân còn lại trên các dòng chứng từ giữ lại (giữ thông tin hoá đơn VAT). */
async function anonymizeKept(tx: Tx, organizationId: string): Promise<void> {
  // SQL thô: lớp mã hoá của client Prisma tính lại `phone_hash` từ dấu `ERASED` thành "" — từ hai khách giữ lại trở lên
  // sẽ trùng khoá duy nhất `(organization_id, phone_hash)` và cả lần xoá hỏng. Băm và 4 số cuối về NULL thật.
  await tx.$executeRaw`UPDATE "customers" SET name = ${ERASED_CUSTOMER_NAME}, phone = ${ERASED_MARKER}, phone_hash = NULL,
    phone_last4 = NULL, email = NULL, address = NULL, notes = NULL, tags = '{}', preferred_flowers = '{}',
    preferred_colors = '{}', branch_id = NULL WHERE organization_id = ${organizationId}`
  await tx.orders.updateMany({
    where: { organization_id: organizationId },
    data: { card_message: null, internal_note: null, delivery_address: Prisma.DbNull },
  })
  await tx.order_recipients.updateMany({
    where: { organization_id: organizationId },
    data: { recipient_name: null, recipient_phone: null, address_line: null, address_parts: Prisma.DbNull },
  })
  await tx.order_payments.updateMany({ where: { organization_id: organizationId }, data: { note: null, evidence_asset_id: null } })
}

export interface PurgeResult { deleted: PurgePlanRow[]; fileKeysQueued: number }

/** Thực thi xoá. Điều kiện kiểm lại trong giao dịch; không đủ điều kiện → ném lỗi, không xoá gì. */
export async function executeTenantPurge(organizationId: string, now: Date): Promise<PurgeResult> {
  return prisma.$transaction(
    async (tx) => {
      await setPurgeReason(tx, "tenant_offboarding")
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '30s'`)
      const [org] = await tx.$queryRawUnsafe<Array<{ s: string; u: Date | null; h: Date | null }>>(
        `SELECT lifecycle_status::text AS s, offboarding_until AS u, legal_hold_until AS h FROM "organizations" WHERE id = $1 FOR UPDATE`,
        organizationId,
      )
      const blocked = purgeBlockedReason(org ? { lifecycleStatus: org.s, offboardingUntil: org.u, legalHoldUntil: org.h } : null, now)
      if (blocked) throw new Error(blocked)

      const fileKeysQueued = await enqueueAssetFiles(tx, organizationId)
      const deleted: PurgePlanRow[] = []
      for (const table of PURGE_ORDER) {
        const where = deleteWhere(table)
        if (!where) continue
        const rows = await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE ${where}`, organizationId)
        if (rows > 0) deleted.push({ table, rows })
      }
      for (const { table, where } of CROSS_TABLE_DELETES) {
        const rows = await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE ${where}`, organizationId)
        if (rows > 0) deleted.push({ table, rows })
      }
      await anonymizeKept(tx, organizationId)
      await tx.organizations.update({
        where: { id: organizationId },
        data: { lifecycle_status: "DELETED", lifecycle_changed_at: now, settings: {} },
      })
      return { deleted, fileKeysQueued }
    },
    { timeout: 10 * 60_000, maxWait: 30_000 },
  )
}
