import { log } from "@/core/observability/log"
import { purgeExpiredIdempotencyKeys } from "@/core/idempotency/infra/idempotency-repository"
import { sweepProductProposalsIfDue } from "@/modules/products/use-cases/sweep-product-proposals"
import { pushDueDeliveryReminders } from "@/modules/coordinator/use-cases/push-delivery-reminders"
import { scanStuckJobs } from "@/modules/jobs/use-cases/scan-stuck-jobs"
import { expireOverdueQuotations } from "@/modules/sales/use-cases/expire-quotations"
import { sweepSubscriptions } from "@/modules/subscription/use-cases/sweep-subscriptions"
import { sweepStorageLifecycle } from "@/modules/storage/use-cases/sweep-storage-lifecycle"
import { runPiiBackfill } from "@/core/security/infra/pii-backfill"
import { completePendingErasures } from "@/modules/crm/use-cases/complete-pending-erasures"

/**
 * Các tác vụ quét phụ đi chung cron điều phối chuỗi (để không thêm dịch vụ Render). Tách khỏi `route.ts` để route
 * không vượt 350 dòng (K11); chạy tuần tự đúng thứ tự cũ.
 */
export async function runSideSweeps(now: Date) {
  // Mẫu sản phẩm đề xuất (nhắc / hết hạn / dọn) — đi chung cron để không thêm dịch vụ Render.
  const productProposals = await sweepProductProposalsIfDue(now)
  const deliveryReminders = await pushDueDeliveryReminders(now) // 4.32: đẩy tin nhắc giao M1/M2, mỗi mốc một lần
  // YC-J10: job PROCESSING quá 15 phút → FAILED (Render không có cron riêng cho `scripts/scan-stuck-jobs.ts`).
  const stuckJobsFailed = await scanStuckJobs(now).catch((error: unknown) => {
    log.error("chain_dispatch_sweep.stuck_jobs_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  // SDAGF P1: dọn thùng rác quá hạn + xoá payload trong hàng đợi.
  const storageLifecycle = await sweepStorageLifecycle(now)
  const idempotencyKeysPurged = await purgeExpiredIdempotencyKeys(now).catch(() => null) // E5.3: khoá quá 30 ngày
  // ADR-014 P-5a: mã hoá theo lô cột cá nhân còn chữ rõ (dữ liệu cũ, lệnh ghi không rõ tổ chức)
  const piiEncrypted = await runPiiBackfill().catch((error: unknown) => {
    log.error("chain_dispatch_sweep.pii_backfill_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  // Audit hành trình UJ-11: báo giá hết hạn và vòng đời gói chạy đúng hạn, không chờ người mở màn hình
  const quotationsExpired = await expireOverdueQuotations(now)
  const subscriptions = await sweepSubscriptions(now)
  // Audit hành trình UJ-28: yêu cầu xoá dữ liệu khách chờ đơn đang giao → xoá nốt khi đơn đã đóng
  const pendingErasures = await completePendingErasures(now)
  return { productProposals, deliveryReminders, stuckJobsFailed, storageLifecycle, idempotencyKeysPurged, piiEncrypted, quotationsExpired, subscriptions, pendingErasures }
}
