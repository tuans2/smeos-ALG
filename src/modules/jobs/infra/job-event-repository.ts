import type { InputJsonValue, job_events } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"

import type { DbClient } from "./db-client"

/** `guard` thêm ở P9: khối bốn điểm của Identity Guard. Nó nằm ở đây chứ
 *  không ở một cột riêng vì đặc tả 07 không khai bảng nào cho M04a, và chỗ
 *  cần đọc nó nhất là lúc bị TỪ CHỐI — đúng lúc không có `assets` nào được
 *  tạo để gắn metadata vào. */
/** `variant_integrity` thêm ở P24 (M04b): số đo của cổng Subject Integrity —
 *  tỷ lệ điểm ảnh lõi chủ thể còn trùng khít với Master Image sau khi ghép
 *  bối cảnh. Nằm cùng chỗ với `guard` và vì cùng một lý do: `assets` không
 *  được ghi khi lượt bị từ chối, nên số đo không có bản ghi nào để bám vào. */
export type JobEventType = "stage" | "log" | "done" | "guard" | "variant_integrity"

/**
 * Nhật ký tiến trình job — đặc tả 05 mục 8, `YC-J9`. Bảng phụ, ghi cộng dồn
 * theo `job_id`, `seq` tăng dần. `GET /jobs/:id/events` (SSE) đọc từ đây,
 * nối tiếp qua `Last-Event-ID`.
 *
 * Worker Python thật ghi trực tiếp bằng SQL tương đương (đặc tả 05 mục 6:
 * không HTTP giữa TS và Python). `append()` ở đây phục vụ bộ test và một
 * worker TS-side thử nghiệm nếu có; nó không phải đường ghi duy nhất trên dữ
 * liệu thật.
 *
 * `seq` tính bằng `MAX(seq)+1` trong cùng giao dịch — an toàn vì một job chỉ
 * có đúng một worker sở hữu sau khi `claimNext`, nên không có hai người ghi
 * đồng thời vào cùng `job_id` trong vận hành bình thường. Đây là một giả
 * định, không phải khoá; ghi ở `docs/dac-ta/TECHNICAL_DEBT.md`.
 */
export class JobEventRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async append(jobId: string, event: JobEventType, payload: unknown): Promise<job_events> {
    return prisma.$transaction(async (tx) => {
      const last = await tx.job_events.findFirst({
        where: { job_id: jobId },
        orderBy: { seq: "desc" },
        select: { seq: true },
      })
      const seq = (last?.seq ?? 0) + 1
      // organization_id sao từ job cha — khoá ghép (job_id, organization_id) giữ hai bên khớp.
      const job = await tx.generation_jobs.findUniqueOrThrow({
        where: { id: jobId },
        select: { organization_id: true },
      })
      return tx.job_events.create({
        data: { job_id: jobId, organization_id: job.organization_id, seq, event, payload: payload as InputJsonValue },
      })
    })
  }

  /** Sự kiện MỚI NHẤT thuộc một loại — `getOptimization` đọc khối `guard`
   *  và khối `done` của job. Không nhận `TenantContext` vì `job_events`
   *  không mang `organization_id`; quyền sở hữu job phải kiểm ở tầng trên
   *  TRƯỚC khi gọi, đúng cách route SSE `GET /jobs/:id/events` đang làm. */
  findLatestByType(jobId: string, event: JobEventType): Promise<job_events | null> {
    return this.db.job_events.findFirst({
      where: { job_id: jobId, event },
      orderBy: { seq: "desc" },
    })
  }

  /** Nối tiếp qua `Last-Event-ID` — `afterSeq` là `seq` cuối client đã thấy. */
  listSince(jobId: string, afterSeq: number): Promise<job_events[]> {
    return this.db.job_events.findMany({
      where: { job_id: jobId, seq: { gt: afterSeq } },
      orderBy: { seq: "asc" },
    })
  }
}

let _jobEventRepo: JobEventRepository | null = null
export function getJobEventRepository(): JobEventRepository {
  if (!_jobEventRepo) _jobEventRepo = new JobEventRepository()
  return _jobEventRepo
}
