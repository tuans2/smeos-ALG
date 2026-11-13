/**
 * Dispatch Reminder Evaluator (Pure Logic).
 * Đánh giá trạng thái đơn hàng và tạo danh sách các thẻ nhắc việc (ActiveReminderItem).
 * Reference: SSOT ALG_Tieu_Chuan_Nhac_Nghiep_Vu_Dieu_Phoi_v1.md §3
 */

import type {
  ActiveReminderItem,
  CoordinatorMilestoneCode,
  OrderReminderCalculationInput,
  ReminderRecipientType,
  ReminderStatus,
  ReminderUrgency,
  ResolvedMilestoneSchedule,
} from "./dispatch-reminder-types"

interface MilestoneDefinition {
  code: CoordinatorMilestoneCode
  title: string
  description: string
  recipientType: ReminderRecipientType
  suggestedAction: string
  buildMessageTemplate: (input: OrderReminderCalculationInput) => string
}

function formatTimeString(date: Date | null): string {
  if (!date) return "--:--"
  // Giờ Việt Nam (UTC+7) — máy chủ chạy UTC
  const vn = new Date(date.getTime() + 7 * 3_600_000)
  const hours = vn.getUTCHours().toString().padStart(2, "0")
  const minutes = vn.getUTCMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

const MILESTONE_DEFINITIONS: Record<CoordinatorMilestoneCode, MilestoneDefinition> = {
  M0: {
    code: "M0",
    title: "Xác nhận và in thẻ gia công",
    description: "Đơn đã nhận thanh toán, cần in thẻ gia công và gửi sản xuất xác nhận",
    recipientType: "WORKSHOP",
    suggestedAction:
      "Kiểm tra hóa đơn, in thẻ gia công và gửi bộ phận sản xuất để xác nhận nhận đơn",
    buildMessageTemplate: (input) =>
      `Đơn #${input.orderCode} đã thanh toán. Vui lòng in Thẻ gia công và gửi Bộ phận sản xuất xác nhận nhận đơn.`,
  },
  M1: {
    code: "M1",
    title: "Xác nhận bắt đầu sản xuất",
    description: "Kiểm tra bộ phận sản xuất đã bắt đầu thực hiện đơn hay chưa",
    recipientType: "WORKSHOP",
    suggestedAction:
      "Liên hệ bộ phận sản xuất xác nhận đã bắt đầu chế tác; nếu chưa thì can thiệp ngay",
    buildMessageTemplate: (input) =>
      `Nhờ Xưởng kiểm tra và xác nhận đã bắt đầu cắm đơn #${input.orderCode}. Đơn hẹn giao lúc ${formatTimeString(
        input.deliveryTime
      )}.`,
  },
  M2: {
    code: "M2",
    title: "Hoàn thành sản phẩm và đặt lịch giao hàng",
    description: "Yêu cầu chụp ảnh sản phẩm hoàn thành, book ship và lấy SĐT shipper",
    recipientType: "WORKSHOP",
    suggestedAction:
      "Nhắn xưởng gửi ảnh thành phẩm kiểm tra chất lượng, book shipper và báo SĐT tài xế",
    buildMessageTemplate: (input) =>
      `Xưởng ơi, đơn #${input.orderCode} sắp đến giờ giao. Nhờ xưởng chụp ảnh hoa thành phẩm gửi lại kiểm tra, đồng thời book ship và báo SĐT tài xế giúp em nhé!`,
  },
  M3: {
    code: "M3",
    title: "Xác nhận shipper lấy hàng",
    description: "Kiểm tra shipper đã đến xưởng lấy hoa đúng giờ chưa",
    recipientType: "SHIPPER",
    suggestedAction:
      "Liên hệ shipper kiểm tra đã lấy hàng chưa; nếu trễ thì gọi nhắc hoặc đổi tài xế",
    buildMessageTemplate: (input) => {
      const shipper = input.shipperName || "Bác tài"
      const phone = input.shipperPhone ? ` (${input.shipperPhone})` : ""
      return `${shipper} ơi${phone}, bác đã đến xưởng lấy đơn #${input.orderCode} chưa ạ?`
    },
  },
  M4: {
    code: "M4",
    title: "Dặn shipper chụp ảnh giao hàng",
    description: "Nhắn shipper chụp ảnh lúc giao đơn và ảnh người nhận gửi về điều phối",
    recipientType: "SHIPPER",
    suggestedAction:
      "Gửi tin nhắn dặn shipper chụp ảnh trao hoa và ảnh người nhận rồi gửi về SĐT điều phối",
    buildMessageTemplate: (input) => {
      const shipper = input.shipperName || "anh/chị shipper"
      const phone = input.shipperPhone ? ` (${input.shipperPhone})` : ""
      const coordPhone = input.coordinatorPhone || "[SĐT Điều phối]"
      return `Dạ em chào ${shipper}${phone}. Nhờ anh/chị khi giao đơn #${input.orderCode} chụp giúp em: 1 ảnh lúc trao hoa và 1 ảnh người nhận hoa, rồi gửi về SĐT điều phối ${coordPhone} giúp em nhé. Em cảm ơn anh/chị!`
    },
  },
  M5: {
    code: "M5",
    title: "Chăm sóc sau giao (Follow-up)",
    description: "Kiểm tra ảnh POD từ shipper và liên hệ hỏi mức độ hài lòng của khách",
    recipientType: "CUSTOMER",
    suggestedAction:
      "Kiểm tra ảnh POD đã đủ chưa; nhắn tin hoặc gọi hỏi khách mức độ hài lòng về hoa",
    buildMessageTemplate: (input) => {
      const customer = input.customerName || "anh/chị"
      return `Dạ em chào ${customer}. Đơn hoa #${input.orderCode} của anh/chị đã được giao thành công. Anh/chị có hài lòng với sản phẩm và dịch vụ của shop không ạ? Nếu cần hỗ trợ thêm anh/chị cứ nhắn em nhé!`
    },
  },
}

function calculateUrgency(overdueMinutes: number): ReminderUrgency {
  if (overdueMinutes >= 15) return "CRITICAL"
  if (overdueMinutes > 0) return "WARNING"
  return "NORMAL"
}

/**
 * Đánh giá và sinh danh sách các nhắc nhở active cho một đơn hàng.
 */
export function evaluateOrderReminders(
  input: OrderReminderCalculationInput,
  schedule: ResolvedMilestoneSchedule,
  currentTime: Date
): ActiveReminderItem[] {
  const activeReminders: ActiveReminderItem[] = []
  const nowMs = currentTime.getTime()
  const metadata = input.metadataReminders ?? {}

  const milestones: Array<{ code: CoordinatorMilestoneCode; scheduledAt: Date | null }> = [
    { code: "M0", scheduledAt: schedule.m0 },
    { code: "M1", scheduledAt: schedule.m1 },
    { code: "M2", scheduledAt: schedule.m2 },
    { code: "M3", scheduledAt: schedule.m3 },
    { code: "M4", scheduledAt: schedule.m4 },
    { code: "M5", scheduledAt: schedule.m5 },
  ]

  for (const { code, scheduledAt } of milestones) {
    if (!scheduledAt) continue

    const state = metadata[code]
    const status: ReminderStatus = state?.status ?? "PENDING"

    // Bỏ qua nếu đã hoàn tất hoặc bị hủy
    if (status === "ACKNOWLEDGED" || status === "DISMISSED") {
      continue
    }

    // Bỏ qua nếu đang snooze và chưa đến giờ hẹn lại
    if (status === "SNOOZED" && state?.snoozedUntil) {
      const snoozeMs = new Date(state.snoozedUntil).getTime()
      if (nowMs < snoozeMs) {
        continue
      }
    }

    // Chỉ kích hoạt khi đã đến hoặc quá thời điểm scheduledAt
    if (nowMs >= scheduledAt.getTime()) {
      const overdueMinutes = Math.max(
        0,
        Math.floor((nowMs - scheduledAt.getTime()) / (60 * 1000))
      )
      const def = MILESTONE_DEFINITIONS[code]

      activeReminders.push({
        id: `${input.orderId}_${code}`,
        orderId: input.orderId,
        orderCode: input.orderCode,
        milestone: code,
        title: def.title,
        description: def.description,
        scheduledAt,
        isOverdue: overdueMinutes > 0,
        overdueMinutes,
        urgency: calculateUrgency(overdueMinutes),
        suggestedAction: def.suggestedAction,
        messageTemplate: def.buildMessageTemplate(input),
        recipientType: def.recipientType,
        recipientTarget:
          def.recipientType === "SHIPPER"
            ? input.shipperPhone ?? undefined
            : def.recipientType === "CUSTOMER"
            ? input.customerPhone ?? undefined
            : undefined,
        status: overdueMinutes > 0 ? "TRIGGERED" : status,
        acknowledgedAt: state?.acknowledgedAt ? new Date(state.acknowledgedAt) : undefined,
        snoozedUntil: state?.snoozedUntil ? new Date(state.snoozedUntil) : undefined,
      })
    }
  }

  return activeReminders
}
