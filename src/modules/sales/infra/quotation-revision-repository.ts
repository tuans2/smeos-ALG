/** Lịch sử phiên bản báo giá (`quotation_revisions`, checklist ALG 3.10). Mọi truy vấn lọc theo tổ chức. */

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { QuotationSnapshot } from "../domain/quotation-revision"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"

export interface QuotationRevisionRow {
  version: number
  snapshot: unknown
  createdBy: string
  createdAt: Date
}

export class QuotationRevisionRepository {
  /** Ghi một phiên bản mới (số thứ tự tăng dần theo báo giá). */
  async add(ctx: TenantContext, quotationId: string, snapshotValue: QuotationSnapshot): Promise<number> {
    const snapshot = snapshotValue as unknown as Prisma.InputJsonValue
    return prisma.$transaction(async (tx) => {
      const last = await tx.quotation_revisions.findFirst({
        where: scopedWhere(ctx, { quotation_id: quotationId }), orderBy: { version: "desc" }, select: { version: true },
      })
      const version = (last?.version ?? 0) + 1
      await tx.quotation_revisions.create({ data: scopedData(ctx, { quotation_id: quotationId, version, snapshot, created_by: ctx.userId }) })
      return version
    })
  }

  async list(ctx: TenantContext, quotationId: string): Promise<QuotationRevisionRow[]> {
    const rows = await prisma.quotation_revisions.findMany({
      where: scopedWhere(ctx, { quotation_id: quotationId }), orderBy: { version: "desc" },
      select: { version: true, snapshot: true, created_by: true, created_at: true },
    })
    return rows.map((r) => ({ version: r.version, snapshot: r.snapshot, createdBy: r.created_by, createdAt: r.created_at }))
  }
}
