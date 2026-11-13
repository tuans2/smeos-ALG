/**
 * Ba trục tách rời của job (`YC-J1` `YC-J2`, đặc tả 07 mục 6) và luật chuyển
 * trạng thái quanh nó (`YC-J3` `YC-J4`, đặc tả 05 mục 7). Tệp thuần — không
 * import Prisma, test không cần cơ sở dữ liệu.
 *
 *   PENDING → PROCESSING → COMPLETED (result: bất kỳ, kể cả REJECTED)
 *           ↘ CANCELLED (chỉ từ PENDING)
 *   PROCESSING → FAILED (timeout/crash/lỗi nhà cung cấp, kể cả do quét treo)
 *   FAILED → PENDING (retry, attempts += 1)
 *
 * `COMPLETED` không bao giờ retry được, kể cả khi `result = REJECTED` — đó
 * là job chạy đúng và đi tới phán quyết, không phải job lỗi.
 */
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"

/** Nhãn tiếng Việt của trạng thái job — cho thông điệp lỗi, không lộ mã trạng thái (audit hành trình O6, UJ-07). */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "Đang chờ chạy",
  PROCESSING: "Đang chạy",
  COMPLETED: "Đã xong",
  FAILED: "Bị lỗi",
  CANCELLED: "Đã huỷ",
}

const TERMINAL: ReadonlySet<JobStatus> = new Set(["COMPLETED", "FAILED", "CANCELLED"])

export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL.has(status)
}

/** `POST /jobs/:id/cancel` (`G6`) — chỉ job còn `PENDING`. */
export function canCancel(status: JobStatus): boolean {
  return status === "PENDING"
}

/**
 * `POST /jobs/:id/retry` (`G7`) — chỉ job `FAILED`. Job `COMPLETED` với
 * `result = REJECTED` trả 409, không phải 200 (đặc tả 06 mục 7): chạy lại
 * cho ra đúng phán quyết cũ, chỉ tốn GPU.
 */
export function canRetry(status: JobStatus): boolean {
  return status === "FAILED"
}

const STUCK_TIMEOUT_MS = 15 * 60 * 1000

/**
 * Job `PROCESSING` quá `started_at + 15 phút` (`YC-J10`, đặc tả 05 mục 7).
 * Tiến trình quét gọi hàm này để quyết định, rồi
 * `GenerationJobRepository.markStuckAsFailed` ghi bằng một câu SQL có điều
 * kiện tương đương — hàm ở đây chỉ để test khoá đúng ngưỡng 15 phút, không
 * tự nó chạy trên dữ liệu thật.
 */
export function isStuck(
  job: { status: JobStatus; started_at: Date | null },
  now: Date
): boolean {
  if (job.status !== "PROCESSING" || !job.started_at) return false
  return now.getTime() - job.started_at.getTime() > STUCK_TIMEOUT_MS
}

export const STUCK_JOB_TIMEOUT_MS = STUCK_TIMEOUT_MS

/** Tên chỉ mục duy nhất chặn hai job cùng `Idempotency-Key`
 *  (`@@unique([organization_id, feature, idempotency_key])`,
 *  `prisma/schema.prisma`). */
const IDEMPOTENCY_KEY_FIELDS = ["organization_id", "feature", "idempotency_key"] as const

/**
 * Hai request cùng `Idempotency-Key` gửi ĐỒNG THỜI đều qua được cửa kiểm
 * "đã có job chưa" của `enqueueJob` (cửa đó đọc trước khi mở giao dịch), rồi
 * cái thua vỡ ở chỉ mục duy nhất. Đó là hành vi ĐÚNG về dữ liệu — không job
 * nào bị tạo hai lần, không tổ chức nào bị trừ credit hai lần vì giao dịch
 * cuộn lại — nhưng nếu để lỗi đó nổi lên thì client nhận 500 thay vì nhận
 * lại chính job đã tạo, đúng ngữ nghĩa của `Idempotency-Key` (`YC-U7`).
 *
 * Hàm này nhận diện đúng lỗi đó để `enqueueJob` đọc lại job của người thắng
 * và trả về như một lượt trùng lặp bình thường.
 *
 * Nhận diện bằng HÌNH DẠNG lỗi (`code === "P2002"` + danh sách trường), không
 * import lớp lỗi của Prisma: `domain/` không được import hạ tầng
 * (`AGENTS.md`), và `tests/tenant/khong-import-prisma-ngoai-infra.test.ts`
 * khoá luật đó bằng test.
 */
export function isDuplicateIdempotencyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const candidate = error as { code?: unknown; meta?: { target?: unknown } }
  if (candidate.code !== "P2002") return false

  const target = candidate.meta?.target
  // Postgres qua Prisma trả `target` là mảng tên cột. Một số đường trả chuỗi
  // (tên chỉ mục) — chấp nhận cả hai, và chấp nhận cả khi thiếu `target`
  // (chỉ `generation_jobs` mới đi qua đường này trong `enqueueJob`).
  if (Array.isArray(target)) {
    return IDEMPOTENCY_KEY_FIELDS.every((field) => target.includes(field))
  }
  if (typeof target === "string") {
    return IDEMPOTENCY_KEY_FIELDS.every((field) => target.includes(field))
  }
  return target === undefined
}
