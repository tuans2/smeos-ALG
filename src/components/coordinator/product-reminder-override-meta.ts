import type {
  DispatchReminderPolicyConfig,
  TemplateReminderOverrides,
} from "@/modules/coordinator/domain/dispatch-reminder-types"

/** Các mốc nhắc việc Điều phối có thể ghi đè theo từng sản phẩm (giới hạn phút + màu nhấn). */
export const OVERRIDE_META: {
  key: keyof TemplateReminderOverrides
  label: string
  unit: string
  min: number
  max: number
  defaultKey: keyof DispatchReminderPolicyConfig
}[] = [
  {
    key: "m0MinutesAfterPaid",
    label: "In thẻ gia công",
    unit: "phút sau thanh toán",
    min: 1,
    max: 360,
    defaultKey: "m0MinutesAfterPaid",
  },
  {
    key: "m1MinutesBeforeDelivery",
    label: "Xác nhận bắt đầu chế tác",
    unit: "phút trước giao",
    min: 10,
    max: 720,
    defaultKey: "m1MinutesBeforeDelivery",
  },
  {
    key: "m2MinutesBeforeDelivery",
    label: "Hoàn thành & Book ship",
    unit: "phút trước giao",
    min: 10,
    max: 360,
    defaultKey: "m2MinutesBeforeDelivery",
  },
  {
    key: "m3MinutesAfterShipperAssigned",
    label: "Xác nhận shipper lấy hàng",
    unit: "phút sau gán shipper",
    min: 5,
    max: 120,
    defaultKey: "m3MinutesAfterShipperAssigned",
  },
  {
    key: "m5MinutesAfterDelivery",
    label: "Chăm sóc sau giao",
    unit: "phút sau giờ giao",
    min: 5,
    max: 360,
    defaultKey: "m5MinutesAfterDelivery",
  },
]
