/**
 * IGenerationJobRepository — Port Interface cho module jobs.
 *
 * Đặt tại domain/ để use-cases phụ thuộc vào interface này
 * thay vì implementation cụ thể (Dependency Inversion Principle).
 *
 * NOTE: Vì `generation_jobs` là bảng infrastructure cốt lõi (queue thật) và
 * được dùng xuyên suốt 20+ modules, interface này accept `generation_jobs` type
 * trực tiếp thay vì custom entity type để tránh mapping overhead không cần thiết.
 * Trade-off được chấp nhận theo ADR-001 (Worker Queue Boundary).
 */

import type { TenantContext } from "@/core/tenancy"
import type { generation_jobs } from "@/modules/jobs/infra/entities"

// ============================================================
// INPUT TYPES
// ============================================================

export interface ICreateJobInput {
  readonly workspaceId: string
  readonly branchId: string | null
  readonly userId: string
  readonly productId: string | null
  readonly feature: string
  readonly payload: unknown
  readonly idempotencyKey: string
  readonly jobGroupId?: string | null
}

export interface ICreateCompletedInput {
  readonly workspaceId: string
  readonly userId: string
  readonly productId?: string | null
  readonly feature: string
  readonly idempotencyKey: string
  readonly payload?: unknown
  readonly output?: unknown
  readonly completedAt?: Date
}

export interface IListJobsOptions {
  readonly onlyUserId?: string
  readonly limit?: number
  readonly cursor?: string | null
  readonly feature?: string
}

// ============================================================
// PORT INTERFACE
// ============================================================

export interface IGenerationJobRepository {
  findById(ctx: TenantContext, id: string): Promise<generation_jobs | null>
  findByIdempotencyKey(ctx: TenantContext, feature: string, idempotencyKey: string): Promise<generation_jobs | null>
  findLatestCompletedByPayload(ctx: TenantContext, feature: string, key: string, value: string): Promise<generation_jobs | null>
  findLatestByPayload(ctx: TenantContext, feature: string, key: string, value: string): Promise<generation_jobs | null>
  create(ctx: TenantContext, input: ICreateJobInput): Promise<generation_jobs>
  createCompleted(ctx: TenantContext, input: ICreateCompletedInput): Promise<generation_jobs>
  countSince(ctx: TenantContext, from: Date): Promise<number>
  startInline(ctx: TenantContext, id: string, now: Date): Promise<void>
  setStage(ctx: TenantContext, id: string, stage: string): Promise<void>
  finishInline(ctx: TenantContext, id: string, input: { ok: boolean; error?: string | null; now: Date; output?: unknown; result?: string | null }): Promise<void>
  replaceOutput(ctx: TenantContext, id: string, feature: string, output: unknown): Promise<boolean>
  list(ctx: TenantContext, options: { onlyUserId?: string | undefined; limit: number; cursor?: string | null }): Promise<generation_jobs[]>
  listCompletedNotRejected(ctx: TenantContext, options: { feature: string; limit: number }): Promise<generation_jobs[]>
  cancelIfPending(ctx: TenantContext, id: string): Promise<generation_jobs | null>
  retryIfFailed(ctx: TenantContext, id: string): Promise<generation_jobs | null>
  claimNext(feature: string): Promise<generation_jobs | null>
  listRefundable(limit: number): Promise<generation_jobs[]>
  markStuckAsFailed(now: Date, timeoutMs: number): Promise<number>
}
