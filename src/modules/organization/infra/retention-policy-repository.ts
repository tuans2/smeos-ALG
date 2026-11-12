import { prisma } from "@/core/tenancy/infra/prisma"

import type { RetentionPolicy } from "../domain/retention-policy"

/** Bảng `retention_policies` (ADR-014 D-P4) — bảng nền tảng, đọc/ghi bằng quyền hệ thống. */
export async function listRetentionPolicies(): Promise<RetentionPolicy[]> {
  const rows = await prisma.retention_policies.findMany({ orderBy: { category: "asc" } })
  return rows.map((r) => ({ category: r.category, retentionMonths: r.retention_months, action: r.action, enforce: r.enforce }))
}

/** Lần chạy gần nhất của job (mọi loại dữ liệu) — để chạy mỗi đêm một lần dù có nhiều tiến trình. */
export async function lastRetentionRunAt(): Promise<Date | null> {
  const row = await prisma.retention_policies.aggregate({ _max: { last_run_at: true } })
  return row._max.last_run_at
}

export async function recordRetentionRun(category: string, at: Date, rows: number): Promise<void> {
  await prisma.retention_policies.update({ where: { category }, data: { last_run_at: at, last_run_rows: rows } })
}
