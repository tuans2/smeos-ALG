import { validationFailed, unprocessable, notFound } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { coordinatorConfirmDepositPayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import {
  parseBrochureWorkflowPolicy,
  isUrgentOrder,
  canRoleApproveDeposit,
  depositApproverRole,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import { dispatchAfterPaymentConfirmed } from "@/modules/greeting-card/use-cases/dispatch-after-payment"
import { confirmDepositBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/**
 * POST /api/v1/greeting-card/orders/[id]/confirm-deposit
 * Điều phối xác nhận đã nhận tiền đặt cọc (hoặc toàn phần) qua ảnh bill của khách.
 * Điều phối chỉ duyệt được khi policy cho phép (PAYMENT_OR_COORDINATOR hoặc workflowPolicy.requireAdminDepositApproval === false);
 * người có quyền ghi nhận thanh toán (R11 — Điều hành) luôn duyệt được.
 */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.assignFlorist)

  const { id } = await context.params

  const repo = new GreetingCardRepository()
  const ordersRepo = new BrochureOrderRepository()
  const shop = await repo.getShopProfile(ctx.organizationId)
  const workflowPolicy = parseBrochureWorkflowPolicy(shop.settings)

  const order = await ordersRepo.findBrochureOrder(ctx, id)
  if (!order) throw notFound()

  const deliveryWindow = order.delivery_window as { date?: string; timeSlot?: string } | null
  const isUrgent = isUrgentOrder({
    deliveryDate: deliveryWindow?.date,
    deliveryTimeSlot: deliveryWindow?.timeSlot,
  })

  const createdAtMs = order.created_at ? new Date(order.created_at).getTime() : Date.now()
  const minutesWaiting = Math.floor((Date.now() - createdAtMs) / 60_000)
  const isOverdueSla = minutesWaiting >= workflowPolicy.slaEscalationMinutes

  const role = depositApproverRole(hasCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord))
  const canApprove = canRoleApproveDeposit(role, workflowPolicy, { isUrgent, isOverdueSla })
  if (!canApprove) {
    throw unprocessable("Cài đặt của cửa hàng yêu cầu chỉ Điều hành mới được duyệt tiền cọc")
  }

  const body = await request.json().catch(() => ({}))
  const parsed = confirmDepositBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await coordinatorConfirmDepositPayment(ctx, id, { note: parsed.data.note })
  // Chuỗi: tiền đã ghi nhận → chọn cửa hàng gia công theo cài đặt (PO 22/10/2026)
  const dispatch = await dispatchAfterPaymentConfirmed(ctx, id, { manualDispatch: parsed.data.manualDispatch })
  return jsonResponse({ data: { ...result, dispatch } })
})

export const dynamic = "force-dynamic"
