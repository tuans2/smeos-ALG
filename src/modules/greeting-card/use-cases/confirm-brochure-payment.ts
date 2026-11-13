import type { TenantContext } from "@/core/tenancy"
import { notFound, unprocessable, conflict } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { BrochurePaymentRepository, getBrochurePaymentRepository } from "../infra/brochure-payment-repository"
import { CancellationFollowUpRepository, getCancellationFollowUpRepository } from "../infra/cancellation-follow-up-repository"
import { expectedPayment, parsePaymentPolicy, resolveRequirePaymentProof } from "../domain/brochure-payment-policy"
import { parseBrochureWorkflowPolicy } from "../domain/brochure-workflow-policy"
import { policyForOrder, readPaymentPlan } from "../domain/payment-plan"
import { depositAmountVnd } from "../domain/payment-schedule"
import { balanceCollectionBlocker } from "../domain/balance-collection"
import { loadPublicSession } from "./brochure-session-access"
import { queueOrderNotification } from "./notify-customer"
import { queueStaffNotification } from "./notify-staff"
import { paymentNotifyEvent } from "../domain/customer-notifications"
import { assertOrderInScope } from "./order-scope"
import { ensureHomestayOrderBooking } from "@/modules/availability/use-cases/bind-order-booking"

/**
 * Khách bấm "Tôi đã chuyển khoản". Chỉ hợp lệ khi đã có đơn; không kéo lùi phiên
 * đã COMPLETED. Lần báo đầu đổi phiên sang PAYMENT_REPORTED; đơn đã cọc còn nợ thì mỗi
 * lần báo ghi thêm sự kiện "chuyển phần còn lại".
 */
export async function reportCustomerPayment(
  sendCode: string,
  input: { proofAssetId?: string | undefined } = {},
  repo = getGreetingCardRepository()
) {
  const session = await loadPublicSession(sendCode, repo)
  if (!session.order_id) {
    throw unprocessable("Bạn cần hoàn tất đặt hoa trước khi báo chuyển khoản")
  }

  const paid = Number(session.order?.paid_vnd ?? 0)
  const owing = Number(session.order?.total_vnd ?? 0) - paid
  const proofAssetId = await ownedProofAssetId(session.organization_id, sendCode, input.proofAssetId, repo)
  // Tiệm/catalog bắt buộc ảnh bill → máy chủ cũng chặn (không chỉ giao diện): cần ảnh hợp lệ gửi kèm
  // hoặc ảnh đã tải trước đó cho đúng lần thanh toán này
  const willRecord = session.status === "ORDER_SUBMITTED" || (paid > 0 && owing > 0)
  const storedProof = paid > 0 ? session.payment_proof_balance_asset_id : session.payment_proof_asset_id
  const proofRequired = resolveRequirePaymentProof(parsePaymentPolicy(session.organization?.settings), session.catalog?.filters)
  if (willRecord && proofRequired && !proofAssetId && !storedProof) {
    throw unprocessable("Vui lòng tải ảnh chuyển khoản trước khi báo đã chuyển")
  }

  if (session.status === "ORDER_SUBMITTED") {
    await repo.updateSession(session.id, {
      status: "PAYMENT_REPORTED",
      ...(proofAssetId ? { paymentProofAssetId: proofAssetId } : {}),
    })
    await repo.recordJourneyEvent(session.organization_id, session.id, "CLICK_PAID", {
      orderId: session.order_id,
      ...(proofAssetId ? { proofAssetId } : {}),
      reportedAt: new Date().toISOString(),
    })
  } else if (paid > 0 && owing > 0) {
    // Đã cọc, nay báo chuyển phần còn lại — cập nhật phiên sang PAYMENT_REPORTED để Điều hành nhận notification & duyệt
    await repo.updateSession(session.id, {
      status: "PAYMENT_REPORTED",
      ...(proofAssetId ? { paymentProofBalanceAssetId: proofAssetId } : {}),
    })
    await repo.recordJourneyEvent(session.organization_id, session.id, "CLICK_PAID", {
      orderId: session.order_id,
      purpose: "BALANCE",
      ...(proofAssetId ? { proofAssetId } : {}),
      reportedAt: new Date().toISOString(),
    })
  }

  // Khóa phòng trên Lịch phòng & Khả dụng cho đơn Homestay khi khách đã báo chuyển khoản
  const orgSettings = session.organization?.settings as Record<string, unknown> | null
  const isHomestay = orgSettings?.industry === "HOMESTAY" || orgSettings?.industryKey === "HOMESTAY"
  if (isHomestay && session.order) {
    await ensureHomestayOrderBooking(session.order).catch(() => null)
  }

  return { success: true, message: "Đã ghi nhận thông báo chuyển khoản của bạn" }
}

/**
 * Điều hành xác nhận đã nhận tiền. Không truyền số tiền → lấy đúng khoản
 * khách được yêu cầu chuyển (cọc theo kế hoạch thanh toán của đơn, hoặc phần còn lại).
 * Đối với đơn đặt cọc, phần còn lại (Lần 2) bị chặn không cho thu sớm nếu chưa đủ điều kiện
 * VÀ khách chưa báo chuyển tiền (PO 10/10/2026).
 */
export async function adminConfirmBrochurePayment(
  ctx: TenantContext,
  orderId: string,
  input: {
    amountVnd?: number | undefined
    reference?: string | null | undefined
    note?: string | null | undefined
    confirmationType?: "MANUAL_ADMIN" | "AUTO_SYSTEM_15M" | undefined
    /** Tự duyệt bill: số tiền AI đã đối chiếu lúc khách gửi bill — lệch số phải thu hiện tại thì KHÔNG ghi thu. */
    expectedAmountVnd?: number | undefined
  } = {},
  payments = getBrochurePaymentRepository(),
  orders = getBrochureOrderRepository(),
  repo = getGreetingCardRepository()
) {
  await assertOrderInScope(ctx, orderId, orders)
  const order = await orders.findBrochureOrder(ctx, orderId)
  if (!order) throw notFound()
  const shop = await repo.getShopProfile(ctx.organizationId)
  const policy = policyForOrder(parsePaymentPolicy(shop.settings), order.pricing_rule_ref)
  const total = Number(order.total_vnd)
  const paid = Number(order.paid_vnd)

  const plan = readPaymentPlan(order.pricing_rule_ref)
  const pct = plan?.depositPercent ?? policy.depositPercent
  const deposit = depositAmountVnd(total, pct)
  const isDepositOrder = pct > 0 && deposit < total
  if (isDepositOrder && paid >= deposit && paid < total) assertBalanceCollectible(order, policy)

  let amountVnd = input.amountVnd
  if (amountVnd === undefined) {
    amountVnd = expectedPayment(policy, total, paid).amountVnd
  }
  // Tổng đơn đổi sau khi khách gửi bill (VAT, phụ phí, giảm giá...) → bill không còn chứng minh số tiền này
  if (input.expectedAmountVnd !== undefined && input.expectedAmountVnd !== amountVnd) {
    throw conflict("Số tiền phải thu đã thay đổi sau khi khách gửi bill — cần Điều hành đối chiếu và duyệt tay")
  }

  // Tự động gán bằng chứng chuyển khoản do khách gửi nếu có
  let evidenceAssetId: string | null = null
  if (order.source_session_id) {
    const session = await repo.findSessionById(order.source_session_id)
    if (session) {
      if (paid === 0 && session.payment_proof_asset_id) {
        evidenceAssetId = session.payment_proof_asset_id
      } else if (paid > 0 && session.payment_proof_balance_asset_id) {
        evidenceAssetId = session.payment_proof_balance_asset_id
      }
    }
  }

  const isAuto = input.confirmationType === "AUTO_SYSTEM_15M"
  const defaultRef = isAuto ? "AUTO_SYSTEM_15M" : `BROCHURE-${orderId.slice(0, 8)}`
  const defaultNote = isAuto
    ? "Hệ thống tự động xác nhận chuyển khoản sau 15 phút (có ảnh bill hợp lệ)"
    : "Xác nhận chuyển khoản qua Bộ sưu tập riêng (Điều hành duyệt)"

  const workflow = parseBrochureWorkflowPolicy(shop.settings, shop.type)

  const result = await payments.recordIncomingPayment(ctx, orderId, {
    amountVnd,
    method: "BANK_TRANSFER",
    reference: input.reference?.trim() || defaultRef,
    note: input.note?.trim() || defaultNote,
    evidenceAssetId,
    // Gate 1 (xác nhận tiền) KHÔNG tự nhận đơn.
    // Gate 1b (adminConfirmBrochureOrder) là bước riêng — Điều hành xác nhận đơn sau khi xác nhận tiền.
    // Với Chuỗi: coordinatorAcceptBrochureOrder đóng vai trò Gate 2 tương đương.
    autoAcceptProduction: false,
  })
  queueOrderNotification(ctx.organizationId, orderId, paymentNotifyEvent(result.balanceVnd))
  queueStaffNotification(ctx.organizationId, "PAYMENT_CONFIRMED", {
    orderId,
    orderCode: order.code,
    amountVnd,
    assignedSaleId: order.greeting_sessions?.[0]?.sale_id ?? null,
  })
  return result
}

export async function cancelBrochureOrder(
  ctx: TenantContext,
  orderId: string,
  reason: string,
  confirmInTransit = false,
  payments = getBrochurePaymentRepository()
) {
  await assertOrderInScope(ctx, orderId)
  const result = await payments.cancel(ctx, orderId, reason.trim(), { confirmInTransit })
  queueOrderNotification(ctx.organizationId, orderId, "CANCELLED")
  return result
}

export async function refundBrochureOrder(
  ctx: TenantContext,
  orderId: string,
  input: { amountVnd: number; reason: string },
  payments = getBrochurePaymentRepository(),
  followUps = getCancellationFollowUpRepository()
) {
  await assertOrderInScope(ctx, orderId)
  // Khoản hoàn của đề xuất huỷ đã duyệt được ghi ở "Cần hoàn tiền" (Hộp việc) — ghi thêm ở đây là ghi trùng
  if ((await followUps.pendingRefundsByOrder(ctx, [orderId])).has(orderId)) {
    throw conflict("Đơn này đang có khoản hoàn chờ xử lý ở Hộp việc (mục Cần hoàn tiền) — đánh dấu đã hoàn ở đó để không ghi trùng")
  }
  return payments.refund(ctx, orderId, { amountVnd: input.amountVnd, reason: input.reason.trim() })
}

/**
 * Điều phối xác nhận đã nhận đủ tiền thanh toán lần 2 (balance) cho đơn đặt cọc.
 * Chỉ được gọi khi policy = PAYMENT_OR_COORDINATOR và điều kiện đủ (hoa xong, khách báo bill).
 * Ghi nhận payment tương tự adminConfirmBrochurePayment nhưng note ghi rõ "Điều phối duyệt".
 */
export async function coordinatorConfirmBalancePayment(
  ctx: TenantContext,
  orderId: string,
  input: { note?: string | null | undefined } = {},
  payments = getBrochurePaymentRepository(),
  orders = getBrochureOrderRepository(),
  repo = getGreetingCardRepository()
) {
  await assertOrderInScope(ctx, orderId, orders)
  const order = await orders.findBrochureOrder(ctx, orderId)
  if (!order) throw notFound()

  const total = Number(order.total_vnd)
  const paid = Number(order.paid_vnd)
  const balance = Math.max(0, total - paid)
  if (balance <= 0) throw conflict("Đơn hàng đã thanh toán đủ, không cần xác nhận lần 2")
  if (paid <= 0) throw conflict("Đơn hàng chưa có cọc, không thể xác nhận thanh toán lần 2")
  const shop = await repo.getShopProfile(ctx.organizationId)
  assertBalanceCollectible(order, policyForOrder(parsePaymentPolicy(shop.settings), order.pricing_rule_ref))

  // Lấy bằng chứng ảnh bill lần 2 từ phiên
  let evidenceAssetId: string | null = null
  if (order.source_session_id) {
    const session = await repo.findSessionById(order.source_session_id)
    if (session?.payment_proof_balance_asset_id) {
      evidenceAssetId = session.payment_proof_balance_asset_id
    }
  }

  const noteText = input.note?.trim() || "Điều phối xác nhận đã nhận đủ thanh toán lần 2 (qua ảnh bill)"
  const result = await payments.recordIncomingPayment(ctx, orderId, {
    amountVnd: balance,
    method: "BANK_TRANSFER",
    reference: `COORDINATOR-BALANCE-${orderId.slice(0, 8)}`,
    note: noteText,
    evidenceAssetId,
  })
  queueOrderNotification(ctx.organizationId, orderId, paymentNotifyEvent(result.balanceVnd))
  return result
}

/**
 * Điều phối xác nhận tiền đặt cọc (hoặc toàn bộ tiền nếu đơn không cọc) cho đơn hàng qua ảnh bill.
 * Chỉ hoạt động khi policy cho phép Điều phối và chưa có tiền cọc (paid_vnd <= 0).
 * Thao tác này tương đương với sự phê duyệt của Điều hành đối với tiền cọc.
 */
export async function coordinatorConfirmDepositPayment(
  ctx: TenantContext,
  orderId: string,
  input: { note?: string | null | undefined } = {},
  payments = getBrochurePaymentRepository(),
  orders = getBrochureOrderRepository(),
  repo = getGreetingCardRepository()
) {
  await assertOrderInScope(ctx, orderId, orders)
  const order = await orders.findBrochureOrder(ctx, orderId)
  if (!order) throw notFound()

  const total = Number(order.total_vnd)
  const paid = Number(order.paid_vnd)
  if (paid > 0) throw conflict("Đơn hàng đã được ghi nhận tiền cọc trước đó")
  if (total <= 0) throw conflict("Đơn hàng chưa có giá, không thể xác nhận cọc")

  const shop = await repo.getShopProfile(ctx.organizationId)
  const policy = policyForOrder(parsePaymentPolicy(shop.settings), order.pricing_rule_ref)
  const plan = readPaymentPlan(order.pricing_rule_ref)
  const pct = plan?.depositPercent ?? policy.depositPercent
  const deposit = depositAmountVnd(total, pct)
  const isDepositOrder = pct > 0 && deposit < total
  const amountVnd = isDepositOrder ? deposit : total

  // Lấy bằng chứng ảnh bill lần 1 từ phiên
  let evidenceAssetId: string | null = null
  if (order.source_session_id) {
    const session = await repo.findSessionById(order.source_session_id)
    if (session?.payment_proof_asset_id) {
      evidenceAssetId = session.payment_proof_asset_id
    }
  }

  const workflow = parseBrochureWorkflowPolicy(shop.settings, shop.type)
  const isSingleStore = !workflow.requireCoordinatorAcceptance

  const noteText = input.note?.trim() || `[Điều phối xác nhận] Đã duyệt tiền ${isDepositOrder ? `cọc ${pct}%` : "100%"} (qua ảnh bill)`
  const result = await payments.recordIncomingPayment(ctx, orderId, {
    amountVnd,
    method: "BANK_TRANSFER",
    reference: `COORDINATOR-DEPOSIT-${orderId.slice(0, 8)}`,
    note: noteText,
    evidenceAssetId,
    autoAcceptProduction: isSingleStore,
  })
  queueOrderNotification(ctx.organizationId, orderId, paymentNotifyEvent(result.balanceVnd))
  if (result.autoAccepted) {
    queueOrderNotification(ctx.organizationId, orderId, "ORDER_ACCEPTED")
  }
  return result
}

/** Phần còn lại (Lần 2) của đơn đặt cọc — luật chung ở `domain/balance-collection.ts`, 409 nếu chưa thu được. */
function assertBalanceCollectible(
  order: {
    production_status: string
    delivery_status: string
    greeting_sessions?: Array<{ status: string }>
    qc_records?: Array<{ notes: string | null; created_at: Date }>
  },
  policy: { requireFullBeforeDispatch: boolean; allowShipperCash?: boolean | undefined }
) {
  const blocker = balanceCollectionBlocker(
    {
      productionStatus: order.production_status,
      deliveryStatus: order.delivery_status,
      customerReported: order.greeting_sessions?.some((s) => s.status === "PAYMENT_REPORTED") ?? false,
      qcRecords: order.qc_records ?? [],
    },
    policy,
    Date.now()
  )
  if (blocker) throw conflict(blocker)
}

/**
 * Mã ảnh bill do khách gửi kèm chỉ được nhận khi đúng là ảnh khách vừa tải qua chính link này
 * (cùng cửa hàng, cùng mã gửi) — chặn gắn ảnh của đơn/cửa hàng khác làm chứng từ.
 */
async function ownedProofAssetId(
  organizationId: string,
  sendCode: string,
  raw: string | undefined,
  repo: GreetingCardRepository
): Promise<string | undefined> {
  const id = raw?.trim()
  if (!id) return undefined
  const asset = await repo.findAssetForVerification(organizationId, id)
  const meta = asset?.metadata as { source?: unknown; sendCode?: unknown } | null | undefined
  return meta?.source === "BROCHURE_PAYMENT_PROOF" && meta.sendCode === sendCode ? id : undefined
}

/** Cửa hàng báo giá cho đơn đặt mẫu chưa niêm yết giá; sau đó khách thấy mã QR thanh toán. */
export async function quoteBrochureOrder(
  ctx: TenantContext,
  orderId: string,
  totalVnd: number,
  reason?: string | undefined,
  payments = getBrochurePaymentRepository()
) {
  await assertOrderInScope(ctx, orderId)
  const result = await payments.setQuote(ctx, orderId, totalVnd, reason?.trim() || null)
  // Báo khách đơn đã có giá — kèm link theo dõi để mở QR thanh toán
  queueOrderNotification(ctx.organizationId, orderId, "QUOTED")
  return result
}
