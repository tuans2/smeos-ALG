import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { mapOrderStatusToTrackingStep } from "../domain/greeting-card-rules"
import { areaOnly, maskPersonName, phoneLast4Matches } from "../domain/tracking-privacy"
import { orderPhotoApproval } from "../domain/photo-approval"
import type { ProductSnapshot } from "../domain/greeting-card-types"
import { parseStepSla, calculateExpectedStepTimeline } from "../domain/step-sla"
import { parseShippingConfig } from "../domain/brochure-pricing"
import { snapshotFromOrder } from "../domain/order-change-request"
import { customerChangeSection } from "./order-change"
import { customerSubstituteSection } from "./substitute"
import { customerFlowerSection } from "./flower-substitute"
import { latestFailureForCustomer } from "../domain/delivery-failure"
import { parsePaymentPolicy, resolveRequirePaymentProof } from "../domain/brochure-payment-policy"
import { orderPaymentSummary } from "../domain/payment-summary"
import { paymentInstructionsFor } from "./payment-instructions"
import { customerVisiblePaidVnd } from "../domain/deposit-acknowledgement"
import { customerCancellationNotice } from "../domain/customer-cancellation-notice"
import { thankYouVoucherFor } from "./thank-you-voucher"
import { ensureHomestayOrderBooking } from "@/modules/availability/use-cases/bind-order-booking"

const ORDER_CODE_REGEX = /^[A-Z0-9-]{4,40}$/

/** Cách người xem chứng minh mình là khách: mở từ chính link của đơn, hoặc nhập 4 số cuối SĐT người đặt. */
export interface TrackingProof {
  sendCode?: string | null | undefined
  phoneLast4?: string | null | undefined
}

/**
 * Trang theo dõi công khai theo mã đơn. Chỉ đơn nguồn Thẻ chào; không bao giờ trả SĐT.
 * Mã đơn nằm trong nội dung chuyển khoản nên ai cũng có thể biết — mặc định chỉ trả thông tin
 * rút gọn (tên người nhận viết tắt, phường + tỉnh, không lời nhắn thiệp); có `proof` hợp lệ mới
 * trả đầy đủ (PO 06/10/2026).
 */
export async function getBrochureTracking(
  orderCode: string,
  proof: TrackingProof = {},
  orders = getBrochureOrderRepository(),
  repo = getGreetingCardRepository()
) {
  const code = orderCode.trim().toUpperCase()
  if (!ORDER_CODE_REGEX.test(code)) return { status: "NOT_FOUND" as const }

  const order = await orders.getTrackingOrderByCode(code)
  if (!order) return { status: "NOT_FOUND" as const }

  const linkCode = proof.sendCode?.trim().toUpperCase()
  const verified =
    (!!linkCode && order.greeting_sessions.some((s) => s.send_code === linkCode)) ||
    (!!proof.phoneLast4 && phoneLast4Matches(order.customer?.phone, proof.phoneLast4.trim()))

  const step = mapOrderStatusToTrackingStep(order.status, order.production_status, order.delivery_status)

  const firstItem = order.items[0]
  const snapshot = (firstItem?.metadata as unknown as ProductSnapshot | null) ?? null

  // Ảnh thành phẩm và ảnh người nhận là HAI mục riêng — ảnh người nhận không đè ảnh thành phẩm.
  // Mỗi bản ghi QC ghi loại ảnh ở `notes`; chỉ ký asset của đúng tổ chức sở hữu đơn.
  const idsOf = (kind: string) =>
    order.qc_records
      .filter((qc) => qc.notes === kind)
      .flatMap((qc) => (Array.isArray(qc.image_asset_ids) ? qc.image_asset_ids : []))
      .filter((id): id is string => typeof id === "string")
  const productIds = idsOf("PRODUCT_PHOTO_UPLOADED")
  // Ảnh người nhận là ảnh của một người cụ thể — chỉ hiện khi đã xác minh
  const recipientIds = verified ? idsOf("RECIPIENT_PHOTO_UPLOADED") : []
  const urls = await repo.getAssetsStorageMap(order.organization_id, [...productIds, ...recipientIds])
  const toUrls = (ids: string[]) => ids.map((id) => urls.get(id)).filter((u): u is string => Boolean(u))
  const productPhotoUrls = toUrls(productIds)
  const recipientPhotoUrls = toUrls(recipientIds)

  const address = (order.delivery_address as { recipientName?: string; street?: string; parts?: { ward?: string; province?: string } } | null) || {}
  const deliveryWindow = (order.delivery_window as Record<string, string> | null) || {}

  // SPEC #3 + PO 15/10/2026 (mục 4): khách duyệt ảnh thành phẩm theo chế độ tiệm chọn — cùng luật
  // với chặn giao ship ở Điều phối. Chế độ "Bỏ qua" không hỏi khách.
  const storePolicy = parsePaymentPolicy(order.organization?.settings)
  const catalogFilters = order.greeting_sessions.find((s) => s.catalog?.filters)?.catalog?.filters as Record<string, unknown> | null | undefined
  const approval = productPhotoUrls.length > 0
    ? orderPhotoApproval(order, order.organization?.settings, storePolicy.productPhotoReviewMinutes, new Date())
    : null
  const photoApproval: {
    status: "NONE" | "PENDING" | "FEEDBACK" | "APPROVED" | "AUTO_APPROVED"
    uploadedAt: string | null
    countdownMinutes: number
    approvedAt: string | null
  } = approval && approval.status !== "BYPASSED"
    ? { status: approval.status, uploadedAt: approval.uploadedAt, countdownMinutes: approval.countdownMinutes, approvedAt: approval.approvedAt }
    : { status: "NONE", uploadedAt: null, countdownMinutes: approval?.countdownMinutes ?? 10, approvedAt: null }

  const orgSettings = (order as { organization?: { settings?: unknown } }).organization?.settings
  const slaConfig = parseStepSla(orgSettings)
  const timeline = calculateExpectedStepTimeline(deliveryWindow.date, deliveryWindow.timeSlot, slaConfig)
  const policy = parsePaymentPolicy(orgSettings)
  const ledgerPaidVnd = Number(order.paid_vnd)
  // Điều phối đã tiếp nhận đơn có bill mà Điều hành chưa ghi sổ → khách vẫn thấy đã nhận khoản Lần 1 (PO 15/10/2026)
  const customerReported = order.greeting_sessions.some((s) => s.status === "PAYMENT_REPORTED" || Boolean(s.payment_proof_asset_id))
  const paidVnd = customerVisiblePaidVnd(
    { status: order.status, productionStatus: order.production_status, totalVnd: Number(order.total_vnd), paidVnd: ledgerPaidVnd, customerReported, pricingRuleRef: order.pricing_rule_ref },
    policy.depositPercent,
  )
  const acknowledgedOnly = paidVnd !== ledgerPaidVnd
  const money = { totalVnd: Number(order.total_vnd), paidVnd, pricingRuleRef: order.pricing_rule_ref }
  const payment = orderPaymentSummary(
    { ...money, status: order.status, productionStatus: order.production_status, deliveryStatus: order.delivery_status },
    policy.depositPercent,
    { reported: money.paidVnd === 0 && order.greeting_sessions.some((s) => s.status === "PAYMENT_REPORTED") },
    { requireFullBeforeDispatch: policy.requireFullBeforeDispatch },
  )

  // Điều phối không nhận / huỷ giữa chừng đã được duyệt → thông báo cho khách (PO 16/10/2026)
  const notice = order.status === "CANCELLED" && payment.status !== "PAYMENT_FAILED"
    ? customerCancellationNotice(await orders.cancellationRecordsOf(order.organization_id, order.id))
    : null
  // Khách đã chuyển khoản mà tiệm chưa kịp ghi nhận → vẫn báo sẽ hoàn tiền
  const cancellationNotice = notice ? { ...notice, refundToConfirm: notice.refundVnd === 0 && ledgerPaidVnd === 0 && customerReported } : null

  let checkOutDate = deliveryWindow.checkOutDate || null
  if (!checkOutDate && deliveryWindow.date) {
    const match = order.internal_note?.match(/➔\s*(\d{4}-\d{2}-\d{2})/)
    if (match?.[1] && match[1] > deliveryWindow.date) {
      checkOutDate = match[1]
    } else if (firstItem?.quantity && firstItem.quantity >= 1) {
      const inMs = Date.parse(`${deliveryWindow.date}T00:00:00Z`)
      if (!Number.isNaN(inMs)) {
        checkOutDate = new Date(inMs + firstItem.quantity * 86_400_000).toISOString().slice(0, 10)
      }
    }
  }

  const industryKey = (orgSettings as Record<string, unknown> | null)?.industry ?? (orgSettings as Record<string, unknown> | null)?.industryKey ?? "FLORAL"

  if (industryKey === "HOMESTAY" && order.status !== "CANCELLED" && firstItem?.product_id) {
    ensureHomestayOrderBooking({
      id: order.id,
      code: order.code,
      organization_id: order.organization_id,
      delivery_window: { ...deliveryWindow, checkOutDate },
      internal_note: order.internal_note,
      items: order.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    }).catch(() => null)
  }

  return {
    status: "FOUND" as const,
    order: {
      code: order.code,
      status: order.status,
      productionStatus: order.production_status,
      deliveryStatus: order.delivery_status,
      totalVnd: Number(order.total_vnd),
      paidVnd,
      balanceVnd: acknowledgedOnly ? Math.max(0, money.totalVnd - paidVnd) : Number(order.balance_vnd),
      /** `false` = đang xem bản rút gọn; nhập 4 số cuối SĐT người đặt để xem đầy đủ. */
      verified,
      cardMessage: verified ? order.card_message : null,
      recipientName: verified ? address.recipientName || "Khách nhận" : maskPersonName(address.recipientName),
      deliveryAddress: verified ? address.street || "" : areaOnly(address),
      deliveryDate: deliveryWindow.date || null,
      deliveryTimeSlot: deliveryWindow.timeSlot || null,
      checkOutDate,
      customerReportedPayment: customerReported,
      productSnapshot: snapshot,
      /** Giữ cho client cũ: ảnh thành phẩm mới nhất */
      finishedImageUrl: productPhotoUrls[0] ?? null,
      productPhotoUrls,
      recipientPhotoUrls,
      photoApproval,
      industryKey,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      timeline,
      /** Thông báo bất khả kháng khi cửa hàng được Điều phối duyệt bỏ qua bằng chứng ảnh/shipper */
      bypassNotices: (() => {
        const coordMeta = ((order as unknown as { coordination?: { metadata?: unknown } }).coordination?.metadata as Record<string, unknown> | null) ?? {}
        const bypassRequests = (coordMeta.bypass_requests as Record<string, unknown> | undefined) ?? {}
        const qcApproved = Boolean(coordMeta.bypass_qc_approved) || (bypassRequests.QC as Record<string, unknown> | undefined)?.status === "APPROVED"
        const shipperApproved = Boolean(coordMeta.bypass_shipper_approved) || (bypassRequests.SHIPPER as Record<string, unknown> | undefined)?.status === "APPROVED"
        const podApproved = Boolean(coordMeta.bypass_pod_approved) || (bypassRequests.POD as Record<string, unknown> | undefined)?.status === "APPROVED"

        return {
          qc: qcApproved ? "Do điều kiện chế tác & tiến độ giao gấp, tiệm xin phép không cập nhật ảnh chụp trước khi giao. Sản phẩm vẫn được kiểm định cẩn thận theo đúng mẫu bạn đã chọn." : null,
          shipper: shipperApproved ? "Đơn hàng đang được shipper chuyên trách của chuỗi vận chuyển trực tiếp đến bạn." : null,
          pod: podApproved ? "Đơn hàng đã được bàn giao thành công trực tiếp theo thỏa thuận giao nhận." : null,
        }
      })(),
      /** Kế hoạch + các đợt thanh toán; khi hoa đã xong mà còn nợ: mã QR trả phần còn lại.
       *  Thu trước giao: QR chỉ hiện SAU KHI khách xác nhận ảnh (hoặc hết hạn tự xác nhận) —
       *  không hiện cùng lúc với khung duyệt ảnh (PO 09/10/2026). */
      payment: {
        ...payment,
        requirePaymentProof: resolveRequirePaymentProof(policy, catalogFilters),
        balanceInstructions: (() => {
          if (order.status === "CANCELLED" || payment.remainingVnd <= 0) return null
          // Cọc mới được Điều phối xác nhận: chưa đòi phần còn lại cho tới khi đến hạn
          if (acknowledgedOnly && !payment.balanceDue) return null
          // Thu trước giao + đang chờ khách duyệt ảnh (và đã cọc) → hoãn hiện QR lần 2
          if (policy.requireFullBeforeDispatch && photoApproval.status === "PENDING" && payment.paidVnd > 0) return null
          return paymentInstructionsFor(orgSettings, money, order.code)
        })(),
      },
      /** Lần giao gần nhất không thành công (ghi chú của shipper chỉ cho người đặt đã xác minh). */
      deliveryFailure: order.delivery_status === "FAILED" ? latestFailureForCustomer(order.delivery_window, verified) : null,
      /** Chỉ người đặt đã xác minh: đổi thông tin đơn (thông tin hiện tại để điền sẵn form + lịch sử yêu cầu). */
      change: verified
        // Không trả SĐT (luật của trang theo dõi): ô SĐT người nhận để trống = giữ nguyên số cũ
        ? { current: { ...snapshotFromOrder(order), recipientPhone: "" }, shipping: parseShippingConfig(orgSettings), ...(await customerChangeSection(order)) }
        : null,
      /** Chỉ người đặt đã xác minh: tiệm đề xuất mẫu thay thế (khách chọn mẫu / nhờ tiệm chọn / xin huỷ). */
      substitute: verified ? await customerSubstituteSection(order) : null,
      /** Chỉ người đặt đã xác minh: tiệm đề xuất đổi một loại hoa phụ, kèm ảnh hoa thay thế (ALG 5.14). */
      flowerSubstitute: verified ? await customerFlowerSection(order) : null,
      /** Đơn bị huỷ do tiệm không thực hiện được: hạn nhân viên liên hệ + số tiền hoàn (0 = không hoàn). */
      cancellationNotice,
      /** Chỉ người đặt đã xác minh, đơn đã hoàn tất: mã giảm giá dùng một lần cho đơn sau (ALG 5.15). */
      thankYouVoucher: verified ? await thankYouVoucherFor(order) : null,
    },
    // Huỷ vì hết hạn thanh toán: báo "không hoàn thành" thay cho "cửa hàng đã huỷ"
    trackingStep: payment.status === "PAYMENT_FAILED"
      ? { ...step, title: "Đơn hàng không hoàn thành", description: "Chưa nhận được thanh toán trong thời hạn nên đơn đã tự huỷ." }
      : step,
  }
}
