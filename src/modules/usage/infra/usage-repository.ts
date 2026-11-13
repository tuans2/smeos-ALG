import { Prisma } from "@/generated/prisma/client"
import type { InputJsonValue, usage } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./db-client"
import type { IUsageRepository } from "../domain/repositories/usage-repository.interface"

// Re-export interface cho các module cần import từ một nơi
export type { IUsageRepository }


export type RecordUsageInput = {
  workspaceId: string
  userId: string
  jobId?: string | null
  feature: string
  quantity?: number
  costCredit: number
  costUsd?: number | null
  status: "ENQUEUED" | "COMPLETED" | "REFUNDED" | "PARTIAL_REFUND"
  metadata?: Record<string, unknown> | null
}

/**
 * Một bảng `usage` duy nhất cho toàn hệ thống (`YC-U1` `YC-U2`, đặc tả 07 mục
 * 7). Mọi phương thức ghi nhận `db: DbClient` qua constructor để chạy được
 * trong cùng giao dịch với kiểm hạn mức và tạo `generation_jobs`
 * (`enqueue-job.ts`, đặc tả 05 mục 6) — không tạo `PrismaClient` mới ở đây.
 */
export class UsageRepository implements IUsageRepository {
  constructor(private readonly db: DbClient = prisma) {}

  record(ctx: TenantContext, input: RecordUsageInput): Promise<usage> {
    return this.db.usage.create({
      data: scopedData(ctx, {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        job_id: input.jobId ?? null,
        feature: input.feature,
        quantity: input.quantity ?? 1,
        cost_credit: input.costCredit,
        cost_usd: input.costUsd ?? null,
        status: input.status,
        metadata: (input.metadata ?? null) as InputJsonValue,
      }),
    })
  }

  /**
   * Job bị Identity Guard từ chối (`result = REJECTED`) — quyết định D3:
   * không tính phí khách. Ghi một dòng `REFUNDED` mới với `cost_usd` thật
   * (chi phí phía nền tảng đã tiêu thụ, vẫn vào sổ) và `cost_credit = 0`
   * (không trừ thêm của khách) — không sửa dòng `ENQUEUED` cũ, giữ nguyên
   * lịch sử. Hoàn credit vào `organizations.credit_balance` là việc của
   * use-case gọi hàm này, cùng một giao dịch.
   */
  /** Các dòng `usage` của một job — `refundRejectedJob` đọc để biết đã hoàn
   *  chưa (chốt idempotent) và để lấy lại số credit đã trừ lúc enqueue. */
  listByJob(ctx: TenantContext, jobId: string): Promise<usage[]> {
    return this.db.usage.findMany({
      where: scopedWhere(ctx, { job_id: jobId }),
      orderBy: { created_at: "asc" },
    })
  }

  recordRefund(
    ctx: TenantContext,
    input: { workspaceId: string; userId: string; jobId: string; feature: string; costUsd: number | null }
  ): Promise<usage> {
    return this.db.usage.create({
      data: scopedData(ctx, {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        job_id: input.jobId,
        feature: input.feature,
        quantity: 1,
        cost_credit: 0,
        cost_usd: input.costUsd,
        status: "REFUNDED" as const,
        // `Prisma.DbNull` = NULL của SQL, khác `Prisma.JsonNull` (chuỗi
        // JSON `null` NẰM TRONG cột). Ở đây muốn cột rỗng thật. Trước đây
        // viết `null as never` — `never` nhận mọi thứ nên nó vừa che kiểu
        // vừa che luôn sự phân biệt này.
        metadata: Prisma.DbNull,
      }),
    })
  }

  list(
    ctx: TenantContext,
    options: { limit: number; cursor?: string | null }
  ): Promise<usage[]> {
    return this.db.usage.findMany({
      where: scopedWhere(ctx),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
  }

  /**
   * Tổng theo `feature` — nguồn của `GET /usage/summary` (đặc tả 06 mục 10).
   * Truy vấn tổng hợp trực tiếp trên `usage` mỗi lần gọi — nợ kỹ thuật #5,
   * đã ghi từ P2, chỉ thành vấn đề khi bảng lớn.
   */
  async summaryByFeature(
    ctx: TenantContext,
    range?: { from: Date; to: Date }
  ): Promise<Array<{ feature: string; quantity: number; costCredit: number }>> {
    const rows = await this.db.usage.groupBy({
      by: ["feature"],
      where: scopedWhere(ctx, { status: { not: "REFUNDED" }, ...(range ? { created_at: { gte: range.from, lt: range.to } } : {}) }),
      _sum: { quantity: true, cost_credit: true },
    })
    return rows.map((row: { feature: string; _sum: { quantity: number | null; cost_credit: number | null } }) => ({
      feature: row.feature,
      quantity: row._sum.quantity ?? 0,
      costCredit: row._sum.cost_credit ?? 0,
    }))
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let _instance: UsageRepository | undefined

/** Trả về singleton UsageRepository (inject mặc định cho use-cases). */
export function getUsageRepository(db?: DbClient): IUsageRepository {
  if (db) return new UsageRepository(db)
  _instance ??= new UsageRepository()
  return _instance
}
