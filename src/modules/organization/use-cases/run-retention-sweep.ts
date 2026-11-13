import { isRetentionCategory, policySkipReason, retentionCutoff, type RetentionAction } from "../domain/retention-policy"
import { listRetentionPolicies, recordRetentionRun } from "../infra/retention-policy-repository"
import { countExpired, enforceExpired, type RetentionTableResult } from "../infra/retention-sweep"

export interface RetentionRunRow {
  category: string
  action: RetentionAction
  /** true = đã xoá / ẩn danh; false = chỉ đếm. */
  enforced: boolean
  cutoff: Date | null
  rows: number
  tables: RetentionTableResult[]
  skipped?: string
}

export interface RetentionRunOptions {
  /** Chỉ đếm, bỏ qua cờ `enforce` và không ghi `last_run_*` (chạy thử từ dòng lệnh). */
  dryRun?: boolean
  category?: string
}

/**
 * Một lượt hạn lưu (ADR-014 D-P4, bước P-6a): mỗi dòng `retention_policies` → mốc cắt theo tháng → đếm số dòng quá
 * hạn, hoặc xoá / ẩn danh khi dòng đó bật `enforce`. Gọi trong `asSystemDb` (job đi qua mọi tổ chức). Không in dữ liệu,
 * chỉ trả số dòng.
 */
export async function runRetentionSweep(now: Date, options: RetentionRunOptions = {}): Promise<RetentionRunRow[]> {
  const out: RetentionRunRow[] = []
  for (const policy of await listRetentionPolicies()) {
    if (options.category && policy.category !== options.category) continue
    const base = { category: policy.category, action: policy.action, rows: 0, tables: [] as RetentionTableResult[] }
    const skipped = policySkipReason(policy)
    if (skipped || !isRetentionCategory(policy.category)) {
      out.push({ ...base, enforced: false, cutoff: null, skipped: skipped ?? "loại dữ liệu chưa được hỗ trợ" })
      continue
    }
    const cutoff = retentionCutoff(now, policy.retentionMonths)
    const enforced = policy.enforce && !options.dryRun
    const tables = enforced ? await enforceExpired(policy.category, cutoff, now) : await countExpired(policy.category, cutoff, now)
    const rows = tables.reduce((sum, t) => sum + t.rows, 0)
    if (!options.dryRun) await recordRetentionRun(policy.category, now, rows)
    out.push({ ...base, enforced, cutoff, rows, tables })
  }
  return out
}
