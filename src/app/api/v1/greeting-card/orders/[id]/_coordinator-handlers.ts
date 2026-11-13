import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import type { TenantContext } from "@/core/tenancy"
import { camelKeys, type CamelKeys } from "@/lib/case-keys"
import {
  assignBrochureFlorist,
  uploadBrochureProductPhoto,
  dispatchBrochureShipping,
  uploadBrochureRecipientPhoto,
  markBrochureDeliveryFailed,
  coordinatorAcceptBrochureOrder,
  coordinatorRejectBrochureOrder,
} from "@/modules/greeting-card/use-cases/update-brochure-order-status"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { acceptOrderBody, deliveryFailedBody, floristBody, photoBody, rejectOrderBody, shipBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/**
 * Dựng một handler tác vụ xưởng: phiên → năng lực → schema → use-case.
 * Bốn route con chỉ khác nhau ở bốn tham số này. Thân snake_case (D-69) → camelCase cho use-case.
 */
function coordinatorHandler<T extends object>(
  capability: string,
  schema: z.ZodType<T>,
  run: (ctx: TenantContext, id: string, input: CamelKeys<T>) => Promise<unknown>
) {
  return defineRoute({
    auth: { kind: "tenant", capability },
    handler: async ({ request, ctx, params }) => {
      const { id } = params as { id: string }
      const parsed = schema.safeParse(await request.json().catch(() => ({})))
      if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
      return jsonResponse({ data: await run(ctx, id, camelKeys(parsed.data)) })
    },
  })
}

/** POST /api/v1/greeting-card/orders/[id]/assign-florist */
export const assignFloristPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.assignFlorist, floristBody, assignBrochureFlorist)

/** POST /api/v1/greeting-card/orders/[id]/product-photo */
export const productPhotoPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.productionUpdate, photoBody, uploadBrochureProductPhoto)

/** POST /api/v1/greeting-card/orders/[id]/dispatch-shipping */
export const dispatchShippingPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.deliveryManage, shipBody, dispatchBrochureShipping)

/** POST /api/v1/greeting-card/orders/[id]/recipient-photo */
export const recipientPhotoPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.deliveryManage, photoBody, uploadBrochureRecipientPhoto)

/** POST /api/v1/greeting-card/orders/[id]/delivery-failed — shipper không giao được, hẹn giao lại */
export const deliveryFailedPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.deliveryManage, deliveryFailedBody, markBrochureDeliveryFailed)

/** POST /api/v1/greeting-card/orders/[id]/accept — Điều phối xác nhận đã nhận tiền (Chuỗi) rồi chọn cửa hàng gia công */
export const acceptOrderPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.assignFlorist, acceptOrderBody, coordinatorAcceptBrochureOrder)

/** POST /api/v1/greeting-card/orders/[id]/reject — Điều phối từ chối nhận đơn (gửi đề xuất hủy/hoàn tiền lên Điều hành) */
export const rejectOrderPOST = coordinatorHandler(GREETING_CARD_CAPABILITY.assignFlorist, rejectOrderBody, coordinatorRejectBrochureOrder)
