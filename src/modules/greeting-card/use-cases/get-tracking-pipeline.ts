import { resolveSaleScope } from "./order-scope"
import type { TenantContext } from "@/core/tenancy"
import { TrackingPipelineRepository, getTrackingPipelineRepository } from "../infra/tracking-pipeline-repository"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { parseStepSla, stuckOf } from "../domain/step-sla"
import { channelLabel } from "../domain/catalog-channel"
import { orderStepStartedAt, sessionStepStartedAt } from "../domain/pipeline-clock"
import { linkFactsOf, pendingLinkTitle, type LinkFacts } from "../domain/link-ownership"
import { defaultOwnerOf } from "./share-links"
import {
  PIPELINE_STEPS,
  getIndustryPipelineSteps,
  type TrackingPipelineItem,
  type TrackingPipelineStepId,
  type TrackingStepState,
} from "../domain/tracking-pipeline-types"
import { dismissalOf } from "../domain/dismissal-policy"
import { orderProductView, productImagesFor } from "./order-product-views"
import { resolveCoordinatorId } from "../domain/coordinator-owner"
import { paymentProgress } from "@/modules/orders/domain/payment-progress"

/** Trường JSON lỏng (ảnh chụp mẫu, địa chỉ, khung giờ, metadata ghi chú) — đọc phòng thủ, không `any`. */
type LooseJson = {
  name?: string; price?: number; imageUrl?: string; recipientName?: string
  phone?: string; street?: string; date?: string; timeSlot?: string; zone?: string
}

function loose(value: unknown): LooseJson {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as LooseJson) : {}
}

function resolveOrderStep(order: {
  status: string
  production_status: string
  delivery_status: string
  total_vnd: number | unknown
  paid_vnd: number | unknown
  sessionStatus?: string | null | undefined
}): TrackingPipelineStepId {
  const total = Number(order.total_vnd || 0)
  const paid = Number(order.paid_vnd || 0)

  if (order.delivery_status === "DELIVERED" || order.status === "COMPLETED") {
    return "STEP_9_COMPLETED"
  }
  if (order.delivery_status === "DELIVERING" || order.delivery_status === "DISPATCHED") {
    return "STEP_8_DELIVERING"
  }
  if (order.production_status === "READY" || order.production_status === "DONE") {
    return "STEP_7_READY_QC"
  }
  if (order.production_status === "ARRANGING") {
    return "STEP_6_ARRANGING"
  }
  if (order.status === "CONFIRMED" || paymentProgress(total, paid) === "PAID") {
    return "STEP_5_PAYMENT_CONFIRMED"
  }
  if (order.sessionStatus === "PAYMENT_REPORTED" || paid > 0) {
    return "STEP_4_PAYMENT_PENDING"
  }
  return "STEP_3_FILLING_FORM"
}

function resolveSessionStep(session: {
  status: string
  opened_at?: Date | null | undefined
}): TrackingPipelineStepId {
  if (session.status === "PAYMENT_REPORTED") return "STEP_4_PAYMENT_PENDING"
  if (session.status === "ORDER_SUBMITTED") return "STEP_3_FILLING_FORM"
  // Đã mở link = xong bước "mở link", đang chọn mẫu
  if (session.status === "SELECTED" || session.status === "BROWSING" || session.status === "OPENED") return "STEP_2_CHOOSING"
  return "STEP_1_OPENED"
}

/** Danh sách theo dõi (Hộp việc, danh sách việc) — cùng tập dữ liệu với mọi view. */
export async function getTrackingPipeline(ctx: TenantContext, repo = getTrackingPipelineRepository()): Promise<TrackingPipelineItem[]> {
  return (await loadTrackingDataset(ctx, repo)).items
}

/**
 * NGUỒN DỮ LIỆU DUY NHẤT của "Theo dõi tiến độ": mọi view (Kanban, Danh sách, Lịch, Công việc,
 * Dashboard) và Hộp việc đều đi qua đây — cùng phạm vi xem của sale, cùng cách suy bước và SLA.
 * Trả kèm cấu hình thời gian chuẩn đã đọc để các view tính SLA không phải đọc lại.
 */
export async function loadTrackingDataset(
  ctx: TenantContext,
  repo = getTrackingPipelineRepository(),
  now = new Date(), opts: { ordersOnly?: boolean } = {} // ordersOnly: bảng Điều phối không cần link chưa có đơn
): Promise<{ items: TrackingPipelineItem[]; sla: ReturnType<typeof parseStepSla>; industryKey: string }> {
  const saleId = await resolveSaleScope(ctx)
  const [orders, activeSessions, org, fallbackOwner] = await Promise.all([
    repo.listBrochureOrders(ctx, saleId, now),
    opts.ordersOnly ? Promise.resolve([] as Awaited<ReturnType<typeof repo.listActiveSessions>>) : repo.listActiveSessions(ctx, saleId, now),
    getCurrentOrganization(ctx),
    defaultOwnerOf(ctx.organizationId),
  ])
  const industryKey = ((org?.settings as Record<string, unknown> | null)?.industry as string) || "FLORAL"
  const pipelineSteps = getIndustryPipelineSteps(industryKey)
  // Đơn/link cũ (trước khi có nút "Sao chép link mang tên bạn") → người phụ trách mặc định
  const ownerOf = (id: string | undefined) => (id === "public" ? fallbackOwner ?? undefined : id)
  const sla = parseStepSla(org?.settings)
  const channels = await repo.orderChannels(ctx, orders.map((o) => o.id))
  // Link riêng → "Link riêng của sale"; link sao chép → kênh lúc sao chép; link cũ → kênh `?kenh=` của đơn
  const channelOf = (facts: LinkFacts | null, orderId?: string) =>
    facts?.kind === "PERSONAL" ? "Link riêng của sale"
      : facts?.kind === "SHARED" ? `Link bộ sưu tập · ${channelLabel(facts.shareChannel ?? "")}`
      : `Link chung · ${channelLabel(orderId ? channels.get(orderId) ?? "" : "")}`

  const stepMap = new Map(pipelineSteps.map((s) => [s.id, s]))
  const saleIds = [
    ...orders.map((o) => ownerOf(o.greeting_sessions[0]?.sale_id) ?? ""),
    ...activeSessions.map((s) => ownerOf(s.sale_id) ?? ""),
  ]
  const coordinatorIds = orders
    .map(
      (o) =>
        o.coordination?.coordinator_id ||
        o.events.find((e) => (e.axis === "production" || e.axis === "delivery") && e.actor_id)?.actor_id ||
        o.qc_records[0]?.inspector_id ||
        o.assignments[0]?.assigned_by ||
        ""
    )
    .filter(Boolean)

  const names = await repo.memberNames(ctx, [...saleIds, ...coordinatorIds])
  const saleNameOf = (id: string | undefined) => {
    const owner = ownerOf(id)
    return !owner ? "Chưa gán" : names.get(owner) ?? "Nhân viên đã rời"
  }

  // Tải danh sách URL ảnh chuyển khoản của khách theo lô (tránh N+1)
  const proofAssetIds = [
    ...orders.flatMap((o) => [
      o.greeting_sessions[0]?.payment_proof_asset_id,
      o.greeting_sessions[0]?.payment_proof_balance_asset_id,
    ]),
    ...activeSessions.flatMap((s) => [
      s.payment_proof_asset_id,
      s.payment_proof_balance_asset_id,
    ]),
  ].filter((id): id is string => typeof id === "string" && id.length > 0)

  const proofUrls = await getGreetingCardRepository().getPaymentProofAssetsMap(ctx.organizationId, proofAssetIds)
  const productImages = await productImagesFor(ctx, [...orders, ...activeSessions.map((s) => ({ items: [], greeting_sessions: [s] }))], repo)

  // 1. Process Orders
  const orderItems: TrackingPipelineItem[] = orders.map((order) => {
    const session = order.greeting_sessions[0]
    const product = orderProductView(order, productImages, "Sản phẩm Bộ sưu tập riêng")
    const deliveryAddress = loose(order.delivery_address)
    const deliveryWindow = loose(order.delivery_window)

    const currentStepId = resolveOrderStep({
      status: order.status,
      production_status: order.production_status,
      delivery_status: order.delivery_status,
      total_vnd: order.total_vnd,
      paid_vnd: order.paid_vnd,
      sessionStatus: session?.status,
    })

    const currentStepDef = stepMap.get(currentStepId) ?? pipelineSteps[0]!
    const currentIndex = currentStepDef.orderIndex

    const inCoordination =
      ["STEP_6_ARRANGING", "STEP_7_READY_QC", "STEP_8_DELIVERING", "STEP_9_COMPLETED"].includes(currentStepId) ||
      ["ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY", "DONE"].includes(order.production_status) ||
      ["DISPATCHED", "DELIVERING", "DELIVERED", "FAILED"].includes(order.delivery_status)

    const rawCoordId = resolveCoordinatorId(order)

    const coordinatorId = rawCoordId ? ownerOf(rawCoordId) ?? rawCoordId : null
    const coordinatorName = coordinatorId
      ? names.get(coordinatorId) ?? "Nhân viên đã rời"
      : inCoordination
        ? "Chưa gán"
        : null

    const steps: TrackingStepState[] = pipelineSteps.map((def) => {
      let status: "completed" | "current" | "pending" = "pending"
      if (def.orderIndex < currentIndex) status = "completed"
      else if (def.orderIndex === currentIndex) status = "current"

      return {
        id: def.id,
        title: def.title,
        shortTitle: def.shortTitle,
        roleResponsible: def.roleResponsible,
        orderIndex: def.orderIndex,
        status,
      }
    })

    const orderDismissal = dismissalOf((order.pricing_rule_ref as { dismissal?: unknown } | null)?.dismissal)
    const isOrderCancelled = order.status === "CANCELLED" || orderDismissal?.status === "APPROVED"
    const orderCancelReason = orderDismissal?.status === "APPROVED" ? orderDismissal.reason || "Đã bỏ hiển thị"
      : order.status !== "CANCELLED" ? null
      : (order.pricing_rule_ref as { paymentFailed?: { reason?: string } } | null)?.paymentFailed?.reason === "PAYMENT_TIMEOUT"
        ? "Tự huỷ: Hết hạn thanh toán cọc" : "Đơn hàng đã huỷ"
    return {
      id: order.id,
      type: "ORDER",
      orderId: order.id,
      sessionId: session?.id || "",
      orderCode: order.code,
      sendCode: session?.send_code || order.code,
      catalogName: session?.catalog?.name || "Bộ sưu tập riêng",
      customerName: order.customer?.name || deliveryAddress?.recipientName || "Khách hàng",
      customerPhone: order.customer?.phone || deliveryAddress?.phone || "",
      recipientName: deliveryAddress?.recipientName ?? null,
      recipientPhone: deliveryAddress?.phone ?? null,
      deliveryAddress: deliveryAddress?.street ?? null,
      deliveryDate: deliveryWindow?.date ?? null,
      deliveryTimeSlot: deliveryWindow?.timeSlot ?? null,
      deliveryZone: deliveryAddress?.zone ?? null,
      deliveryFailed: order.delivery_status === "FAILED",
      saleName: saleNameOf(session?.sale_id),
      cardMessage: order.card_message ?? null,
      productName: product.name,
      productPrice: product.price,
      productImageUrl: product.imageUrl,
      totalVnd: Number(order.total_vnd || 0),
      paidVnd: Number(order.paid_vnd || 0),
      balanceVnd: Number(order.balance_vnd || 0),
      currentStepId,
      // Đơn đã gửi mà chưa chuyển khoản vẫn ở bước 3 — gọi đúng tên việc đang chờ
      currentStepTitle: isOrderCancelled ? (orderCancelReason ?? "Đơn hàng đã huỷ") : (currentStepId === "STEP_3_FILLING_FORM" ? "Đã đặt đơn — chờ khách chuyển khoản" : currentStepDef.title),
      orderStatus: order.status,
      sessionStatus: session?.status || null,
      customerReportedPaid: session?.status === "PAYMENT_REPORTED" || Boolean(session?.payment_proof_balance_asset_id),
      paymentProofUrl: session?.payment_proof_asset_id ? proofUrls.get(session.payment_proof_asset_id)?.url ?? null : null,
      paymentProofAnalysis: session?.payment_proof_asset_id ? proofUrls.get(session.payment_proof_asset_id)?.analysis ?? null : null,
      paymentProofBalanceUrl: session?.payment_proof_balance_asset_id ? proofUrls.get(session.payment_proof_balance_asset_id)?.url ?? null : null,
      paymentProofBalanceAnalysis: session?.payment_proof_balance_asset_id ? proofUrls.get(session.payment_proof_balance_asset_id)?.analysis ?? null : null,
      productionStatus: order.production_status,
      deliveryStatus: order.delivery_status,
      isCancelled: isOrderCancelled,
      cancelReason: orderCancelReason,
      dismissal: orderDismissal,
      stepStartedAt: orderStepStartedAt(order),
      stuck: stuckOf({ currentStepId, stepStartedAt: orderStepStartedAt(order) }, sla, now),
      saleId: ownerOf(session?.sale_id) ?? null,
      coordinatorId: coordinatorId ?? null,
      coordinatorName: coordinatorName ?? null,
      channel: channelOf(session ? linkFactsOf(session) : null, order.id),
      linkKind: session ? linkFactsOf(session).kind : "LEGACY",
      copiedAt: session ? linkFactsOf(session).copiedAt : null,
      expiresAt: null,
      steps,
      lastActiveAt: order.updated_at.toISOString(),
      createdAt: order.created_at.toISOString(),
    }
  })

  // 2. Process Sessions without order
  const sessionItems: TrackingPipelineItem[] = activeSessions.map((session) => {
    const facts = linkFactsOf(session)
    // Link riêng chưa sao chép = chưa gửi khách: chưa tính giờ "khách chưa mở"
    const notSent = session.status === "CREATED" && facts.kind === "PERSONAL" && !facts.copiedAt
    const startedAt = session.status === "CREATED" && facts.copiedAt ? facts.copiedAt : sessionStepStartedAt(session)
    const product = orderProductView({ items: [], greeting_sessions: [session] }, productImages, "Chưa chốt mẫu")
    const currentStepId = resolveSessionStep({
      status: session.status,
      opened_at: session.opened_at,
    })
    const currentStepDef = stepMap.get(currentStepId) ?? pipelineSteps[0]!
    const currentIndex = currentStepDef.orderIndex

    const steps: TrackingStepState[] = pipelineSteps.map((def) => {
      let status: "completed" | "current" | "pending" = "pending"
      if (def.orderIndex < currentIndex) status = "completed"
      else if (def.orderIndex === currentIndex) status = "current"

      return {
        id: def.id,
        title: def.title,
        shortTitle: def.shortTitle,
        roleResponsible: def.roleResponsible,
        orderIndex: def.orderIndex,
        status,
      }
    })

    const sessionDismissal = dismissalOf((loose(session.product_snapshot) as Record<string, unknown>)._dismissal)
    const isSessionCancelled = sessionDismissal?.status === "APPROVED" || session.revoked_at !== null || (session.expires_at !== null && session.expires_at <= now)
    const sessionCancelReason = sessionDismissal?.status === "APPROVED" ? sessionDismissal.reason || "Đã bỏ hiển thị"
      : !isSessionCancelled ? null
      : session.revoked_at !== null
        ? (session.opened_at === null ? "Tự huỷ: Quá hạn mở link" : "Tự huỷ: Quá hạn chọn mẫu")
        : (session.opened_at === null ? "Hết hạn mở link" : "Hết hạn chọn mẫu")

    return {
      id: `session-${session.id}`,
      type: "SESSION",
      orderId: null,
      sessionId: session.id,
      orderCode: null,
      sendCode: session.send_code,
      catalogName: session.catalog?.name || "Bộ sưu tập riêng",
      customerName: session.customer_name || "Khách đang xem mẫu",
      customerPhone: session.customer_phone || "",
      recipientName: null,
      recipientPhone: null,
      deliveryAddress: null,
      deliveryDate: null,
      saleName: saleNameOf(session.sale_id),
      cardMessage: null,
      productName: product.name,
      productPrice: product.price,
      productImageUrl: product.imageUrl,
      totalVnd: product.price,
      paidVnd: 0,
      balanceVnd: product.price,
      currentStepId,
      currentStepTitle: isSessionCancelled
        ? (sessionCancelReason ?? "Link đã huỷ / hết hạn")
        : pendingLinkTitle({ status: session.status, copiedAt: facts.copiedAt, kind: facts.kind }),
      isCancelled: isSessionCancelled,
      sessionStatus: session.status,
      customerReportedPaid: session.status === "PAYMENT_REPORTED",
      paymentProofUrl: session.payment_proof_asset_id ? proofUrls.get(session.payment_proof_asset_id)?.url ?? null : null,
      paymentProofAnalysis: session.payment_proof_asset_id ? proofUrls.get(session.payment_proof_asset_id)?.analysis ?? null : null,
      paymentProofBalanceUrl: session.payment_proof_balance_asset_id ? proofUrls.get(session.payment_proof_balance_asset_id)?.url ?? null : null,
      paymentProofBalanceAnalysis: session.payment_proof_balance_asset_id ? proofUrls.get(session.payment_proof_balance_asset_id)?.analysis ?? null : null,
      cancelReason: sessionCancelReason,
      dismissal: sessionDismissal,
      stepStartedAt: startedAt,
      stuck: notSent ? null : stuckOf({ currentStepId, stepStartedAt: startedAt }, sla, now),
      saleId: ownerOf(session.sale_id) ?? null,
      coordinatorId: null,
      coordinatorName: null,
      channel: channelOf(facts),
      linkKind: facts.kind,
      copiedAt: facts.copiedAt,
      expiresAt: session.expires_at?.toISOString() ?? null,
      steps,
      lastActiveAt: session.last_active_at.toISOString(), openedAt: session.opened_at?.toISOString() ?? null,
      createdAt: session.created_at.toISOString(),
    }
  })

  // Combine and sort by lastActiveAt descending
  const items = [...orderItems, ...sessionItems].sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  )
  return { items, sla, industryKey }
}
