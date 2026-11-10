/**
 * Thẻ đơn gia công trong phòng trao đổi (kế hoạch chat nội bộ GĐ4–5). Tin nhắn chỉ lưu khoá để tra (`orderCode`,
 * `branchCode`) và phần chữ của lời mời — trạng thái luôn tính lại lúc đọc (`subcontractView`). Pure TypeScript.
 */

export interface SubcontractCardPayload {
  kind: "SUBCONTRACT"
  orderCode: string
  /** Mã ứng viên bắn đơn được mời (`branches.code`) */
  branchCode: string
  /** Tiêu đề lời mời, không HTML */
  title: string
}

/**
 * INVITED: đang mời, chưa ai nhận · GRACE: cửa hàng này đã nhận, còn thời gian huỷ nhận · IN_PROGRESS: đã chốt, đang
 * làm · CLOSED: không còn việc của cửa hàng này ở đơn (lý do ở `closedReason`).
 */
export type SubcontractCardStage = "INVITED" | "GRACE" | "IN_PROGRESS" | "CLOSED"
export type SubcontractCardClosedReason = "TAKEN" | "EXPIRED" | "DONE" | "CANCELLED"

export interface SubcontractCardView {
  stage: SubcontractCardStage
  closedReason: SubcontractCardClosedReason | null
  /** Hạn nhận đơn (INVITED) hoặc hạn huỷ nhận (GRACE) */
  deadlineAt: string | null
  productionStatus: string | null
  deliveryStatus: string | null
  /** Link Thẻ Gia Công đã ký — chỉ có với người của đúng cửa hàng được mời, có quyền thực hiện đơn */
  actionUrl: string | null
}

/** Ba bước thực hiện sau khi chốt — cùng thứ tự với `SUBCONTRACT_STEP_PRECONDITION` của Thẻ Gia Công. */
export type FulfilmentStep = "FINISHED_PHOTO" | "SHIPPER" | "DELIVERY_PROOF"

export function fulfilmentProgress(view: Pick<SubcontractCardView, "productionStatus" | "deliveryStatus">): { done: FulfilmentStep[]; next: FulfilmentStep | null } {
  const done: FulfilmentStep[] = []
  if (view.productionStatus === "READY") done.push("FINISHED_PHOTO")
  if (view.deliveryStatus === "DELIVERING" || view.deliveryStatus === "DELIVERED") done.push("SHIPPER")
  if (view.deliveryStatus === "DELIVERED") done.push("DELIVERY_PROOF")
  const order: FulfilmentStep[] = ["FINISHED_PHOTO", "SHIPPER", "DELIVERY_PROOF"]
  return { done, next: order.find((s) => !done.includes(s)) ?? null }
}

/** Chữ của tin gửi kênh nhân viên (HTML Telegram) → chữ thuần cho phòng trao đổi; bỏ link (link ký chỉ cấp lúc đọc). */
export function plainDispatchText(html: string): string {
  // Bỏ thẻ lặp tới khi hết — một lượt có thể để lại thẻ ghép từ mảnh (CodeQL js/incomplete-multi-character-sanitization)
  let text = html.replace(/<br\s*\/?>/gi, "\n")
  for (let prev = ""; prev !== text; ) {
    prev = text
    text = text.replace(/<[^>]+>/g, "")
  }
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
