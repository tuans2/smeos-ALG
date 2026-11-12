/**
 * Coordinator Dispatch Reminder Domain Types (M0..M5).
 * Pure TypeScript — No Prisma, No HTTP, No UI Imports.
 * Reference: SSOT ALG_Tieu_Chuan_Nhac_Nghiep_Vu_Dieu_Phoi_v1.md
 */

export type CoordinatorMilestoneCode = "M0" | "M1" | "M2" | "M3" | "M4" | "M5"

export type ReminderStatus =
  | "PENDING"
  | "TRIGGERED"
  | "ACKNOWLEDGED"
  | "SNOOZED"
  | "DISMISSED"

export type MilestoneTriggerType =
  | "TIME_AFTER_PAYMENT"
  | "COUNTDOWN_TO_DELIVERY"
  | "TIME_AFTER_SHIPPER_ASSIGNED"
  | "IMMEDIATE_ON_SHIPPER_ASSIGNED"
  | "TIME_AFTER_DELIVERY"

export type ReminderRecipientType = "WORKSHOP" | "SHIPPER" | "CUSTOMER"

export type ReminderUrgency = "CRITICAL" | "WARNING" | "NORMAL"

/**
 * Cấu hình chính sách nhắc việc mặc định của tổ chức (Policy Level).
 */
export interface DispatchReminderPolicyConfig {
  m0MinutesAfterPaid: number
  m1MinutesBeforeDelivery: number
  m2MinutesBeforeDelivery: number
  m3MinutesAfterShipperAssigned: number
  m5MinutesAfterDelivery: number
}

/**
 * Cấu hình ghi đè theo từng sản phẩm / Thẻ chào (Template Override Level).
 */
export interface TemplateReminderOverrides {
  m0MinutesAfterPaid?: number | undefined
  m1MinutesBeforeDelivery?: number | undefined
  m2MinutesBeforeDelivery?: number | undefined
  m3MinutesAfterShipperAssigned?: number | undefined
  m5MinutesAfterDelivery?: number | undefined
}

/**
 * Giá trị mặc định chuẩn SSOT toàn hệ thống ALG / ALG.
 */
export const DEFAULT_DISPATCH_REMINDER_POLICY: Readonly<DispatchReminderPolicyConfig> = {
  m0MinutesAfterPaid: 10,
  m1MinutesBeforeDelivery: 120,
  m2MinutesBeforeDelivery: 60,
  m3MinutesAfterShipperAssigned: 20,
  m5MinutesAfterDelivery: 30,
}

/**
 * Metadata lưu vết trạng thái của từng mốc nhắc trên đơn hàng.
 */
export interface MilestoneReminderState {
  status: ReminderStatus
  scheduledAt?: string | undefined
  triggeredAt?: string | undefined
  acknowledgedAt?: string | undefined
  acknowledgedBy?: string | undefined
  snoozedUntil?: string | undefined
  note?: string | undefined
}

export type OrderRemindersMetadata = Partial<
  Record<CoordinatorMilestoneCode, MilestoneReminderState>
>

/**
 * Dữ liệu đầu vào để tính toán lịch nhắc việc cho một đơn hàng.
 */
export interface OrderReminderCalculationInput {
  orderId: string
  orderCode: string
  paidAt: Date | null
  deliveryTime: Date | null
  shipperAssignedAt: Date | null
  shipperName?: string | null | undefined
  shipperPhone?: string | null | undefined
  coordinatorPhone?: string | null | undefined
  customerName?: string | null | undefined
  customerPhone?: string | null | undefined
  deliveryAddress?: string | null | undefined
  metadataReminders?: OrderRemindersMetadata | null | undefined
  isDelivered?: boolean | undefined
  deliveredAt?: Date | null | undefined
}

/**
 * Thời điểm kích hoạt đã được giải cho 6 mốc.
 */
export interface ResolvedMilestoneSchedule {
  m0: Date | null
  m1: Date | null
  m2: Date | null
  m3: Date | null
  m4: Date | null
  m5: Date | null
}

/**
 * Thẻ nhắc việc đang kích hoạt đẩy lên giao diện Điều phối.
 */
export interface ActiveReminderItem {
  id: string
  orderId: string
  orderCode: string
  milestone: CoordinatorMilestoneCode
  title: string
  description: string
  scheduledAt: Date
  isOverdue: boolean
  overdueMinutes: number
  urgency: ReminderUrgency
  suggestedAction: string
  messageTemplate: string
  recipientType: ReminderRecipientType
  recipientTarget?: string | undefined
  status: ReminderStatus
  acknowledgedAt?: Date | undefined
  snoozedUntil?: Date | undefined
}
