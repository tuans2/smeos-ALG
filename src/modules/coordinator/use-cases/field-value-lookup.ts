/**
 * ĐP-3.16 (26/09/2026), tách riêng ĐP-4a.5 (27/09/2026) để `present-
 * coordinator-order.ts` dùng được `findMissingRequiredFields` (T02) mà
 * không tạo vòng phụ thuộc với `shared.ts` (vốn import `presentCoordinator
 * Orders` từ `present-coordinator-order.ts` cho `getOrderView`). Tệp lá —
 * chỉ phụ thuộc kiểu `CoordinatorOrderRow`, không import ngược bất kỳ
 * use-case nào khác trong module.
 */
import type { FieldValueLookup } from "@/modules/field-platform/domain/stage-transitions"
import type { CoordinatorOrderRow } from "../infra/coordinator-repository"

/**
 * Giá trị hiện tại của đơn theo khoá trường, cho cổng `findMissingRequiredFields`
 * (field-platform §6.2 mục 3.10). Trường LÕI có `requiredAtStage` khai ở
 * `contracts/field-registry.ts` đọc thẳng cột/`metadata` — khớp 1:1 với
 * thuộc tính cùng tên ở `CoordinatorOrderView` (thiết kế có chủ đích, xem
 * ĐP-2.11). Trường TỰ TẠO đọc `custom_fields`. Thêm khoá lõi REQUIRED mới ở
 * field-registry.ts thì thêm dòng tương ứng ở đây CÙNG LƯỢT (quy tắc chung
 * #7 của kế hoạch) — nếu không, cổng sẽ luôn coi trường đó là "trống" và
 * chặn nhầm.
 */
export function buildOrderFieldValueLookup(row: CoordinatorOrderRow): FieldValueLookup {
  const c = row.coordination!
  const meta = (c.metadata ?? {}) as Record<string, unknown>
  const customFields = (c.custom_fields ?? {}) as Record<string, unknown>
  const core: Record<string, unknown> = {
    customerId: row.customer_id,
    customerName: meta.customerName,
    customerPhone: meta.customerPhone,
    recipientName: meta.recipientName,
    recipientPhone: meta.recipientPhone,
    productId: row.items[0]?.product_id ?? null,
    productTitle: meta.productTitle,
    deliveryAddress: row.delivery_address,
    deliveryTargetAt: c.estimated_delivery_at,
    cardMessage: row.card_message,
    internalNote: row.internal_note,
    partnerInstruction: meta.partnerInstruction,
    unitPriceVnd: row.total_vnd,
    partnerPayoutVnd: c.partner_payout_vnd,
    channel: c.channel,
    orderType: c.order_type,
    serviceLevel: c.service_level,
    deliveryType: c.delivery_type,
    deliveryLocationType: c.delivery_location_type,
    priority: c.priority,
    cardRequired: c.card_required,
    receivedAt: c.received_at,
    deliveryWindowStart: c.delivery_window_start,
    deliveryWindowEnd: c.delivery_window_end,
    specialRequirements: meta.specialRequirements,
    handoffAt: c.handoff_at,
    plannedAt: c.planned_at,
    productionDeadlineAt: c.production_deadline_at,
    pickupTargetAt: c.pickup_target_at,
    technicalInstruction: c.technical_instruction,
    nextActionOwnerId: c.next_action_owner_id,
    partnerSelectionDeadlineAt: c.partner_selection_deadline_at,
    collectionMethod: c.collection_method,
    collectionDueAt: c.collection_due_at,
  }
  return (key: string) => (key in core ? core[key] : customFields[key])
}
