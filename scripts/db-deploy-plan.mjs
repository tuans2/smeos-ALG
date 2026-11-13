// Quyết định các bước cập nhật CSDL lúc deploy — tách riêng, không I/O, để test được.
// Xem scripts/db-deploy.mjs và docs/kien-truc/VAN_HANH_CAP_NHAT_CSDL.md.

/** Migration nền của ALG (22/10/2026): toàn bộ lược đồ tại thời điểm bỏ `db push`. */
export const BASELINE_MIGRATION = "20261022000000_smeos_baseline"

/**
 * @param {{ hasAppTables: boolean, hasMigrationsTable: boolean, baselineApplied: boolean }} state
 * @returns {Array<"check-drift" | "archive-history" | "resolve-baseline" | "deploy">}
 *
 * - Đã có migration nền → chỉ `migrate deploy` (đường thường ngày).
 * - CSDL rỗng → `migrate deploy` dựng từ đầu; bảng lịch sử cũ (nếu sót) cất đi trước.
 * - CSDL đang chạy bằng `db push` (có bảng, chưa có nền) → kiểm khớp lược đồ TRƯỚC,
 *   cất bảng lịch sử floraos cũ, đánh dấu nền đã áp, rồi `migrate deploy`.
 */
export function planDeploy(state) {
  if (state.baselineApplied) return ["deploy"]
  const archive = state.hasMigrationsTable ? ["archive-history"] : []
  if (!state.hasAppTables) return [...archive, "deploy"]
  return ["check-drift", ...archive, "resolve-baseline", "deploy"]
}
