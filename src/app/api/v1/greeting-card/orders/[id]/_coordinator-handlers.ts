import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
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

type RouteCtx = { params: Promise<{ id: string }> }

/**
 * Dựng một handler tác vụ xưởng: phiên → năng lực → schema → use-case.
 * Bốn route con chỉ khác nhau ở bốn tham số này.
 */
function coordinatorHandler<T>(
  capability: string,
  schema: z.ZodType<T>,
  run: (ctx: Awaited<ReturnType<typeof requireTenantContext>>["ctx"], id: string, input: T) => Promise<unknown>
) {
  return handle<[RouteCtx]>(async (request, context) => {
    const { ctx } = await requireTenantContext(request)
    requireCapability(ctx, capability)
    const { id } = await context.params
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await run(ctx, id, parsed.data) })
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
