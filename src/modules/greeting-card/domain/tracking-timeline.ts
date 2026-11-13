/**
 * Dòng thời gian của một đơn/link: sự kiện đã ghi (đơn, phiếu thu, ảnh QC, hành trình khách) và
 * các mốc VÀO BƯỚC của quy trình 9 bước, kèm thời gian thực tế so với thời gian chuẩn.
 *
 * Mốc vào bước dựng lại từ sự kiện theo ĐÚNG cách `resolveOrderStep`/`resolveSessionStep` suy bước
 * (không phải trạng thái mới): tạo link → B1, khách mở → B2, gửi đơn → B3, báo chuyển khoản → B4,
 * lần thu đầu (đơn sang CONFIRMED) → B5, phân công thợ → B6, ảnh thành phẩm → B7, giao ship → B8,
 * ảnh người nhận → B9. Bước chỉ tiến, không lùi. Pure TypeScript.
 */
import type { StepSlaSetting } from "./step-sla"
import { PIPELINE_STEPS, type TrackingPipelineStepId } from "./tracking-pipeline-types"

export interface TimelineEvent {
  at: string
  kind: string
  label: string
  /** Bước quy trình mà sự kiện này đưa đơn/link vào (nếu có). */
  entersStep: TrackingPipelineStepId | null
  actorId: string | null
  note: string | null
  /** URL ảnh đính kèm sự kiện (ảnh thành phẩm, ảnh người nhận, ảnh chuyển khoản) — đã ký. */
  imageUrls?: string[] | undefined
}

export interface StepSegment {
  stepId: TrackingPipelineStepId
  title: string
  enteredAt: string
  leftAt: string | null
  durationMinutes: number
  slaMinutes: number | null
  /** > 0 = vượt thời gian chuẩn bao nhiêu phút */
  overMinutes: number
}

/** Sự kiện → bước được vào. Khoá theo loại sự kiện thật đang ghi trong hệ thống. */
export const EVENT_ENTERS_STEP: Record<string, TrackingPipelineStepId> = {
  LINK_CREATED: "STEP_1_OPENED",
  LINK_COPIED: "STEP_1_OPENED",
  OPEN: "STEP_2_CHOOSING",
  SHARE_OPEN: "STEP_2_CHOOSING",
  REORDER: "STEP_2_CHOOSING",
  SUBMIT_ORDER: "STEP_3_FILLING_FORM",
  CLICK_PAID: "STEP_4_PAYMENT_PENDING",
  PAYMENT_FIRST: "STEP_5_PAYMENT_CONFIRMED",
  FLORIST_ASSIGNED: "STEP_6_ARRANGING",
  PRODUCT_PHOTO_UPLOADED: "STEP_7_READY_QC",
  SHIPPING_DISPATCHED: "STEP_8_DELIVERING",
  RECIPIENT_PHOTO_UPLOADED: "STEP_9_COMPLETED",
}

export const EVENT_LABEL: Record<string, string> = {
  LINK_CREATED: "Tạo link",
  LINK_COPIED: "Sao chép link gửi khách",
  OPEN: "Khách mở link",
  SHARE_OPEN: "Khách mở link bộ sưu tập",
  REORDER: "Khách đặt thêm đơn",
  SELECT_PRODUCT: "Khách chọn mẫu",
  SUBMIT_ORDER: "Khách gửi đơn",
  CLICK_PAID: "Khách báo đã chuyển khoản",
  PAYMENT_FIRST: "Ghi nhận tiền lần đầu",
  PAYMENT: "Ghi nhận tiền",
  REFUND: "Hoàn tiền",
  FLORIST_ASSIGNED: "Phân công nghệ nhân",
  PRODUCT_PHOTO_UPLOADED: "Tải ảnh thành phẩm",
  SHIPPING_DISPATCHED: "Giao cho shipper",
  DELIVERY_FAILED: "Giao không thành công",
  RECIPIENT_PHOTO_UPLOADED: "Giao thành công — ảnh người nhận",
  ORDER_CANCELLED: "Huỷ đơn",
  LINK_REVOKED: "Thu hồi link",
  ADMIN_CONFIRMED_PAYMENT: "Điều hành xác nhận thanh toán",
}

const INDEX = new Map(PIPELINE_STEPS.map((s) => [s.id, s.orderIndex]))
const TITLE = new Map(PIPELINE_STEPS.map((s) => [s.id, s.shortTitle]))

/** Đoạn thời gian ở từng bước (theo thứ tự), bước cuối đến `now` nếu chưa xong. */
export function stepSegments(
  events: TimelineEvent[],
  sla: Record<TrackingPipelineStepId, StepSlaSetting>,
  now: Date,
): StepSegment[] {
  const entries: Array<{ stepId: TrackingPipelineStepId; at: string }> = []
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    if (!e.entersStep) continue
    const last = entries[entries.length - 1]
    // Bước chỉ tiến: sự kiện đưa về bước cũ hơn / cùng bước (vd. chép link lần 2) không mở đoạn mới
    if (last && (INDEX.get(e.entersStep) ?? 0) <= (INDEX.get(last.stepId) ?? 0)) continue
    entries.push({ stepId: e.entersStep, at: e.at })
  }
  return entries.map((entry, n) => {
    const next = entries[n + 1]
    const end = next ? Date.parse(next.at) : entry.stepId === "STEP_9_COMPLETED" ? Date.parse(entry.at) : now.getTime()
    const durationMinutes = Math.max(0, Math.floor((end - Date.parse(entry.at)) / 60_000))
    const setting = sla[entry.stepId]
    const slaMinutes = entry.stepId !== "STEP_9_COMPLETED" && setting?.enabled ? setting.minutes : null
    return {
      stepId: entry.stepId, title: TITLE.get(entry.stepId) ?? entry.stepId,
      enteredAt: entry.at, leftAt: next?.at ?? null, durationMinutes, slaMinutes,
      overMinutes: slaMinutes === null ? 0 : Math.max(0, durationMinutes - slaMinutes),
    }
  })
}
