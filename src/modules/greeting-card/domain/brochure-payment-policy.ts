/**
 * Chính sách thu tiền đơn Thẻ chào theo tiệm (`organizations.settings.brochure_policy`):
 * đặt cọc %, có bắt thu tiền trước khi chế tác / thu đủ trước khi giao không.
 * Pure TypeScript — dùng chung server (chặn thao tác) và UI (khoá nút, báo lý do).
 */

import type { CoordinatorAction } from "./brochure-commerce-rules"
import type { PaymentPurpose } from "./brochure-policy-resolvers"

export const BROCHURE_POLICY_SETTINGS_KEY = "brochure_policy"

/**
 * Cơ chế kích hoạt bước tiếp theo (Theo dõi tiến độ / Chuyển sang chế tác):
 * - "PAYMENT_ONLY": Chỉ khi Điều hành xác nhận đã thanh toán (đủ hoặc cọc) thì mới trigger bước tiếp theo.
 * - "PAYMENT_OR_COORDINATOR": Cho phép thêm việc Điều phối xác nhận Nhận đơn là trigger bước tiếp theo (mặc định linh hoạt).
 */
export type TrackingTriggerPolicy = "PAYMENT_ONLY" | "PAYMENT_OR_COORDINATOR"
export const DEFAULT_TRACKING_TRIGGER_POLICY: TrackingTriggerPolicy = "PAYMENT_OR_COORDINATOR"
/**
 * Xác nhận tiền thu nốt mặc định CHỈ Điều hành (PO 04/11/2026, Q3 phương án b — checklist ALG 1.16);
 * Điều hành bật lại "Điều phối xác nhận qua ảnh bill" trong Cài đặt nếu muốn. Không kế thừa
 * `trackingTriggerPolicy` khi chưa cài riêng.
 */
export const DEFAULT_BALANCE_PAYMENT_TRIGGER_POLICY: TrackingTriggerPolicy = "PAYMENT_ONLY"

export interface BrochurePaymentPolicy {
  /** 0 = khách trả đủ ngay; 1–99 = lần đầu chỉ cần cọc chừng ấy %. */
  depositPercent: number
  requirePaidBeforeProduction: boolean
  requireFullBeforeDispatch: boolean
  /** Số phút giữ đơn chờ chuyển khoản lần đầu (hiện đồng hồ đếm ngược cho khách); 0 = không hiện. */
  holdMinutes?: number
  /** Hết hạn giữ đơn + 60 phút mà khách chưa chuyển, chưa báo đã chuyển → tự huỷ đơn. Mặc định tắt. */
  autoCancelUnpaid?: boolean
  /**
   * Hạn thanh toán (PO 08/10/2026), tính từ lúc khách thấy thông tin chuyển khoản: hết hạn mà chưa
   * nhận được tiền và khách chưa bấm "Tôi đã chuyển khoản" → thanh toán thất bại, đơn tự huỷ ngay
   * (không chờ thêm). Có giá trị thì thay `holdMinutes` cho đồng hồ của khách. Thiếu = tắt.
   */
  paymentTimeoutMinutes?: number
  /**
   * Bắt buộc khách tải ảnh chuyển khoản trước khi bấm "Tôi đã chuyển khoản"; mặc định BẬT (true).
   */
  requirePaymentProof?: boolean
  /**
   * Cơ chế kích hoạt bước tiếp theo (Theo dõi tiến độ / Chuyển sang chế tác).
   */
  trackingTriggerPolicy?: TrackingTriggerPolicy
  /**
   * Cơ chế xác nhận thanh toán lần 2 (đặt cọc → đủ, trước khi ship) khi `requireFullBeforeDispatch = true`:
   * - "PAYMENT_ONLY": Chỉ Điều hành xác nhận mới được phép (chặt chẽ).
   * - "PAYMENT_OR_COORDINATOR": Điều phối cũng được phép xác nhận qua ảnh bill (mặc định, linh hoạt).
   * Nếu không đặt, kế thừa `trackingTriggerPolicy`; nếu cả hai đều không đặt, mặc định "PAYMENT_OR_COORDINATOR".
   */
  balancePaymentTriggerPolicy?: TrackingTriggerPolicy
  /**
   * Bắt buộc chụp ảnh hoa thành phẩm (QC) trước khi Giao Ship; mặc định BẬT (true).
   * Khi tắt (false): Điều phối có thể xuất giao mà không bị chặn, nhưng vẫn cho phép upload ảnh tự nguyện nếu muốn.
   */
  requireProductPhotoQC?: boolean
  /**
   * Bắt buộc chụp ảnh người nhận hoa; mặc định BẬT (true).
   * Khi tắt (false): Điều phối có thể hoàn tất đơn mà không bị chặn, nhưng vẫn cho phép upload ảnh tự nguyện nếu muốn.
   */
  requireRecipientPhoto?: boolean
  /**
   * Thời gian chờ Điều hành duyệt yêu cầu từ chối nhận đơn của Điều phối (phút).
   * Mặc định: 15 phút. Quá thời gian này sẽ tự động hủy đơn và chuyển hoàn tiền.
   */
  cancellationApprovalTimeoutMinutes?: number
  /**
   * Chế độ AUTO Ngày Lễ / Cao điểm (Holiday Auto-Preset):
   * Khi bật, tự động áp dụng bộ cấu hình giải phóng vận hành, mở phân quyền cho Điều phối
   * và tăng tốc độ xử lý đơn hàng. Mặc định: TẮT (false).
   */
  holidayAutoMode?: boolean
  /**
   * Tự động duyệt thanh toán khi khách đã tải ảnh bill chuyển khoản quá N phút mà chưa ai duyệt.
   * Mặc định: TẮT (false). Khi bật (đặc biệt trong ngày lễ), thời gian mặc định là 15 phút.
   */
  autoApprovePaymentWithProof?: boolean
  autoApprovePaymentWithProofMinutes?: number
  /**
   * Thời gian đếm ngược duyệt ảnh hoa thành phẩm (phút).
   * Hết thời gian này nếu khách không phản hồi thì tự động duyệt và mở Giao Ship. Mặc định: 10 phút.
   */
  productPhotoReviewMinutes?: number
  /** Shipper được thu tiền mặt phần còn lại khi giao. Mặc định TẮT: khách luôn chuyển khoản (PO 14/10/2026). */
  allowShipperCash?: boolean
  /**
   * AI (GPT-4o) đọc ảnh bill để đối soát tài khoản/số tiền. Mặc định TẮT để không tốn token (PO 14/10/2026).
   * Bật = ảnh bill (tên, số tài khoản, số tiền của khách) được gửi sang OpenAI để đọc.
   */
  aiReadPaymentProof?: boolean
}

/** Hạn thanh toán gợi ý khi Điều hành bật (PO 08/10/2026). */
export const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 30
/** Thời gian chờ Điều hành duyệt từ chối nhận đơn mặc định: 15 phút. */
export const DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES = 15

const minutesIn = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 5 && v <= 1440 ? v : null

export const DEFAULT_PAYMENT_POLICY: BrochurePaymentPolicy = {
  depositPercent: 0,
  requirePaidBeforeProduction: false,
  requireFullBeforeDispatch: false,
  requirePaymentProof: true,
  trackingTriggerPolicy: DEFAULT_TRACKING_TRIGGER_POLICY,
  balancePaymentTriggerPolicy: DEFAULT_BALANCE_PAYMENT_TRIGGER_POLICY,
  requireProductPhotoQC: true,
  requireRecipientPhoto: true,
  cancellationApprovalTimeoutMinutes: DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES,
  holidayAutoMode: false,
  autoApprovePaymentWithProof: false,
  autoApprovePaymentWithProofMinutes: 15,
  productPhotoReviewMinutes: 10,
  allowShipperCash: false,
  aiReadPaymentProof: false,
}

/**
 * Tự động chuyển đổi toàn bộ chính sách theo Chế độ Cao điểm / Ngày lễ (AUTO Preset).
 */
export function applyHolidayAutoPreset(policy: BrochurePaymentPolicy, enable: boolean): BrochurePaymentPolicy {
  if (enable) {
    return {
      ...policy,
      holidayAutoMode: true,
      trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR",
      balancePaymentTriggerPolicy: "PAYMENT_OR_COORDINATOR",
      autoApprovePaymentWithProof: true,
      autoApprovePaymentWithProofMinutes: 15,
      cancellationApprovalTimeoutMinutes: 30, // Chuyển sau 30 phút theo chỉ đạo PO
      paymentTimeoutMinutes: 30,             // Rút ngắn còn 30 phút
      autoCancelUnpaid: true,
      requireProductPhotoQC: false,          // Không bắt buộc ảnh QC
      requireRecipientPhoto: false,          // Không bắt buộc ảnh người nhận
      productPhotoReviewMinutes: 10,         // Vẫn giữ tiêu chuẩn 10' đếm ngược
    }
  }
  return {
    ...policy,
    holidayAutoMode: false,
    autoApprovePaymentWithProof: false,
    cancellationApprovalTimeoutMinutes: DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES,
    requireProductPhotoQC: true,
    requireRecipientPhoto: true,
    productPhotoReviewMinutes: 10,
  }
}

export function parsePaymentPolicy(settings: unknown): BrochurePaymentPolicy {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[BROCHURE_POLICY_SETTINGS_KEY]
  const stepRaw = root["step_timeout_policy"] as Record<string, unknown> | undefined

  if (!raw || typeof raw !== "object") {
    if (stepRaw && typeof stepRaw === "object") {
      const stepTimeout = minutesIn(stepRaw.unpaid_expiry_minutes)
      const autoCancel = stepRaw.auto_cancel_unpaid !== false
      if (stepTimeout && autoCancel) {
        return {
          ...DEFAULT_PAYMENT_POLICY,
          autoCancelUnpaid: true,
          paymentTimeoutMinutes: stepTimeout,
        }
      }
    }
    return DEFAULT_PAYMENT_POLICY
  }

  const r = raw as Record<string, unknown>
  const hold = minutesIn(r.hold_minutes)
  const timeout = minutesIn(r.payment_timeout_minutes) ?? (stepRaw && stepRaw.auto_cancel_unpaid !== false ? minutesIn(stepRaw.unpaid_expiry_minutes) : null)
  const autoCancel = r.auto_cancel_unpaid === true || (stepRaw?.auto_cancel_unpaid === true)
  const pct = typeof r.deposit_percent === "number" && Number.isFinite(r.deposit_percent) ? Math.round(r.deposit_percent) : 0
  const requireProof = r.require_payment_proof !== false
  const requireProductPhotoQC = r.require_product_photo_qc !== false
  const requireRecipientPhoto = r.require_recipient_photo !== false
  const cancelTimeout = minutesIn(r.cancellation_approval_timeout_minutes) ?? DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES
  const triggerPolicy: TrackingTriggerPolicy =
    r.tracking_trigger_policy === "PAYMENT_ONLY" ? "PAYMENT_ONLY" : "PAYMENT_OR_COORDINATOR"
  const balanceTriggerPolicy: TrackingTriggerPolicy =
    r.balance_payment_trigger_policy === "PAYMENT_ONLY" ? "PAYMENT_ONLY"
    : r.balance_payment_trigger_policy === "PAYMENT_OR_COORDINATOR" ? "PAYMENT_OR_COORDINATOR"
    : DEFAULT_BALANCE_PAYMENT_TRIGGER_POLICY

  return {
    depositPercent: pct >= 1 && pct <= 99 ? pct : 0,
    requirePaidBeforeProduction: r.require_paid_before_production === true,
    requireFullBeforeDispatch: r.require_full_before_dispatch === true,
    requirePaymentProof: requireProof,
    requireProductPhotoQC,
    requireRecipientPhoto,
    cancellationApprovalTimeoutMinutes: cancelTimeout,
    trackingTriggerPolicy: triggerPolicy,
    balancePaymentTriggerPolicy: balanceTriggerPolicy,
    holidayAutoMode: r.holiday_auto_mode === true,
    autoApprovePaymentWithProof: r.auto_approve_payment_with_proof === true,
    autoApprovePaymentWithProofMinutes: minutesIn(r.auto_approve_payment_with_proof_minutes) ?? 15,
    productPhotoReviewMinutes: minutesIn(r.product_photo_review_minutes) ?? 10,
    allowShipperCash: r.allow_shipper_cash === true,
    aiReadPaymentProof: r.ai_read_payment_proof === true,
    // Chỉ thêm khoá khi tiệm bật giữ đơn — chính sách cũ giữ nguyên hình dạng
    ...(hold ? { holdMinutes: hold } : {}),
    ...(autoCancel ? { autoCancelUnpaid: true } : {}),
    ...(timeout ? { paymentTimeoutMinutes: timeout } : {}),
  }
}

/**
 * Ghi chính sách về dạng lưu (`brochure_policy`). Mọi màn sửa chính sách đều ghi qua hàm này —
 * PATCH `/organizations/current` thay NGUYÊN khoá `brochure_policy`, thiếu trường là mất cài đặt.
 */
export function serializePaymentPolicy(policy: BrochurePaymentPolicy): Record<string, unknown> {
  return {
    deposit_percent: policy.depositPercent,
    require_paid_before_production: policy.requirePaidBeforeProduction,
    require_full_before_dispatch: policy.requireFullBeforeDispatch,
    hold_minutes: policy.holdMinutes ?? 0,
    auto_cancel_unpaid: policy.autoCancelUnpaid === true,
    payment_timeout_minutes: policy.paymentTimeoutMinutes ?? 0,
    require_payment_proof: policy.requirePaymentProof !== false,
    require_product_photo_qc: policy.requireProductPhotoQC !== false,
    require_recipient_photo: policy.requireRecipientPhoto !== false,
    cancellation_approval_timeout_minutes: policy.cancellationApprovalTimeoutMinutes ?? DEFAULT_CANCELLATION_APPROVAL_TIMEOUT_MINUTES,
    tracking_trigger_policy: policy.trackingTriggerPolicy ?? DEFAULT_TRACKING_TRIGGER_POLICY,
    balance_payment_trigger_policy: policy.balancePaymentTriggerPolicy ?? DEFAULT_BALANCE_PAYMENT_TRIGGER_POLICY,
    holiday_auto_mode: policy.holidayAutoMode === true,
    auto_approve_payment_with_proof: policy.autoApprovePaymentWithProof === true,
    auto_approve_payment_with_proof_minutes: policy.autoApprovePaymentWithProofMinutes ?? 15,
    product_photo_review_minutes: policy.productPhotoReviewMinutes ?? 10,
    allow_shipper_cash: policy.allowShipperCash === true,
    ai_read_payment_proof: policy.aiReadPaymentProof === true,
  }
}

export { resolveRequirePaymentProof, resolveTrackingTriggerPolicy, resolveBalancePaymentTriggerPolicy } from "./brochure-policy-resolvers"

/**
 * Số tiền khách nên chuyển LẦN NÀY: lần đầu theo % cọc (làm tròn lên nghìn),
 * các lần sau là phần còn lại.
 */
export function expectedPayment(
  policy: BrochurePaymentPolicy,
  totalVnd: number,
  paidVnd: number
): { amountVnd: number; purpose: PaymentPurpose } {
  const balance = Math.max(0, totalVnd - paidVnd)
  if (paidVnd > 0) return { amountVnd: balance, purpose: "BALANCE" }
  if (policy.depositPercent > 0) {
    const deposit = Math.min(balance, Math.ceil((totalVnd * policy.depositPercent) / 100 / 1000) * 1000)
    if (deposit < balance) return { amountVnd: deposit, purpose: "DEPOSIT" }
  }
  return { amountVnd: balance, purpose: "FULL" }
}

/**
 * Lý do chặn tác vụ xưởng vì chưa thu tiền theo chính sách, hoặc `null`.
 *
 * Luật đặc biệt cho Giao Ship (PO 11/10/2026):
 * - Đơn đặt cọc (paidVnd > 0 && paidVnd < totalVnd): LUÔN chặn đến khi Điều hành hoặc
 *   Điều phối xác nhận khoản thanh toán lần 2 — bất kể chính sách requireFullBeforeDispatch.
 *   Sau xác nhận, paid_vnd = total_vnd → điều kiện này tự mở.
 * - Đơn chưa thu gì: chặn chỉ khi tiệm bật requireFullBeforeDispatch.
 */
export function paymentGateBlocker(
  action: CoordinatorAction,
  policy: BrochurePaymentPolicy,
  money: { totalVnd: number; paidVnd: number }
): string | null {
  const producing = action === "assign-florist" || action === "product-photo"
  if (producing && policy.requirePaidBeforeProduction && money.paidVnd <= 0) {
    return "Tiệm yêu cầu thu cọc/thanh toán trước khi chế tác"
  }
  if (action === "dispatch-shipping") {
    const hasQuote = money.totalVnd > 0
    // Đơn đặt cọc: chặn cho đến khi Điều hành / Điều phối xác nhận lần 2 — trừ khi tiệm cho shipper
    // thu tiền mặt phần còn lại lúc giao (và không bắt thu đủ trước khi giao) (PO 14/10/2026)
    const shipperCollects = policy.allowShipperCash === true && !policy.requireFullBeforeDispatch
    if (hasQuote && money.paidVnd > 0 && money.paidVnd < money.totalVnd && !shipperCollects) {
      return "Đơn đặt cọc — cần Điều hành hoặc Điều phối xác nhận đã nhận tiền lần 2 trước khi giao ship"
    }
    // Đơn chưa báo giá hoặc chưa thu tiền: chặn nếu tiệm yêu cầu thu đủ trước khi giao
    if (policy.requireFullBeforeDispatch) {
      if (!hasQuote) return "Đơn chưa báo giá — báo giá và thu đủ tiền trước khi giao hoa"
      if (money.paidVnd <= 0) return "Tiệm yêu cầu thu đủ tiền trước khi giao hoa"
    }
  }
  return null
}

/** Huỷ được khi đơn chưa giao xong/chưa huỷ. */
export function cancelBlocker(s: { status: string; deliveryStatus: string }): string | null {
  if (s.status === "CANCELLED") return "Đơn hàng đã huỷ trước đó"
  if (s.status === "COMPLETED" || s.deliveryStatus === "DELIVERED") return "Đơn đã giao xong, không thể huỷ"
  return null
}

/** Số tiền tối đa cửa hàng được báo cho một đơn Thẻ chào. */
export const MAX_QUOTE_VND = 1_000_000_000

/**
 * Lý do không báo giá được cho đơn, hoặc `null`. Chỉ báo giá đơn đang chờ
 * (tổng 0 — khách đặt mẫu chưa niêm yết giá), chưa huỷ.
 */
export function quoteBlocker(order: { status: string; totalVnd: number }, totalVnd: number): string | null {
  if (order.status === "CANCELLED") return "Đơn hàng đã huỷ"
  if (order.totalVnd > 0) return "Đơn hàng đã có giá, không báo giá lại được"
  if (!Number.isInteger(totalVnd) || totalVnd <= 0 || totalVnd > MAX_QUOTE_VND) return "Số tiền báo giá không hợp lệ"
  return null
}

/**
 * Hạn giữ đơn (ISO) khi tiệm bật hạn thanh toán / giữ đơn và khách chưa trả đồng nào; ngược lại
 * `null`. Hạn thanh toán (`paymentTimeoutMinutes`) thắng giữ đơn cũ (`holdMinutes`).
 */
export function paymentHoldUntil(
  policy: BrochurePaymentPolicy,
  order: { paidVnd: number; createdAt?: Date | undefined },
): string | null {
  const minutes = policy.paymentTimeoutMinutes ?? policy.holdMinutes ?? 0
  if (minutes <= 0 || order.paidVnd > 0 || !order.createdAt) return null
  return new Date(order.createdAt.getTime() + minutes * 60_000).toISOString()
}
