/**
 * Chi nhánh nhận đơn điều phối chuỗi = dòng `branches` có `accepts_dispatch` (ADR-012 D-T2, T-4c).
 * `code` là mã chi nhánh trên link gia công (`?branch=`).
 */
import type { Prisma, PrismaClient } from "@/generated/prisma/client"

type Db = PrismaClient | Prisma.TransactionClient

/** `branches.id` của chi nhánh nhận đơn điều phối theo mã; `null` khi không có. */
export async function dispatchBranchIdByCode(db: Db, organizationId: string, branchCode: string): Promise<string | null> {
  const row = await db.branches.findFirst({
    where: { organization_id: organizationId, code: branchCode, accepts_dispatch: true },
    select: { id: true },
  })
  return row?.id ?? null
}
