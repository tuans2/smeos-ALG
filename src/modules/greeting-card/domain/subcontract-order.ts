/**
 * subcontract-order.ts
 *
 * Domain State Machine cho Thẻ Gia Công & Cơ chế Khóa Đồng Thời, Hủy trong hạn (Grace Period).
 * Clean Architecture — Pure TypeScript, 100% không phụ thuộc cơ sở dữ liệu.
 */

import type { CraftFeeDeduction, CraftFeeLine, CraftFeeMethod } from "./craft-fee-policy"

export type SubcontractDispatchStatus =
  | "OPEN" // Đang mở để các chi nhánh trong vòng nhận đơn
  | "CLAIMED_GRACE" // 1 chi nhánh đã nhận, đang trong thời gian đếm ngược kiểm tra kho (Grace Period)
  | "COMMITTED" // Đã chốt chính thức cho chi nhánh (hết hạn hủy hoặc chi nhánh cam kết làm ngay)
  | "ESCALATED" // Hết các vòng hoặc không ai nhận -> Chuyển Điều phối can thiệp
  | "CANCELLED" // Đơn đã bị hủy

/** Thẻ mời nhận đơn đã gửi riêng cho một chi nhánh trên Telegram — để sửa lại khi đơn đổi trạng thái */
export interface InviteCardRef {
  msgId: string
  chatId: string
  isCaption: boolean
  /** Nội dung thẻ lúc mời (HTML) và link nhận đơn — dùng để mở lại thẻ khi đơn quay về OPEN */
  text: string
  claimUrl: string
}

export interface SubcontractOrderState {
  orderId: string
  orderCode: string
  dispatchStatus: SubcontractDispatchStatus
  currentRound: number
  /** Chi nhánh hiện đang tạm giữ hoặc đã nhận đơn */
  claimedBranchId: string | null
  claimedBranchName?: string | null | undefined
  claimedAt: string | null // ISO Date String
  graceExpiresAt: string | null // ISO Date String
  /** Danh sách các chi nhánh đã từng nhận rồi hủy, hoặc bấm từ chối */
  declinedBranchIds: string[]
  /** Danh sách các chi nhánh đã được gửi lời mời ở vòng hiện tại */
  invitedBranchIds: string[]
  /** Chi nhánh đã được mời ở các vòng trước — không mời lại ở vòng sau */
  previouslyInvitedBranchIds?: string[] | undefined
  roundExpiresAt: string | null
  /**
   * Lưu vết thời điểm đã gửi các tin nhắn nhắc việc theo mốc JSON (Tránh gửi trùng hoặc bỏ sót)
   * Key: mã mốc (vd: M1_PREP, M2_QC, M3_DISPATCH, M4_OVERDUE) -> Value: ISO timestamp
   */
  remindersSent?: Record<string, string> | undefined
  /** @deprecated Thẻ đơn lẻ kiểu cũ (của chi nhánh được mời CUỐI CÙNG) — chỉ còn trong dữ liệu cũ, không dùng để sửa. */
  telegramMsgId?: string | null | undefined
  /** @deprecated xem `telegramMsgId`. */
  telegramChatId?: string | null | undefined
  /** @deprecated xem `telegramMsgId`. */
  isCaption?: boolean | undefined
  /**
   * Thẻ Telegram của từng chi nhánh, theo branchId: thẻ mời, và với chi nhánh đã nhận thì là thẻ
   * tiến độ mà các mốc nhắc sửa lại. Trước 22/10/2026 chỉ có một thẻ chung — khi chi nhánh A nhận
   * đơn, thẻ trong chat của chi nhánh C bị sửa và mang link đã ký của A (rà soát cụm G).
   */
  inviteCards?: Record<string, InviteCardRef> | undefined
  /** Thù lao gia công đã chốt cho đơn hàng (VNĐ) */
  subcontractPriceVnd?: number | null | undefined
  /** Cách ra phí gia công lúc mời (gợi ý, số chốt, diễn giải) và các khoản trừ sau đó — PO 22/10/2026. */
  craftFee?: CraftFeeRecord | undefined
}

/** Phí gia công đã chốt của đơn: `finalVnd` = `subcontractPriceVnd`; thực nhận = chốt − khấu trừ. */
export interface CraftFeeRecord {
  suggestedVnd: number
  finalVnd: number
  method: CraftFeeMethod
  lines: CraftFeeLine[]
  /** Phí nhập tay vượt biên độ cho phép — do Điều hành duyệt. */
  overrideApprovedBy?: string | undefined
  deductions: CraftFeeDeduction[]
}

/** Thẻ Telegram của một chi nhánh (thẻ mời / thẻ tiến độ), hoặc `null` nếu chưa gửi. */
export function branchTelegramCard(state: SubcontractOrderState, branchId: string): InviteCardRef | null {
  return state.inviteCards?.[branchId] ?? null
}

/** Ghi nhận thẻ vừa gửi MỚI cho chi nhánh (Telegram trả msgId) — giữ nguyên thẻ của chi nhánh khác. */
export function withBranchTelegramCard(
  state: SubcontractOrderState,
  branchId: string,
  sent: { telegramMsgId?: string | null | undefined; telegramChatId?: string | null | undefined; isCaption?: boolean | undefined },
  content: { text: string; claimUrl: string }
): SubcontractOrderState {
  if (!sent.telegramMsgId || !sent.telegramChatId) return state
  const card: InviteCardRef = { msgId: sent.telegramMsgId, chatId: sent.telegramChatId, isCaption: sent.isCaption ?? false, ...content }
  return { ...state, inviteCards: { ...state.inviteCards, [branchId]: card } }
}

export type ClaimResult =
  | { success: true; nextState: SubcontractOrderState }
  | { success: false; reason: "ALREADY_CLAIMED" | "NOT_OPEN" | "DECLINED_PREVIOUSLY" | "NOT_INVITED" | "EXPIRED" }

export type CancelClaimResult =
  | { success: true; nextState: SubcontractOrderState }
  | { success: false; reason: "GRACE_EXPIRED" | "NOT_IN_GRACE" | "UNAUTHORIZED_BRANCH" }

/**
 * Kiểm tra xem đơn hàng gia công hiện tại có thể nhận hay không.
 */
export function isSubcontractClaimable(state: SubcontractOrderState, branchId: string): boolean {
  if (state.dispatchStatus !== "OPEN") return false
  // `metadata` JSON cũ/nhập tay có thể thiếu khoá — coi như chưa ai từ chối (CLAIM từng trả 500)
  if ((state.declinedBranchIds ?? []).includes(branchId)) return false
  const invited = state.invitedBranchIds ?? []
  if (invited.length > 0 && !invited.includes(branchId)) return false
  return true
}

/**
 * Chi nhánh bấm [TIẾP NHẬN ĐƠN] trên Thẻ Gia Công.
 * Cơ chế khóa đồng thời: Chỉ chi nhánh đầu tiên kích hoạt thành công khi dispatchStatus === "OPEN".
 */
export function claimSubcontractOrder(
  state: SubcontractOrderState,
  branchId: string,
  branchName: string,
  graceMinutes: number,
  now = new Date()
): ClaimResult {
  if (state.dispatchStatus !== "OPEN") {
    return { success: false, reason: state.dispatchStatus === "CLAIMED_GRACE" || state.dispatchStatus === "COMMITTED" ? "ALREADY_CLAIMED" : "NOT_OPEN" }
  }

  if ((state.declinedBranchIds ?? []).includes(branchId)) {
    return { success: false, reason: "DECLINED_PREVIOUSLY" }
  }

  // Chỉ chi nhánh được mời ở vòng hiện tại mới được nhận (link của vòng cũ không còn hiệu lực).
  // Danh sách rỗng = state cũ trước khi lưu lời mời → giữ hành vi cũ.
  const invited = state.invitedBranchIds ?? []
  if (invited.length > 0 && !invited.includes(branchId)) {
    return { success: false, reason: "NOT_INVITED" }
  }

  const claimedAtIso = now.toISOString()
  const graceExpiresAtIso = new Date(now.getTime() + graceMinutes * 60 * 1000).toISOString()

  return {
    success: true,
    nextState: {
      ...state,
      dispatchStatus: "CLAIMED_GRACE",
      claimedBranchId: branchId,
      claimedBranchName: branchName,
      claimedAt: claimedAtIso,
      graceExpiresAt: graceExpiresAtIso,
      declinedBranchIds: state.declinedBranchIds ?? [],
    },
  }
}

/**
 * Chi nhánh đã nhận bấm [HỦY NHẬN ĐƠN] trong thời gian kiểm tra kho (Grace Period).
 * Nếu trong hạn: Trả đơn về trạng thái OPEN, đưa chi nhánh này vào danh sách declined để bắn lại cho chi nhánh khác.
 */
export function cancelClaimSubcontractOrder(
  state: SubcontractOrderState,
  branchId: string,
  now = new Date()
): CancelClaimResult {
  if (state.dispatchStatus !== "CLAIMED_GRACE") {
    return { success: false, reason: "NOT_IN_GRACE" }
  }

  if (state.claimedBranchId !== branchId) {
    return { success: false, reason: "UNAUTHORIZED_BRANCH" }
  }

  // Kiểm tra thời hạn Grace Period
  if (state.graceExpiresAt && now.getTime() > new Date(state.graceExpiresAt).getTime()) {
    return { success: false, reason: "GRACE_EXPIRED" }
  }

  return {
    success: true,
    nextState: {
      ...state,
      dispatchStatus: "OPEN",
      claimedBranchId: null,
      claimedBranchName: null,
      claimedAt: null,
      graceExpiresAt: null,
      declinedBranchIds: [...new Set([...(state.declinedBranchIds ?? []), branchId])],
    },
  }
}

/**
 * Chốt chính thức đơn gia công cho chi nhánh (khi hết thời hạn Grace Period hoặc chi nhánh chủ động chốt làm ngay).
 */
export function commitSubcontractOrder(
  state: SubcontractOrderState
): SubcontractOrderState {
  if (state.dispatchStatus !== "CLAIMED_GRACE" || !state.claimedBranchId) {
    return state
  }

  return {
    ...state,
    dispatchStatus: "COMMITTED",
  }
}

/**
 * Tính số giây còn lại trong thời gian cho phép hủy (Grace Period).
 */
export function getGraceSecondsRemaining(graceExpiresAt: string | null, now = new Date()): number {
  if (!graceExpiresAt) return 0
  const diffMs = new Date(graceExpiresAt).getTime() - now.getTime()
  return Math.max(0, Math.floor(diffMs / 1000))
}

/**
 * Định dạng thời gian đếm ngược dạng "MM:SS" (ví dụ: "04:59").
 */
export function formatGraceCountdown(secondsRemaining: number): string {
  const m = Math.floor(secondsRemaining / 60)
  const s = secondsRemaining % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export type SubcontractStep = "QC" | "SHIPPER" | "POD"

/**
 * Trạng thái đơn mà mỗi bước gia công được phép ghi — áp như nhau cho link chi nhánh, thao tác
 * Điều phối và duyệt bỏ qua bằng chứng. Thứ tự: ảnh thành phẩm → shipper → ảnh giao hàng. Trước
 * 22/10/2026 không route nào kiểm: chi nhánh báo đã giao ngay từ lúc nhận đơn, kể cả đơn đã huỷ.
 */
export const SUBCONTRACT_STEP_PRECONDITION: Record<
  SubcontractStep,
  { productionStatus: Array<"WAITING" | "ASSIGNED" | "ARRANGING" | "QUALITY_CHECK" | "READY">; deliveryStatus: Array<"PENDING" | "DISPATCHED" | "DELIVERING"> }
> = {
  QC: { productionStatus: ["ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY"], deliveryStatus: ["PENDING"] },
  SHIPPER: { productionStatus: ["READY"], deliveryStatus: ["PENDING", "DISPATCHED"] },
  POD: { productionStatus: ["READY"], deliveryStatus: ["DELIVERING"] },
}

export const SUBCONTRACT_STEP_NOT_ALLOWED: Record<SubcontractStep, string> = {
  QC: "Đơn hàng không còn ở bước nhận ảnh thành phẩm.",
  SHIPPER: "Đơn hàng chưa đến bước giao (cần ảnh thành phẩm được duyệt) hoặc đã có shipper.",
  POD: "Đơn hàng chưa đến bước xác nhận giao (cần thông tin shipper) hoặc đã hoàn tất.",
}

/** Kiểm nhanh trước khi làm việc tốn thời gian (AI, tải ảnh); kho vẫn kiểm lại dưới khoá dòng. */
export function subcontractStepAllowed(
  step: SubcontractStep,
  order: { status: string; production_status: string; delivery_status: string }
): boolean {
  const rule = SUBCONTRACT_STEP_PRECONDITION[step]
  return (
    order.status !== "CANCELLED" &&
    order.status !== "COMPLETED" &&
    (rule.productionStatus as string[]).includes(order.production_status) &&
    (rule.deliveryStatus as string[]).includes(order.delivery_status)
  )
}
