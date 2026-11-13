import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { BackgroundSweepRepository, getBackgroundSweepRepository } from "../infra/background-sweep-repository"
import { BrochurePaymentRepository, getBrochurePaymentRepository } from "../infra/brochure-payment-repository"
import { CancellationFollowUpRepository, getCancellationFollowUpRepository } from "../infra/cancellation-follow-up-repository"
import { DismissalRepository, getDismissalRepository } from "../infra/dismissal-repository"
import { DISMISSAL_TIMEOUT_MS } from "../domain/dismissal-policy"
import { parsePaymentPolicy, DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES } from "../domain/brochure-payment-policy"
import { NOTIFY_EVENTS, type NotifyEvent } from "../domain/customer-notifications"
import {
  AUTO_CANCEL_REASON, MIN_AUTO_CONFIRM_PROOF_MS, PAYMENT_TIMEOUT_REASON, RETRY_BACKOFF_MS, RETRY_WINDOW_MS, STALE_SENDING_MS,
  holdAction, shouldAutoConfirmProof,
} from "../domain/background-sweep"
import {
  resolveEffectiveStepTimeoutPolicy,
  isSessionUnopenedExpired,
  isSessionBrowsingExpired,
  formatTimeoutDuration,
} from "../domain/step-timeout-policy"
import { notifyOrderEvent, queueOrderNotification } from "./notify-customer"
import { queueStaffNotification } from "./notify-staff"
import { adminConfirmBrochurePayment } from "./confirm-brochure-payment"
import { dispatchAfterPaymentConfirmed } from "./dispatch-after-payment"

const HOLD_LOOKBACK_MS = 7 * 86_400_000

export interface SweepResult {
  staleFailed: number
  retried: number
  reminded: number
  cancelled: number
  sessionsExpired: number
  autoConfirmed: number
  dismissed: number
}

/** Ngữ cảnh "hệ thống" cho thao tác tự động — audit ghi rõ nguồn, không mang năng lực của ai. */
function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: "system:hold-expiry", branchId: null, capabilities: new Set() }
}

/**
 * Một vòng quét: (1) tin kẹt → lỗi, (2) gửi lại tin lỗi có giới hạn, (3) nhắc/huỷ đơn quá hạn giữ,
 * (4) tự xác nhận tiền từ ảnh bill CHỈ khi tiệm bật và AI đối soát khớp (`shouldAutoConfirmProof`),
 * (5) quét và huỷ/thu hồi các phiên quá hạn mở link hoặc quá hạn chọn mẫu theo chính sách.
 * Không bao giờ ném lỗi ra ngoài — lỗi từng đơn được ghi log, vòng sau làm tiếp.
 */
export async function runBackgroundSweep(
  now = new Date(),
  repo = getBackgroundSweepRepository(),
  payments = getBrochurePaymentRepository(),
): Promise<SweepResult> {
  const result: SweepResult = { staleFailed: 0, retried: 0, reminded: 0, cancelled: 0, sessionsExpired: 0, autoConfirmed: 0, dismissed: 0 }

  result.staleFailed = await repo.failStaleSending(new Date(now.getTime() - STALE_SENDING_MS))

  const retryable = await repo.listRetryable(new Date(now.getTime() - RETRY_BACKOFF_MS), new Date(now.getTime() - RETRY_WINDOW_MS))
  for (const n of retryable) {
    if (!(NOTIFY_EVENTS as readonly string[]).includes(n.event_key)) continue
    // `claim` chỉ cho FAILED → SENDING một lần: instance khác quét cùng lúc nhận DUPLICATE
    const outcome = await notifyOrderEvent(n.organization_id, n.order_id, n.event_key as NotifyEvent).catch(() => "FAILED" as const)
    if (outcome === "SENT") result.retried += 1
  }

  for (const o of await repo.listUnpaidDrafts(new Date(now.getTime() - HOLD_LOOKBACK_MS))) {
    const quotedAt = (o.pricing_rule_ref as { quotedAt?: unknown } | null)?.quotedAt
    // Đơn báo giá sau: giữ đơn tính từ lúc có giá, không phải lúc đặt
    const startedAt = typeof quotedAt === "string" && !Number.isNaN(Date.parse(quotedAt)) ? new Date(quotedAt) : o.created_at
    const action = holdAction(
      {
        status: o.status, totalVnd: Number(o.total_vnd), paidVnd: Number(o.paid_vnd), createdAt: startedAt,
        customerReportedPaid: o.greeting_sessions[0]?.status === "PAYMENT_REPORTED",
      },
      parsePaymentPolicy(o.organization.settings),
      now,
    )
    try {
      if (action === "REMIND") {
        // Mốc nhắc chống trùng theo (đơn, mốc) — mỗi đơn chỉ nhắc một lần
        if ((await notifyOrderEvent(o.organization_id, o.id, "PAYMENT_REMINDER")) === "SENT") result.reminded += 1
      } else if (action === "CANCEL" || action === "FAIL_PAYMENT") {
        const failed = action === "FAIL_PAYMENT"
        await payments.cancel(systemContext(o.organization_id), o.id, failed ? PAYMENT_TIMEOUT_REASON : AUTO_CANCEL_REASON, { paymentFailed: failed })
        queueOrderNotification(o.organization_id, o.id, "CANCELLED")
        result.cancelled += 1
      }
    } catch (error) {
      // Đơn vừa đổi trạng thái (khách vừa trả, người khác vừa huỷ) — bỏ qua, vòng sau xét lại
      log.warn("greeting_card.sweep_order_skipped", {
        organizationId: o.organization_id, feature: "greeting-card", action,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Bill khách đã gửi: chỉ tự xác nhận khi tiệm bật và AI đối soát khớp; còn lại chờ Điều hành duyệt
  for (const o of await repo.listPendingPaymentProofOrders(new Date(now.getTime() - MIN_AUTO_CONFIRM_PROOF_MS))) {
    if (!shouldAutoConfirmProof(o, parsePaymentPolicy(o.settings), now) || o.analysisExpectedVnd === null) continue
    try {
      await adminConfirmBrochurePayment(systemContext(o.organizationId), o.id, {
        confirmationType: "AUTO_SYSTEM_15M",
        expectedAmountVnd: o.analysisExpectedVnd,
        reference: "AUTO_SYSTEM_15M",
        note: "Hệ thống tự động xác nhận chuyển khoản (tiệm bật tự duyệt, bill khớp tài khoản và số tiền)",
      }, payments)
      result.autoConfirmed += 1
      await dispatchAfterPaymentConfirmed(systemContext(o.organizationId), o.id)
    } catch (error) {
      log.warn("greeting_card.auto_confirm_payment_skipped", {
        organizationId: o.organizationId, feature: "greeting-card", orderId: o.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Quét các phiên Thẻ chào quá hạn mở link hoặc quá hạn chọn mẫu
  for (const s of await repo.listPendingSessions(new Date(now.getTime() - HOLD_LOOKBACK_MS))) {
    try {
      const policy = resolveEffectiveStepTimeoutPolicy(s.organization?.settings, s.catalog?.filters)

      // 1. Quá hạn mở link: Khách không mở sau X giờ
      if (isSessionUnopenedExpired({ createdAt: s.created_at, openedAt: s.opened_at }, policy, now)) {
        const reason = `Tự hủy: Quá hạn mở link (${formatTimeoutDuration(policy.unopenedExpiryHours, "hours")})`
        await repo.expireSession(s.organization_id, s.id, reason, now)
        result.sessionsExpired += 1
        continue
      }

      // 2. Quá hạn chọn mẫu: Khách đã mở nhưng ngưng thao tác quá Y giờ
      if (
        isSessionBrowsingExpired(
          { openedAt: s.opened_at, selectedAt: s.selected_at, status: s.status, lastActiveAt: s.last_active_at },
          policy,
          now
        )
      ) {
        const reason = `Tự hủy: Quá hạn chọn sản phẩm (${formatTimeoutDuration(policy.browsingExpiryHours, "hours")})`
        await repo.expireSession(s.organization_id, s.id, reason, now)
        result.sessionsExpired += 1
      }
    } catch (error) {
      log.warn("greeting_card.sweep_session_skipped", {
        organizationId: s.organization_id, feature: "greeting-card", sessionId: s.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // 6. Quét các yêu cầu từ chối nhận đơn của Điều phối quá hạn chờ Điều hành duyệt (mặc định 15 phút) -> Tự động hủy
  try {
    const cancellationRepo = getCancellationFollowUpRepository()
    // Lấy rộng: tất cả PENDING từ ≥ 5 phút trước (mức cấu hình thấp nhất cho phép).
    // Kiểm chính xác từng bản ghi theo policy cụ thể của từng tiệm ở bước dưới.
    const MIN_TIMEOUT_MINUTES = 5
    const expiredCutoff = new Date(now.getTime() - MIN_TIMEOUT_MINUTES * 60_000)
    const expiredRejections = await cancellationRepo.listExpiredCoordinatorRejections(expiredCutoff)
    for (const req of expiredRejections) {
      try {
        const policy = parsePaymentPolicy(req.organization?.settings)
        const timeoutMinutes = policy.cancellationApprovalTimeoutMinutes ?? DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES
        const threshold = new Date(req.created_at.getTime() + timeoutMinutes * 60_000)
        if (now >= threshold) {
          const decided = await cancellationRepo.autoApproveExpired(req.organization_id, req.id, timeoutMinutes)
          // Báo khách như khi Điều hành tự bấm duyệt huỷ
          if (decided.orderStatus === "CANCELLED") {
            queueOrderNotification(req.organization_id, decided.orderId, "CANCELLED")
            queueStaffNotification(req.organization_id, "STUCK_DETECTED", {
              orderId: decided.orderId,
              reason: "Đơn bị kẹt quá thời gian duyệt hủy và đã được hệ thống tự động xử lý",
            })
          }
          result.cancelled += 1
          log.info("greeting_card.cancellation_auto_approved_timeout", {
            organizationId: req.organization_id,
            feature: "greeting-card",
            requestId: req.id,
            orderId: req.order_id,
          })
        }
      } catch (error) {
        log.warn("greeting_card.cancellation_auto_approve_skipped", {
          organizationId: req.organization_id,
          feature: "greeting-card",
          requestId: req.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } catch (error) {
    log.warn("greeting_card.sweep_cancellations_failed", {
      feature: "greeting-card",
      message: error instanceof Error ? error.message : String(error),
    })
  }

  // 7. Đề xuất bỏ hiển thị của Sale quá 5 phút chưa ai duyệt → tự duyệt THẬT (ghi DB, lịch sử, audit),
  // không chỉ "trông như đã duyệt" lúc đọc. Đơn khách vừa trả tiền thì tự duyệt bị từ chối, giữ nguyên.
  try {
    const dismissals = getDismissalRepository()
    for (const d of await dismissals.listExpired(new Date(now.getTime() - DISMISSAL_TIMEOUT_MS))) {
      try {
        await dismissals.autoApprove(d.organizationId, d)
        result.dismissed += 1
      } catch (error) {
        log.warn("greeting_card.dismissal_auto_approve_skipped", {
          organizationId: d.organizationId, feature: "greeting-card", targetId: d.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } catch (error) {
    log.warn("greeting_card.sweep_dismissals_failed", { feature: "greeting-card", message: error instanceof Error ? error.message : String(error) })
  }

  return result
}

