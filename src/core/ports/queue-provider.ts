import type { TenantContext } from "@/core/tenancy"

/**
 * Cổng hàng đợi — quyết định D6-1 (kiến trúc V2 mục 3.1).
 *
 * Adapter mặc định (`src/modules/jobs/adapters/postgres-queue-provider.ts`)
 * dùng chính bảng `generation_jobs` trên Postgres: worker lấy việc bằng
 * SELECT … FOR UPDATE SKIP LOCKED, đánh thức bằng LISTEN/NOTIFY. Đổi sang
 * Redis về sau là thay adapter sau cổng này, không sửa module.
 *
 * Cấm chạy job qua HTTP. Cấm subprocess + parse stdout.
 *
 * Hạn mức được kiểm và `usage` được ghi TRONG CÙNG một giao dịch với
 * `enqueue()` (đặc tả 05 mục 6: kiểm hạn mức → ghi usage → tạo
 * generation_jobs → NOTIFY, không tách rời) — không ghi ở worker (`YC-U4`).
 * Tham số `tx` tuỳ chọn thứ hai là điểm nối vào giao dịch đó: use-case gọi
 * `enqueue(input, tx)` từ bên trong `runInTransaction(...)` của chính nó khi
 * cần cả bốn việc cùng rollback với nhau. Kiểu `unknown` ở đây (không phải
 * kiểu Prisma) để cổng không phụ thuộc công nghệ cụ thể — chỉ adapter
 * Postgres mới biết cách diễn giải nó.
 */
export interface EnqueueInput {
  ctx: TenantContext
  branchId: string | null
  productId: string | null
  feature: string
  payload: unknown
  /** `YC-U7` — chống trùng 24 giờ. */
  idempotencyKey: string
}

export interface QueueProvider {
  readonly name: string

  enqueue(input: EnqueueInput, tx?: unknown): Promise<{ jobId: string }>

  cancel(ctx: TenantContext, jobId: string): Promise<void>
}
