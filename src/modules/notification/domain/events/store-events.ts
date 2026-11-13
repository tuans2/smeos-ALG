/**
 * STORE EVENTS — Tầng 4: StoreOS tự khai báo
 *
 * Chứa các sự kiện thuộc phạm vi vận hành cửa hàng:
 * đơn hàng, thanh toán, sản xuất, CRM, AI jobs.
 *
 * Gộp từ store-order-events và store-operation-events.
 *
 * @module notification/domain/events
 */
import type { TierEventContract } from "./_contract"
import { STORE_ORDER_EVENTS } from "./store-order-events"
import { STORE_OPERATION_EVENTS } from "./store-operation-events"
import { STORE_DELIVERY_EVENTS } from "./store-delivery-events"
import { INTERNAL_CHAT_EVENTS } from "./internal-chat-events"
import { INTEGRATION_EVENTS } from "./integration-events"
import { TENANT_LIFECYCLE_EVENTS } from "./tenant-lifecycle-events"

export const STORE_EVENT_CONTRACT: TierEventContract = {
  tier: "STORE",
  version: "1.0.0",
  events: [
    ...STORE_ORDER_EVENTS,
    ...STORE_OPERATION_EVENTS,
    ...STORE_DELIVERY_EVENTS,
    ...INTERNAL_CHAT_EVENTS,
    ...INTEGRATION_EVENTS,
    ...TENANT_LIFECYCLE_EVENTS,
  ],
}
