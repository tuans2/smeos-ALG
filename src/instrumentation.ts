import type { Instrumentation } from "next"

import { reportRequestError } from "@/core/observability/request-error"

/**
 * Next.js gọi `register()` một lần khi tiến trình máy chủ khởi động (Next 16, `instrumentation.ts`).
 * Chỉ chạy ở runtime Node — bộ quét nền dùng Prisma, không chạy ở Edge.
 */
export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return
  // Theo dõi lỗi (E1.5): chỉ bật khi có SENTRY_DSN — thiếu thì chỉ còn log JSON như trước.
  const dsn = process.env["SENTRY_DSN"]
  if (dsn) {
    const [{ initSentryErrorTracker }, { setErrorTracker }] = await Promise.all([
      import("@/core/observability/adapters/sentry-error-tracker"),
      import("@/core/observability/error-tracker"),
    ])
    setErrorTracker(initSentryErrorTracker(dsn))
  }
  // Bộ quét nền đi qua mọi tổ chức → quyền hệ thống; hẹn giờ giữ ngữ cảnh lúc tạo (RLS, checklist ALG 1.18)
  const { asSystemDb, markWebProcess } = await import("@/core/tenancy/db-context")
  // Truy vấn ngoài mọi ngữ cảnh trong tiến trình web không được quyền hệ thống (audit DB-01, chuẩn bị I-6)
  markWebProcess()
  const { startBackgroundSweep } = await import("@/modules/greeting-card/use-cases/background-sweep-scheduler")
  asSystemDb("sweep:greeting-card", startBackgroundSweep)
  // Đơn quá hạn thanh toán → lead cứu đơn (Đơn hàng đa nguồn, PO 31/10/2026) — chỉ đọc sự kiện huỷ.
  const { startLeadRecoverySweep } = await import("@/modules/acquisition/use-cases/lead-recovery-scheduler")
  asSystemDb("sweep:lead-recovery", startLeadRecoverySweep)
  // Chuyển khoản SePay còn "chưa khớp" sau bộ khớp Thẻ chào → khớp đơn ngoài Thẻ chào (P3b).
  const { startOrdersBankMatchSweep } = await import("@/modules/orders/use-cases/orders-sweep-scheduler")
  asSystemDb("sweep:orders-bank-match", startOrdersBankMatchSweep)
  // Đối soát số đã thu với sổ thu mỗi 6 giờ (ADR-013 D-I6) — chỉ ghi nhận lệch, không tự sửa.
  const { startPaymentReconciliation } = await import("@/modules/orders/use-cases/reconciliation-scheduler")
  asSystemDb("sweep:payment-reconciliation", startPaymentReconciliation)
  // Khách có đơn vừa đổi → tính lại chi tiêu thực thu và hạng theo ngành (PO 07/11/2026, Q6).
  const { startCustomerMetricsSweep } = await import("@/modules/crm/use-cases/customer-metrics-scheduler")
  asSystemDb("sweep:customer-metrics", startCustomerMetricsSweep)
}

/** Lỗi máy chủ không ai bắt → log có cấu trúc (rà soát 21/10/2026, giai đoạn 3 — quan trắc). */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  reportRequestError(error, request, context)
}
