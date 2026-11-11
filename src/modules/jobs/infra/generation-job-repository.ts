import type { generation_jobs, InputJsonValue } from "./entities"

import { currentRequestId } from "@/core/observability/request-context"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./db-client"
import { JobEventRepository } from "./job-event-repository"
import { listRefundableJobs } from "./refundable-jobs-query"
import type { IGenerationJobRepository } from "../domain/repositories/generation-job-repository.interface"

// Re-export interface cho các module cần import từ một nơi
export type { IGenerationJobRepository }


export type CreateJobInput = {
  workspaceId: string
  branchId: string | null
  userId: string
  productId: string | null
  feature: string
  payload: unknown
  idempotencyKey: string
  /** Gom nhiều job cùng một lượt chạy lô (vd 30 biến thể, nợ #108) về một
   *  màn tiến độ chung. `undefined`/`null` cho mọi job không qua chạy lô. */
  jobGroupId?: string | null
}

/**
 * `generation_jobs` — đặc tả 07 mục 6. Bộ gác tổ chức ở tầng này
 * (`scopedWhere`/`scopedData`), giống mọi repository khác của core.
 */
export class GenerationJobRepository implements IGenerationJobRepository {
  constructor(private readonly db: DbClient = prisma) {}

  findById(ctx: TenantContext, id: string): Promise<generation_jobs | null> {
    return this.db.generation_jobs.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  /** Idempotency (`YC-U7`) — duy nhất theo (`organization_id`, `feature`, `idempotency_key`). */
  findByIdempotencyKey(
    ctx: TenantContext,
    feature: string,
    idempotencyKey: string
  ): Promise<generation_jobs | null> {
    return this.db.generation_jobs.findFirst({
      where: scopedWhere(ctx, { feature, idempotency_key: idempotencyKey }),
    })
  }

  /** Job COMPLETED mới nhất của `feature` có `payload.<key> = value` (vd. bản phối C của một kịch bản). */
  findLatestCompletedByPayload(
    ctx: TenantContext,
    feature: string,
    key: string,
    value: string
  ): Promise<generation_jobs | null> {
    return this.db.generation_jobs.findFirst({
      where: scopedWhere(ctx, {
        feature,
        status: "COMPLETED" as const,
        payload: { path: [key], equals: value },
      }),
      orderBy: { created_at: "desc" },
    })
  }

  /** Job mới nhất (mọi trạng thái) của `feature` có `payload.<key> = value`. */
  findLatestByPayload(ctx: TenantContext, feature: string, key: string, value: string): Promise<generation_jobs | null> {
    return this.db.generation_jobs.findFirst({
      where: scopedWhere(ctx, { feature, payload: { path: [key], equals: value } }),
      orderBy: { created_at: "desc" },
    })
  }

  create(ctx: TenantContext, input: CreateJobInput): Promise<generation_jobs> {
    return this.db.generation_jobs.create({
      data: scopedData(ctx, {
        workspace_id: input.workspaceId,
        branch_id: input.branchId,
        user_id: input.userId,
        product_id: input.productId,
        feature: input.feature,
        status: "PENDING" as const,
        idempotency_key: input.idempotencyKey,
        job_group_id: input.jobGroupId ?? null,
        request_id: currentRequestId() ?? null,
        payload: input.payload as InputJsonValue,
        attempts: 0,
      }),
    })
  }

  /**
   * Job TỔNG HỢP đại diện cho một lượt xử lý đã chạy ở NGOÀI core và đã xong
   * từ trước — dùng cho lượt nạp dữ liệu lịch sử của AVI GIFT (P8, nợ #34).
   *
   * Không đi qua `enqueueJob`: hàng đợi, hạn mức và credit đều là chuyện của
   * việc SẮP chạy. Tám lượt phân tích ở v1 đã chạy xong từ tháng trước, trên
   * hạ tầng khác, và khách đã trả tiền cho chúng ở v1 — tính credit lần nữa
   * là tính hai lần cho một việc. Vì cùng lý do, lượt nạp KHÔNG ghi
   * `usage`: bảng đó đo mức dùng trên nền tảng này (`YC-U1`).
   *
   * Vẫn giữ `idempotency_key` như mọi job khác, nên chạy lại lượt nạp không
   * tạo job thứ hai — `@@unique([organization_id, feature, idempotency_key])`.
   */
  createCompletedHistorical(
    ctx: TenantContext,
    input: CreateJobInput & { completedAt: Date }
  ): Promise<generation_jobs> {
    return this.db.generation_jobs.create({
      data: scopedData(ctx, {
        workspace_id: input.workspaceId,
        branch_id: input.branchId,
        user_id: input.userId,
        product_id: input.productId,
        feature: input.feature,
        status: "COMPLETED" as const,
        idempotency_key: input.idempotencyKey,
        payload: input.payload as InputJsonValue,
        // `result` là PHÁN QUYẾT nghiệp vụ (`APPROVED`/`REJECTED`/`WARNING`
        // của Identity Guard, P9 — `job-rules.ts`), một cột `String?`, không
        // phải chỗ chứa số liệu lượt chạy. Lượt nạp lịch sử không có phán
        // quyết nào để ghi: nó không chạy qua cổng nào cả. Số liệu lượt nạp
        // nằm ở `payload`, cột Json đúng nghĩa.
        result: null,
        attempts: 1,
        started_at: input.completedAt,
        completed_at: input.completedAt,
      }),
    })
  }

  /**
   * Tạo job đã hoàn tất ngay lập tức (dùng cho các luồng Cloud AI đồng bộ hoặc hoàn tất trực tiếp).
   */
  createCompleted(
    ctx: TenantContext,
    input: CreateJobInput & { id?: string; result?: string | null; output?: unknown; completedAt?: Date }
  ): Promise<generation_jobs> {
    const completedAt = input.completedAt ?? new Date()
    return this.db.generation_jobs.create({
      data: scopedData(ctx, {
        ...(input.id ? { id: input.id } : {}),
        workspace_id: input.workspaceId,
        branch_id: input.branchId,
        user_id: input.userId,
        product_id: input.productId,
        feature: input.feature,
        status: "COMPLETED" as const,
        idempotency_key: input.idempotencyKey,
        payload: input.payload as InputJsonValue,
        output: (input.output ?? null) as InputJsonValue,
        result: input.result ?? null,
        attempts: 1,
        started_at: completedAt,
        completed_at: completedAt,
      }),
    })
  }

  /** Số job của tổ chức tạo từ mốc `tu` tới nay — nguồn đếm của trần vận hành. */
  countSince(ctx: TenantContext, tu: Date): Promise<number> {
    return this.db.generation_jobs.count({
      where: scopedWhere(ctx, { created_at: { gte: tu } }),
    })
  }

  /**
   * Job chạy NGAY trong request đã tạo nó (`product.copy.generate`, M01b).
   *
   * Vẫn đi qua `enqueueJob` để có đủ ba thứ mà mọi lượt gọi mô hình phải có:
   * kiểm hạn mức, một dòng `usage`, và một khoá `idempotency_key`. Khác ở
   * chỗ không có worker nào nhận nó — lượt sinh câu chữ mất vài giây và
   * người dùng đang đứng chờ trên màn hình, nên đẩy qua hàng đợi chỉ thêm
   * một vòng chờ mà không đổi kết quả.
   *
   * Hai phương thức dưới đây là cách job đó ghi lại nó đã chạy: có mốc bắt
   * đầu, có mốc kết thúc, và hỏng thì `FAILED` để `refundJob` nhìn thấy.
   */
  async startInline(ctx: TenantContext, id: string, now: Date): Promise<void> {
    await this.db.generation_jobs.updateMany({
      where: scopedWhere(ctx, { id, status: "PENDING" as const }),
      data: { status: "PROCESSING", started_at: now, attempts: { increment: 1 } },
    })
  }

  /**
   * Ghi mốc tiến độ cho một job chạy tại chỗ (vd `generateContent`, P27) —
   * cùng việc `_set_stage()` bên worker Python làm cho job hàng đợi (đặc tả
   * 05 mục 8): cập nhật cột `stage` để `GET /jobs/:id` đọc trạng thái hiện
   * tại, và ghi thêm một dòng `job_events` (`event:"stage"`) để `GET
   * /jobs/:id/events` (SSE) phát lại từng bước cho giao diện. Chỉ có nghĩa
   * khi job đang `PROCESSING` — bỏ qua lặng lẽ nếu không (job đã xong/hỏng
   * thì không còn "đang ở bước nào" để ghi).
   */
  async setStage(ctx: TenantContext, id: string, stage: string): Promise<void> {
    const r = await this.db.generation_jobs.updateMany({
      where: scopedWhere(ctx, { id, status: "PROCESSING" as const }),
      data: { stage },
    })
    if (r.count === 1) {
      await new JobEventRepository(this.db).append(id, "stage", { stage })
    }
  }

  async finishInline(
    ctx: TenantContext,
    id: string,
    input: { ok: boolean; error?: string | null; now: Date; output?: unknown; result?: string | null }
  ): Promise<void> {
    await this.db.generation_jobs.updateMany({
      where: scopedWhere(ctx, { id }),
      data: {
        status: input.ok ? "COMPLETED" : "FAILED",
        // `stage` chỉ có nghĩa khi PROCESSING (lược đồ) — `setStage` của job
        // chạy tại chỗ ghi nó, nên xoá khi kết thúc.
        stage: null,
        // Phán quyết nghiệp vụ, độc lập với `status` — vd `REJECTED` khi
        // Content Engine chỉ giao được khuôn tất định (diện hoàn credit).
        ...(input.result !== undefined ? { result: input.result } : {}),
        error: input.ok ? null : (input.error ?? "Lỗi không xác định"),
        completed_at: input.now,
        // Job chạy tại chỗ có kết quả nhỏ (vd kịch bản bối cảnh) ghi thẳng vào
        // `output` để lần mở sau tra lại theo khoá idempotency, không gọi lại mô hình.
        ...(input.output !== undefined ? { output: input.output as InputJsonValue } : {}),
      },
    })
  }

  /**
   * Ghi đè `output` của một job đã xong (24/09/2026) — dùng khi sửa MỘT cảnh
   * của kịch bản bối cảnh (`creative.scene_plan`): kịch bản đang dùng là bản
   * mới nhất; lịch sử sửa nằm ở job `creative.scene_revise` riêng.
   */
  async replaceOutput(ctx: TenantContext, id: string, feature: string, output: unknown): Promise<boolean> {
    const r = await this.db.generation_jobs.updateMany({
      where: scopedWhere(ctx, { id, feature, status: "COMPLETED" as const }),
      data: { output: output as InputJsonValue },
    })
    return r.count === 1
  }

  /**
   * `GET /jobs` (`G4` chỉ thấy job của mình, `G5` toàn tổ chức — đặc tả 06
   * mục 7). `onlyMine` khi ngữ cảnh có `G4` mà không có `G5`; route quyết định
   * giá trị này, repository chỉ lọc theo nó.
   */
  list(
    ctx: TenantContext,
    options: { onlyUserId?: string | undefined; limit: number; cursor?: string | null }
  ): Promise<generation_jobs[]> {
    return this.db.generation_jobs.findMany({
      where: scopedWhere(ctx, options.onlyUserId ? { user_id: options.onlyUserId } : {}),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
  }

  /**
   * Ứng viên hàng chờ duyệt M04a (`GET /media/optimizations`, `I2`, nợ #48).
   * COMPLETED và không REJECTED (`REJECTED` không vào luồng duyệt — `YC-R5`)
   * — use-case gọi hàm này còn lọc tiếp "Master Image đã duyệt hay chưa" vì
   * `assets` không có quan hệ Prisma ngược lại đây để JOIN thẳng.
   */
  listCompletedNotRejected(
    ctx: TenantContext,
    options: { feature: string; limit: number }
  ): Promise<generation_jobs[]> {
    return this.db.generation_jobs.findMany({
      where: scopedWhere(ctx, {
        feature: options.feature,
        status: "COMPLETED" as const,
        NOT: { result: "REJECTED" },
      }),
      orderBy: [{ completed_at: "desc" }, { id: "desc" }],
      take: options.limit,
    })
  }

  /**
   * Huỷ — chỉ job còn `PENDING` (`YC-J4`). `updateMany` với điều kiện
   * `status: "PENDING"` ngay trong `where` là chốt chặn đua: hai lời gọi huỷ
   * đồng thời chỉ một cái thắng, cái còn lại thấy `count === 0`.
   */
  async cancelIfPending(ctx: TenantContext, id: string): Promise<generation_jobs | null> {
    const result = await this.db.generation_jobs.updateMany({
      where: scopedWhere(ctx, { id, status: "PENDING" as const }),
      data: { status: "CANCELLED" as const, cancelled_at: new Date() },
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }

  /**
   * Chạy lại — chỉ job `FAILED` (`YC-J3`). Trả về `generation_jobs` mới hay
   * `null` nếu job không còn ở trạng thái `FAILED` lúc ghi (đua hoặc đã
   * không phải `FAILED` từ đầu) — tầng use-case dịch `null` thành 409.
   */
  async retryIfFailed(ctx: TenantContext, id: string): Promise<generation_jobs | null> {
    const current = await this.findById(ctx, id)
    if (!current) return null

    const result = await this.db.generation_jobs.updateMany({
      where: scopedWhere(ctx, { id, status: "FAILED" as const }),
      data: {
        status: "PENDING" as const,
        stage: null,
        result: null,
        error: null,
        // Chạy lại thủ công = một lượt mới: worker lại có đủ số lần tự thử lại (E5.1). Worker đã đếm
        // lần lỗi trước vào `attempts`; cộng thêm ở đây từng làm mỗi lượt lỗi bị tính hai lần.
        attempts: 0,
        run_after: null,
        failure_kind: null,
        started_at: null,
        completed_at: null,
      },
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }

  /**
   * Lấy việc của worker (`YC-J7`, đặc tả 07 mục 6): `SELECT … FOR UPDATE SKIP
   * LOCKED` trên `generation_jobs`, lọc theo `feature`. Hai worker gọi đồng
   * thời không bao giờ nhận cùng một dòng — dòng đang bị khoá bởi một
   * transaction khác bị bỏ qua thay vì chờ.
   *
   * Đặt ở TS làm bằng chứng cơ chế đúng (bộ test cách ly gọi hàm này song
   * song); worker Python thật chạy đúng câu SQL này qua `psycopg`, không gọi
   * lại hàm TS — hai bên không nói chuyện qua HTTP (`YC-J8`).
   */
  async claimNext(feature: string): Promise<generation_jobs | null> {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<generation_jobs[]>`
        SELECT * FROM generation_jobs
         WHERE status = 'PENDING' AND feature = ${feature}
           AND (run_after IS NULL OR run_after <= now())
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
      `
      const job = rows[0]
      if (!job) return null

      const updated = await tx.generation_jobs.update({
        where: { id: job.id },
        data: { status: "PROCESSING", started_at: new Date() },
      })
      return updated
    })
  }

  /**
   * Job bị Identity Guard từ chối — đầu vào của tiến trình hoàn credit
   * (D3, `scripts/hoan-credit.ts`).
   *
   * KHÔNG lọc sẵn "đã hoàn hay chưa" ở đây: `usage.job_id` là cột thường,
   * không có quan hệ Prisma tới `generation_jobs` (đặc tả 07 mục 7 khai nó
   * là `String?` trần), nên `usage: { none: … }` không dùng được. Việc lọc
   * nằm ở `refundRejectedJob`, vốn đằng nào cũng phải đọc lại các dòng
   * `usage` của job để biết đã trừ bao nhiêu credit — và chính nó là chốt
   * idempotent, nên lọc hai lần cũng không thêm an toàn.
   *
   * Chạy toàn hệ thống, KHÔNG dùng `scopedWhere` — có chủ đích, cùng lý do
   * `markStuckAsFailed`: nó không phục vụ một ngữ cảnh người dùng nào. Mỗi
   * dòng trả về mang theo `organization_id` của chính nó, và use-case hoàn
   * credit dựng ngữ cảnh từ đúng giá trị đó chứ không từ tham số nào khác.
   */
  /** Job còn credit phải hoàn, mọi tổ chức — `refundable-jobs-query.ts` (audit BL-32). */
  listRefundable(limit: number): Promise<generation_jobs[]> {
    return listRefundableJobs(this.db, limit)
  }

  /**
   * Tiến trình quét (`YC-J10`): job `PROCESSING` quá `started_at + 15 phút`
   * bị đánh dấu `FAILED`. Chạy toàn hệ thống, không theo một tổ chức — đây
   * KHÔNG dùng `scopedWhere` có chủ đích, vì nó không phục vụ một ngữ cảnh
   * người dùng nào.
   */
  async markStuckAsFailed(now: Date, timeoutMs: number): Promise<number> {
    const threshold = new Date(now.getTime() - timeoutMs)
    const result = await this.db.generation_jobs.updateMany({
      where: { status: "PROCESSING", started_at: { lt: threshold } },
      data: { status: "FAILED", error: "worker timeout", completed_at: now },
    })
    return result.count
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let _instance: GenerationJobRepository | undefined

/** Trả về singleton GenerationJobRepository (inject mặc định cho use-cases). */
export function getGenerationJobRepository(db?: DbClient): IGenerationJobRepository {
  if (db) return new GenerationJobRepository(db)
  _instance ??= new GenerationJobRepository()
  return _instance
}
