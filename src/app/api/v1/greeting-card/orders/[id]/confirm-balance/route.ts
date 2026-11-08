import { validationFailed, unprocessable, notFound } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { coordinatorConfirmBalancePayment } from "@/modules/greeting-card/use-cases/confirm-brochure-payment"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { parsePaymentPolicy, resolveBalancePaymentTriggerPolicy } from "@/modules/greeting-card/domain/brochure-payment-policy"
import {
  parseBrochureWorkflowPolicy,
  isUrgentOrder,
  canRoleApproveDeposit,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { coordinatorBalanceConfirmBlocker } from "@/modules/greeting-card/domain/balance-collection"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { BrochureOrderRepository } from "@/modules/greeting-card/infra/brochure-order-repository"
import { confirmBalanceBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/**
 * POST /api/v1/greeting-card/orders/[id]/confirm-balance
 * Điều phối xác nhận đã nhận đủ tiền thanh toán lần 2 (balance) cho đơn đặt cọc.
 * Chỉ hoạt động khi policy cho phép Điều phối (PAYMENT_OR_COORDINATOR hoặc workflowPolicy.requireAdminDepositApproval === false hoặc đơn hỏa tốc).
 */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  // Điều phối cần ít nhất quyền assignFlorist (R4) — tương đương vai Điều phối
  requireCapability(ctx, GREETING_CARD_CAPABILITY.assignFlorist)

  const { id } = await context.params

  // Trần cứng: kiểm tra policy trước khi cho phép Điều phối xác nhận lần 2
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

  // Cùng luật với nút trên thẻ Điều phối; tính cả ghi đè theo bộ sưu tập của đơn
  const blocker = coordinatorBalanceConfirmBlocker({
    requireAdminDepositApproval: workflowPolicy.requireAdminDepositApproval,
    isUrgent,
    balanceTrigger: resolveBalancePaymentTriggerPolicy(parsePaymentPolicy(shop.settings), order.greeting_sessions[0]?.catalog?.filters),
  })
  if (blocker) throw unprocessable(blocker)

  const body = await request.json().catch(() => ({}))
  const parsed = confirmBalanceBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await coordinatorConfirmBalancePayment(ctx, id, { note: parsed.data.note })
  return jsonResponse({ data: result })
})

export const dynamic = "force-dynamic"
