/**
 * Đường xoá nhật ký bất biến (ADR-013 D-I4): `audit_logs`, `platform_audit_logs`, `order_events`, `job_events`, `usage`
 * chỉ xoá được (kể cả xoá dây chuyền từ `orders`) khi giao dịch đặt `app.purge_reason` — trigger
 * `smeos_append_only_guard` (migration `*_append_only_logs`). Chỉ quy trình rời nền tảng của tenant và hạn lưu dùng.
 *
 * Gọi ĐẦU giao dịch (`prisma.$transaction(async (tx) => { await setPurgeReason(tx, "…"); … })`): `set_config(…, true)`
 * chỉ sống trong giao dịch đó, không rò sang request khác dùng chung kết nối của pool.
 */
import type { Prisma } from "@/generated/prisma/client"

export const PURGE_REASONS = ["tenant_offboarding", "test_data_cleanup", "retention_policy"] as const
export type PurgeReason = (typeof PURGE_REASONS)[number]

export async function setPurgeReason(tx: Prisma.TransactionClient, reason: PurgeReason): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.purge_reason', ${reason}, true)`
}
