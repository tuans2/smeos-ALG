/**
 * brochure-workflow-policy.ts
 *
 * Domain Model & Evaluation Rules cho Ma Trận Bật/Tắt Quy Trình Thẻ Chào Mẫu Hoa.
 * SSOT: PLAN-2026-THE-CHAO-WORKFLOW-MATRIX-01 (docs/kien-truc/KE_HOACH_MA_TRAN_QUY_TRINH_THE_CHAO.md)
 * Pure TypeScript — Tuyệt đối không import Prisma hoặc external infrastructure.
 */

export const BROCHURE_WORKFLOW_POLICY_KEY = "brochure_workflow_policy"

export type WorkflowPreset = "LEAN" | "STANDARD" | "STRICT" | "CUSTOM"

export type CustomerApprovalMode = "BYPASS" | "AUTO_PASS_10M" | "REQUIRE_CUSTOMER"

export interface BrochureWorkflowPolicy {
  preset: WorkflowPreset
  /** Gate 1: Bắt buộc Điều hành duyệt tiền cọc (false = cho phép Điều phối/Sale xác nhận cọc khi có bill) */
  requireAdminDepositApproval: boolean
  /** Gate 2: Bắt buộc Điều phối thẩm định các cửa hàng trong chuỗi & nhận đơn (true = Chuỗi; false = 1 Cửa hàng, tự động nhận khi duyệt tiền) */
  requireCoordinatorAcceptance: boolean
  /** Gate 3: Bắt buộc chụp Ảnh thành phẩm trước khi giao (false = tùy chọn, có nút bỏ qua ảnh) */
  requireFinishedPhoto: boolean
  /** Gate 4: Cơ chế khách duyệt ảnh thành phẩm (Bỏ qua / Tự động duyệt sau 10p / Bắt buộc khách bấm duyệt) */
  customerApprovalMode: CustomerApprovalMode
  /** Gate 5: Chặn giao ship nếu chưa thu đủ Lần 2 (false = cho phép giao trước thu COD hoặc ghi nợ) */
  requireFullPaymentBeforeDispatch: boolean
  /**
   * Gate 6: Bắt buộc chụp Ảnh người nhận/bằng chứng giao hoa mới cho hoàn tất đơn. PO 04/11/2026
   * (checklist ALG 4.18, Q5): BẬT ở mọi gói; Điều hành tắt được bằng công tắc trong Cài đặt.
   */
  requireDeliveryProofPhoto: boolean
  /**
   * Gate 7: Cho phép Điều phối / Sale ủy quyền duyệt cọc thay Điều hành khi quá hạn SLA. PO 04/11/2026
   * (Q3 phương án b — checklist ALG 1.16): TẮT ở mọi gói; Điều hành tự bật trong Cài đặt nếu muốn.
   */
  allowSlaEscalation: boolean
  /** Số phút quá hạn SLA để kích hoạt nút ủy quyền duyệt cọc (mặc định 15) */
  slaEscalationMinutes: number
}

/** 1. Gói Vận Hành Tinh Gọn (Lean / Fast-track): Dành cho tiệm nhỏ 1–3 người, tối ưu tốc độ */
export const LEAN_WORKFLOW_POLICY: Readonly<BrochureWorkflowPolicy> = Object.freeze({
  preset: "LEAN",
  requireAdminDepositApproval: false,
  requireCoordinatorAcceptance: false,
  requireFinishedPhoto: false,
  customerApprovalMode: "BYPASS",
  requireFullPaymentBeforeDispatch: false,
  requireDeliveryProofPhoto: true,
  allowSlaEscalation: false,
  slaEscalationMinutes: 5,
})

/** 2. Gói Vận Hành Tiêu Chuẩn (Standard Boutique): Dành cho tiệm vừa 4–10 người, mặc định an toàn */
export const STANDARD_WORKFLOW_POLICY: Readonly<BrochureWorkflowPolicy> = Object.freeze({
  preset: "STANDARD",
  requireAdminDepositApproval: true,
  requireCoordinatorAcceptance: false,
  // PO 15/10/2026: mặc định Điều phối được bỏ qua ảnh — chỉ gói Nghiêm ngặt bắt buộc ảnh
  requireFinishedPhoto: false,
  customerApprovalMode: "AUTO_PASS_10M",
  requireFullPaymentBeforeDispatch: true,
  requireDeliveryProofPhoto: true,
  allowSlaEscalation: false,
  slaEscalationMinutes: 15,
})

/** 3. Gói Vận Hành Nghiêm Ngặt (Strict Enterprise): Dành cho chuỗi lớn & xưởng cao cấp, kiểm soát chặt */
export const STRICT_WORKFLOW_POLICY: Readonly<BrochureWorkflowPolicy> = Object.freeze({
  preset: "STRICT",
  requireAdminDepositApproval: true,
  requireCoordinatorAcceptance: true,
  requireFinishedPhoto: true,
  customerApprovalMode: "REQUIRE_CUSTOMER",
  requireFullPaymentBeforeDispatch: true,
  requireDeliveryProofPhoto: true,
  allowSlaEscalation: false,
  slaEscalationMinutes: 15,
})

/**
 * Chuỗi / 1 cửa hàng do Admin SaaS duyệt qua `organizations.type` (PO 22/10/2026) — tiệm không tự
 * bật tắt, gói vận hành cũng không ghi đè. Trước đó gói "Nghiêm ngặt" bật chế độ Chuỗi cho cả tiệm
 * 1 cửa hàng, gói "Tiêu chuẩn" tắt nó với tổ chức Chuỗi.
 */
export function isChainOrganizationType(orgType: string | null | undefined): boolean {
  return orgType === "CHAIN" // FLOWER_NETWORK đã gộp vào CHAIN (ADR-012 T-8b)
}

/** Lý do từ chối khi tổ chức 1 cửa hàng gọi tính năng của Chuỗi (mời chi nhánh, nhập chi nhánh). */
export const CHAIN_ONLY_MESSAGE = "Tính năng này dành cho mô hình Chuỗi cửa hàng. Gửi yêu cầu đổi mô hình cho Admin SaaS duyệt."

/** Nhận diện preset tương ứng từ các giá trị cấu hình (không xét chế độ Chuỗi — không phải lựa chọn của tiệm) */
export function detectWorkflowPreset(policy: Omit<BrochureWorkflowPolicy, "preset">): WorkflowPreset {
  const isMatch = (target: BrochureWorkflowPolicy) =>
    target.requireAdminDepositApproval === policy.requireAdminDepositApproval &&
    target.requireFinishedPhoto === policy.requireFinishedPhoto &&
    target.customerApprovalMode === policy.customerApprovalMode &&
    target.requireFullPaymentBeforeDispatch === policy.requireFullPaymentBeforeDispatch &&
    target.requireDeliveryProofPhoto === policy.requireDeliveryProofPhoto &&
    target.allowSlaEscalation === policy.allowSlaEscalation

  if (isMatch(LEAN_WORKFLOW_POLICY)) return "LEAN"
  if (isMatch(STANDARD_WORKFLOW_POLICY)) return "STANDARD"
  if (isMatch(STRICT_WORKFLOW_POLICY)) return "STRICT"
  return "CUSTOM"
}

/**
 * Đọc cấu hình từ settings của tổ chức, bảo đảm tương thích ngược với cài đặt cũ. Truyền `orgType`
 * thì chế độ Chuỗi theo loại tổ chức, bỏ qua giá trị đã lưu và gói đã chọn.
 */
export function parseBrochureWorkflowPolicy(settings: unknown, orgType?: string | null): BrochureWorkflowPolicy {
  const policy = parseStoredWorkflowPolicy(settings, orgType)
  return orgType === undefined ? policy : { ...policy, requireCoordinatorAcceptance: isChainOrganizationType(orgType) }
}

function parseStoredWorkflowPolicy(settings: unknown, orgType?: string | null): BrochureWorkflowPolicy {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[BROCHURE_WORKFLOW_POLICY_KEY] as Record<string, unknown> | undefined

  // Nếu là tổ chức Chuỗi (CHAIN): mặc định cần điều phối nhận đơn
  const defaultForOrg = isChainOrganizationType(orgType)

  // Nếu chưa có cài đặt workflow mới, kế thừa thông minh từ brochure_policy cũ nếu có
  if (!raw || typeof raw !== "object") {
    const legacy = root["brochure_policy"] as Record<string, unknown> | undefined
    if (legacy && typeof legacy === "object") {
      const requireFull = legacy.require_full_before_dispatch === true
      const requirePhotoQC = legacy.require_product_photo_qc !== false

      const partial: Omit<BrochureWorkflowPolicy, "preset"> = {
        // PO 14/10/2026: mặc định mọi tiệm chỉ Điều hành duyệt cọc — cấu hình cũ không nới quyền này
        requireAdminDepositApproval: true,
        requireCoordinatorAcceptance: defaultForOrg,
        // Tiệm cũ chưa từng chọn gói Nghiêm ngặt → được bỏ qua ảnh (PO 15/10/2026)
        requireFinishedPhoto: false,
        customerApprovalMode: requirePhotoQC ? "AUTO_PASS_10M" : "BYPASS",
        requireFullPaymentBeforeDispatch: requireFull,
        requireDeliveryProofPhoto: legacy.require_recipient_photo !== false,
        allowSlaEscalation: false,
        slaEscalationMinutes: 15,
      }
      return {
        ...partial,
        preset: detectWorkflowPreset(partial),
      }
    }
    return defaultForOrg
      ? { ...STRICT_WORKFLOW_POLICY }
      : { ...STANDARD_WORKFLOW_POLICY }
  }

  const approvalMode: CustomerApprovalMode =
    raw.customer_approval_mode === "BYPASS" ||
    raw.customer_approval_mode === "AUTO_PASS_10M" ||
    raw.customer_approval_mode === "REQUIRE_CUSTOMER"
      ? raw.customer_approval_mode
      : "AUTO_PASS_10M"

  const escalationMin =
    typeof raw.sla_escalation_minutes === "number" &&
    Number.isInteger(raw.sla_escalation_minutes) &&
    raw.sla_escalation_minutes >= 1 &&
    raw.sla_escalation_minutes <= 120
      ? raw.sla_escalation_minutes
      : 15

  const partial: Omit<BrochureWorkflowPolicy, "preset"> = {
    requireAdminDepositApproval: raw.require_admin_deposit_approval !== false,
    requireCoordinatorAcceptance:
      typeof raw.require_coordinator_acceptance === "boolean"
        ? raw.require_coordinator_acceptance
        : defaultForOrg,
    requireFinishedPhoto: raw.require_finished_photo === true,
    customerApprovalMode: approvalMode,
    requireFullPaymentBeforeDispatch: raw.require_full_payment_before_dispatch !== false,
    requireDeliveryProofPhoto: raw.require_delivery_proof_photo !== false,
    allowSlaEscalation: raw.allow_sla_escalation === true,
    slaEscalationMinutes: escalationMin,
  }

  const requestedPreset = typeof raw.preset === "string" ? (raw.preset as WorkflowPreset) : null
  // Gói có tên (không phải Tự chỉnh): hai công tắc ảnh theo định nghĩa gói hiện hành — tiệm lưu gói
  // Tiêu chuẩn trước 15/10/2026 (khi gói này còn bắt buộc ảnh) không bị khoá nút "Bỏ qua ảnh"
  const named = requestedPreset === "LEAN" ? LEAN_WORKFLOW_POLICY : requestedPreset === "STANDARD" ? STANDARD_WORKFLOW_POLICY : requestedPreset === "STRICT" ? STRICT_WORKFLOW_POLICY : null
  if (named) {
    partial.requireCoordinatorAcceptance = named.requireCoordinatorAcceptance
    partial.requireFinishedPhoto = named.requireFinishedPhoto
    partial.requireDeliveryProofPhoto = named.requireDeliveryProofPhoto
  }
  const detected = detectWorkflowPreset(partial)
  const finalPreset: WorkflowPreset = requestedPreset === "CUSTOM" || detected === requestedPreset ? (requestedPreset ?? detected) : detected

  return {
    ...partial,
    preset: finalPreset,
  }
}

/** Chuyển đổi chính sách thành payload lưu vào database */
export function serializeWorkflowPolicy(policy: BrochureWorkflowPolicy): Record<string, unknown> {
  return {
    preset: policy.preset,
    require_admin_deposit_approval: policy.requireAdminDepositApproval,
    require_coordinator_acceptance: policy.requireCoordinatorAcceptance,
    require_finished_photo: policy.requireFinishedPhoto,
    customer_approval_mode: policy.customerApprovalMode,
    require_full_payment_before_dispatch: policy.requireFullPaymentBeforeDispatch,
    require_delivery_proof_photo: policy.requireDeliveryProofPhoto,
    allow_sla_escalation: policy.allowSlaEscalation,
    sla_escalation_minutes: policy.slaEscalationMinutes,
  }
}

/** Kiểm tra xem đơn hàng có phải đơn hỏa tốc cần kích hoạt đường hầm hỏa tốc không */
export function isUrgentOrder(
  order: { isUrgent?: boolean | null | undefined; deliveryDate?: string | null | undefined; deliveryTimeSlot?: string | null | undefined },
  now: Date = new Date(),
): boolean {
  if (order.isUrgent) return true
  if (order.deliveryDate && order.deliveryTimeSlot) {
    const match = order.deliveryTimeSlot.match(/^(\d{1,2}):(\d{2})/)
    if (match && match[1] && match[2]) {
      const h = parseInt(match[1], 10)
      const m = parseInt(match[2], 10)
      const parts = order.deliveryDate.split("-").map(Number)
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        // Khung giờ giao là giờ Việt Nam (UTC+7) — không phụ thuộc múi giờ máy chủ
        const slotDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], h - 7, m, 0, 0))
        const diffMinutes = (slotDate.getTime() - now.getTime()) / 60_000
        if (diffMinutes > 0 && diffMinutes <= 120) return true
      }
    }
  }
  return false
}

/**
 * Vai trò duyệt cọc theo NĂNG LỰC của người bấm, không theo màn đang mở: ai có quyền ghi nhận
 * thanh toán (R11 — Điều hành/kế toán) là duyệt với tư cách Điều hành. Trước đây route Điều phối
 * luôn coi là "COORDINATOR" nên Điều hành bấm "Xác nhận Tiền Cọc" bị chặn bởi chính cài đặt
 * "chỉ Điều hành duyệt cọc" (16/10/2026).
 */
export function depositApproverRole(canRecordPayment: boolean): "ADMIN" | "COORDINATOR" {
  return canRecordPayment ? "ADMIN" : "COORDINATOR"
}

/** Đánh giá xem vai trò hiện tại có quyền xác nhận cọc cho đơn không */
export function canRoleApproveDeposit(
  role: "ADMIN" | "COORDINATOR" | "SALE",
  policy: BrochureWorkflowPolicy,
  context?: { isOverdueSla?: boolean; isUrgent?: boolean },
): boolean {
  if (role === "ADMIN") return true
  // Đơn hỏa tốc: Điều phối và Sale phụ trách đều được quyền duyệt cọc ngay lập tức
  if (context?.isUrgent) return true
  // Nếu chính sách tiệm không bắt buộc Điều hành duyệt
  if (!policy.requireAdminDepositApproval) return true
  // Nếu cho phép ủy quyền khi quá hạn SLA
  if (policy.allowSlaEscalation && context?.isOverdueSla) return true
  return false
}

/** Đánh giá xem có cho phép bỏ qua ảnh thành phẩm không */
export function canBypassFinishedPhoto(policy: Pick<BrochureWorkflowPolicy, "requireFinishedPhoto">): boolean {
  // PO 15/10/2026: tiệm bắt buộc ảnh (gói Nghiêm ngặt) thì đơn hoả tốc cũng không được bỏ qua
  return !policy.requireFinishedPhoto
}

/** Đánh giá xem có cho phép bỏ qua ảnh bàn giao người nhận không */
export function canBypassDeliveryPhoto(policy: Pick<BrochureWorkflowPolicy, "requireDeliveryProofPhoto">): boolean {
  return !policy.requireDeliveryProofPhoto
}

/** Đánh giá xem có chặn xuất giao (Giao Ship) do chưa thu đủ tiền lần 2 không */
export function shouldBlockDispatchForBalance(
  policy: BrochureWorkflowPolicy,
  money: { totalVnd: number; paidVnd: number },
  isUrgent: boolean = false,
): boolean {
  if (isUrgent) return false
  if (!policy.requireFullPaymentBeforeDispatch) return false
  return money.paidVnd < money.totalVnd && money.totalVnd > 0
}
