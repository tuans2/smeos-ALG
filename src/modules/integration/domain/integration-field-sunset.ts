/**
 * Gỡ trường nội bộ khỏi phản hồi Integration API (ARC-024, PO duyệt danh sách 11/11/2026; đặc tả 06 "Version và gỡ
 * endpoint" — gỡ trường là thay đổi phá vỡ, báo trước ≥ `NOTICE_DAYS.external`).
 *
 * Trước `effective`: phản hồi giữ nguyên (trường đánh dấu `deprecated` trong OpenAPI và tài liệu đối tác). Từ 00:00 UTC
 * ngày `effective`: máy chủ tự bỏ các trường dưới đây. Cùng ngày với lịch 422 khoá trùng (`integration-key-reuse.ts`) để
 * đối tác chỉ phải nâng cấp một lần. Không dời ngày sớm hơn — `integration-field-sunset.test.ts` đỏ khi báo trước thiếu.
 *
 * Tên camelCase cũ (`masterImageUrl`, `driveLink`, `costCredit`) GIỮ — đổi tên chỉ khi lên `/v2`.
 */
export const INTEGRATION_FIELD_SUNSET = {
  announced: "2026-11-11",
  effective: "2027-02-09",
} as const

/** Trường sắp gỡ theo loại bản ghi. Chỉ được thêm khi có ngày gỡ mới đủ báo trước; không được bớt sau khi công bố. */
export const SUNSET_FIELDS = {
  /** `POST /integration/assets` — khoá kho, thông tin mô hình/câu lệnh AI, chi phí, người duyệt, thùng rác. */
  asset: [
    "storage_key", "thumb_key", "provider", "model", "model_version", "pipeline_version", "parameters", "prompt",
    "input_sha256", "output_sha256", "cost_usd", "created_by", "approved_by", "trashed_at", "purge_after", "legal_hold_until",
  ],
  /** `GET /integration/products/{id}/master-image` — `master` và từng phần tử `ratios` (đã có `url` ký sẵn). */
  masterImageAsset: ["storage_key", "thumb_key"],
  /** `job` trong `POST /integration/jobs` — giữ `payload`, `output`, `failure_kind`. */
  job: ["user_id", "workspace_id", "branch_id", "request_id", "job_group_id", "run_after", "error"],
  /** `POST /integration/usage`. */
  usage: ["user_id", "workspace_id", "cost_usd", "metadata"],
  /** `/integration/catalog-links*` — bản ghi tạo mới, danh sách, bản sửa. */
  catalogLink: ["created_by", "revoked_by", "trashed_at", "purge_after"],
} as const satisfies Record<string, readonly string[]>

export type SunsetKind = keyof typeof SUNSET_FIELDS

export function fieldSunsetActive(now: Date): boolean {
  return now.getTime() >= Date.parse(`${INTEGRATION_FIELD_SUNSET.effective}T00:00:00Z`)
}

/** Bản sao nông đã bỏ trường sắp gỡ khi tới ngày; trước ngày trả lại chính bản ghi. */
export function withoutSunsetFields<T extends object>(kind: SunsetKind, record: T, now: Date): T {
  if (!fieldSunsetActive(now)) return record
  const drop = new Set<string>(SUNSET_FIELDS[kind])
  return Object.fromEntries(Object.entries(record).filter(([key]) => !drop.has(key))) as T
}

/** Mô tả gắn vào lược đồ OpenAPI của từng trường sắp gỡ. */
export const SUNSET_NOTE = `Sắp gỡ: máy chủ bỏ trường này từ ${INTEGRATION_FIELD_SUNSET.effective} (báo ${INTEGRATION_FIELD_SUNSET.announced}). Không dùng cho tích hợp mới.`
