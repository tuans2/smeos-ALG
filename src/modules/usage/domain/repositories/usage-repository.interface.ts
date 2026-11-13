/**
 * IUsageRepository — Port Interface cho module usage.
 *
 * Đặt tại domain/ để use-cases phụ thuộc vào interface này
 * thay vì implementation cụ thể (Dependency Inversion Principle).
 *
 * NOTE: Dùng `usage` Prisma type trực tiếp vì usage là infrastructure-facing
 * module — mapping sang custom entity type không mang lại giá trị nghiệp vụ.
 * Trade-off được chấp nhận theo ADR-001.
 */

import type { TenantContext } from "@/core/tenancy"
import type { usage } from "@/modules/usage/infra/entities"

// ============================================================
// INPUT TYPES
// ============================================================

export type UsageStatus = "ENQUEUED" | "COMPLETED" | "REFUNDED" | "PARTIAL_REFUND"

export interface IRecordUsageInput {
  readonly workspaceId: string
  readonly userId: string
  readonly jobId?: string | null
  readonly feature: string
  readonly quantity?: number
  readonly costCredit: number
  readonly costUsd?: number | null
  readonly status: UsageStatus
  readonly metadata?: Record<string, unknown> | null
}

export interface IRecordRefundInput {
  readonly workspaceId: string
  readonly userId: string
  readonly jobId: string
  readonly feature: string
  readonly costUsd: number | null
}

export interface IUsageSummaryItem {
  readonly feature: string
  readonly quantity: number
  readonly costCredit: number
}

// ============================================================
// PORT INTERFACE
// ============================================================

export interface IUsageRepository {
  record(ctx: TenantContext, input: IRecordUsageInput): Promise<usage>
  listByJob(ctx: TenantContext, jobId: string): Promise<usage[]>
  recordRefund(ctx: TenantContext, input: IRecordRefundInput): Promise<usage>
  list(ctx: TenantContext, options: { limit: number; cursor?: string | null }): Promise<usage[]>
  /** Tổng theo `feature`; `range` lọc theo kỳ (checklist ALG 6.9), bỏ trống = toàn thời gian. */
  summaryByFeature(ctx: TenantContext, range?: { from: Date; to: Date }): Promise<IUsageSummaryItem[]>
}
