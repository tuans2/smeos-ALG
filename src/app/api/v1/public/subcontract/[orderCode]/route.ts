import { conflict, unprocessable, validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { loadSubcontractOrderForBranch } from "@/modules/greeting-card/use-cases/authorize-subcontract-branch"
import { MultiChannelDispatchNotifier } from "@/modules/greeting-card/infra/dispatch-notification-adapter"
import {
  cancelClaimSubcontractUseCase,
  claimSubcontractUseCase,
} from "@/modules/greeting-card/use-cases/handle-subcontract-claim"
import { commitSubcontractClaim } from "@/modules/greeting-card/use-cases/commit-subcontract-claim"
import { signSubcontractPhoto } from "@/modules/greeting-card/use-cases/sign-subcontract-photo"
import { formatDeliveryAddress, extractRecipientInfo } from "@/modules/greeting-card/domain/delivery-address"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import type { TenantContext } from "@/core/tenancy"
import { publicAppUrl } from "@/lib/public-url"
import { craftFeePayable } from "@/modules/greeting-card/domain/craft-fee-policy"
import type { SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { suggestCraftFee } from "@/modules/greeting-card/use-cases/suggest-craft-fee"
import { subcontractActionBody } from "@/app/api/v1/public/_contracts/requests"

/**
 * GET /api/v1/public/subcontract/[orderCode]?branch=[branchId]
 * Công khai: Chi nhánh bấm vào link nhận đơn để xem Thẻ Gia Công.
 */
export const GET = handle<[{ params: Promise<{ orderCode: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "subcontract-view", limit: 120, windowMs: 60_000 })
  const { orderCode } = await context.params
  const url = new URL(request.url)
  const branchId = url.searchParams.get("branch")

  const repo = new SubcontractOrderRepository()
  const order = await loadSubcontractOrderForBranch(request, orderCode, branchId, repo)

  // Kiểm tra chi nhánh có thuộc cùng tổ chức với đơn hàng hay không
  let branchName = ""
  if (branchId) {
    const branch = await repo.findBranchInOrganization(branchId, order.organization_id)
    if (branch) branchName = branch.name
  }

  const coordMeta = (order.coordination?.metadata as Record<string, unknown> | null) ?? {}
  const subState = coordMeta.subcontract_dispatch as Record<string, unknown> | undefined

  const pricingRef = (order.pricing_rule_ref as Record<string, unknown> | null) ?? {}
  // Phí đã chốt lúc mời; đơn cũ chưa chốt thì tính theo phương án tiệm đang cài (PO 22/10/2026)
  const craftFee = (subState as Pick<SubcontractOrderState, "craftFee"> | undefined)?.craftFee
  const subcontractPriceVnd =
    typeof subState?.subcontractPriceVnd === "number"
      ? (subState.subcontractPriceVnd as number)
      : typeof pricingRef.subcontract_price_vnd === "number"
      ? (pricingRef.subcontract_price_vnd as number)
      : (await suggestCraftFee(order.organization_id, order.id, new CraftFeeFactsRepository())).suggestedVnd

  const firstItem = order.items[0]
  const session = order.greeting_sessions[0]
  const snapshot = (session?.product_snapshot as Record<string, unknown> | null) ?? {}
  const firstItemMeta = (firstItem?.metadata as Record<string, unknown> | null) ?? {}

  const productName = firstItem?.description || (snapshot.name as string | undefined) || "Sản phẩm đặt gia công"
  // URL công khai đã cấu hình, không tin header Host do client gửi (rà soát M7)
  const baseOrigin = publicAppUrl() || url.origin

  const { resolveSubcontractSamplePhoto } = await import("@/modules/greeting-card/use-cases/resolve-subcontract-sample-photo")
  const productImageUrl = await resolveSubcontractSamplePhoto(order, { baseUrl: baseOrigin })

  const deliveryWindow = (order.delivery_window as Record<string, unknown> | null) ?? {}
  const deliveryAddress = formatDeliveryAddress(order.delivery_address)
  const recipientInfo = extractRecipientInfo(order.delivery_address)
  const isReadyForDelivery =
    order.production_status === "READY" ||
    order.delivery_status === "DELIVERING" ||
    order.delivery_status === "DELIVERED"
  // Chi nhánh được mời nhưng không nhận đơn vẫn giữ link 14 ngày: chỉ chi nhánh đang làm đơn mới thấy
  // SĐT người nhận, ảnh QC/giao hàng, shipper và yêu cầu bỏ qua (rà soát cụm G, 22/10/2026)
  const isClaimant = Boolean(subState?.claimedBranchId) && subState?.claimedBranchId === branchId
  // Khoản trừ (lý do khiếu nại, giao trễ) chỉ chi nhánh đang làm đơn thấy
  const deductions = isClaimant ? (craftFee?.deductions ?? []) : []
  const showPhone = isClaimant && isReadyForDelivery
  const recipientPhone = showPhone ? recipientInfo.phone : recipientInfo.maskedPhone
  const deliveryTime = typeof deliveryWindow.timeSlot === "string" && typeof deliveryWindow.date === "string"
    ? `${deliveryWindow.timeSlot} ngày ${deliveryWindow.date}`
    : "Giao trong ngày"

  const rawQcPhotos = isClaimant && Array.isArray(coordMeta.qc_photos) ? (coordMeta.qc_photos as string[]) : []
  const rawPodPhotos = isClaimant && Array.isArray(coordMeta.pod_photos) ? (coordMeta.pod_photos as string[]) : []
  const resolvedQcPhotos = await Promise.all(rawQcPhotos.map((p) => signSubcontractPhoto(p, order.organization_id)))
  const resolvedPodPhotos = await Promise.all(rawPodPhotos.map((p) => signSubcontractPhoto(p, order.organization_id)))

  const rawPodProof = (isClaimant ? coordMeta.delivery_proof : undefined) as
    | { note?: string; deliveredAt?: string; deliveredByBranch?: string }
    | undefined

  const { workshopNoteOf } = await import("@/modules/greeting-card/domain/order-slip-extras")
  const specialNotes = workshopNoteOf(order.internal_note)
  const {
    parseDeliveryTimestampMs,
    calculateStepMilestoneDeadlines,
  } = await import("@/modules/greeting-card/domain/subcontract-countdown")

  const deliveryTimestampMs = parseDeliveryTimestampMs(
    typeof deliveryWindow.date === "string" ? deliveryWindow.date : null,
    typeof deliveryWindow.timeSlot === "string" ? deliveryWindow.timeSlot : null
  )

  const stepDeadlines = calculateStepMilestoneDeadlines({
    deliveryTimestampMs,
    graceExpiresAt: subState?.graceExpiresAt as string | undefined,
  })

  return jsonResponse({
    data: {
      orderId: order.id,
      orderCode: order.code,
      branchId: branchId ?? "",
      branchName,
      product: {
        name: productName,
        imageUrl: productImageUrl,
        bomItems: (pricingRef.bom_items as Array<{ name: string; quantity: number; unit: string }>) || [],
      },
      deliveryAddress,
      deliveryTime,
      deliveryTimestampMs,
      stepDeadlines,
      recipientName: recipientInfo.recipientName,
      recipientPhone,
      isPhoneMasked: !showPhone,
      cardMessage: order.card_message ?? null,
      specialNotes,
      subcontractPriceVnd,
      craftFeeDeductions: deductions.map((d) => ({ amountVnd: d.amountVnd, reason: d.reason })),
      craftFeePayableVnd: craftFeePayable(subcontractPriceVnd, deductions),
      dispatchStatus: subState?.dispatchStatus ?? "OPEN",
      claimedByBranchId: subState?.claimedBranchId ?? null,
      claimedBranchName: subState?.claimedBranchName ?? null,
      graceExpiresAt: subState?.graceExpiresAt ?? null,
      productionStatus: order.production_status,
      deliveryStatus: order.delivery_status,
      orderStatus: order.status,
      qcPhotos: resolvedQcPhotos.filter(Boolean),
      lastAiVerification: coordMeta.last_ai_verification ?? null,
      autoBypassedCoordinator: Boolean(coordMeta.auto_bypassed_coordinator),
      bypassRequests: isClaimant ? ((coordMeta.bypass_requests as Record<string, unknown> | undefined) ?? null) : null,
      shipperInfo: isClaimant ? ((coordMeta.shipper_info as { shipperName: string; shipperPhone: string; submittedAt: string } | undefined) ?? null) : null,
      deliveryProof: rawPodProof
        ? {
            photoUrls: resolvedPodPhotos.filter(Boolean),
            note: rawPodProof.note || null,
            deliveredAt: rawPodProof.deliveredAt || null,
            deliveredByBranch: rawPodProof.deliveredByBranch || null,
          }
        : null,
    },
  })
})

/**
 * POST /api/v1/public/subcontract/[orderCode]
 * Thao tác trên Thẻ Gia Công: TIẾP NHẬN, HỦY TRONG HẠN, hoặc XÁC NHẬN LÀM NGAY.
 */
export const POST = handle<[{ params: Promise<{ orderCode: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "subcontract-action", limit: 30, windowMs: 60_000 })
  const { orderCode } = await context.params

  const body = await request.json().catch(() => ({}))
  const parsed = subcontractActionBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const { action, branchId } = parsed.data
  const repo = new SubcontractOrderRepository()
  const order = await loadSubcontractOrderForBranch(request, orderCode, branchId, repo)

  // Xác thực chi nhánh hợp lệ thuộc tổ chức
  const branch = await repo.findBranchInOrganization(branchId, order.organization_id)
  if (!branch) throw unprocessable("Chi nhánh không hợp lệ hoặc không thuộc hệ thống.")

  const org = await repo.findOrganizationSettings(order.organization_id)

  const ctx: TenantContext = {
    organizationId: order.organization_id,
    workspaceId: "default",
    userId: `branch_${branch.id}`,
    branchId: branch.id,
    capabilities: new Set(),
  }

  const notifier = new MultiChannelDispatchNotifier()

  if (action === "CLAIM") {
    const { resolveSubcontractSamplePhoto } = await import("@/modules/greeting-card/use-cases/resolve-subcontract-sample-photo")
    const sampleImageUrl = await resolveSubcontractSamplePhoto(order)

    const result = await claimSubcontractUseCase(
      ctx,
      {
        orderId: order.id,
        branchId: branch.id,
        branchName: branch.name,
        shopSettings: org?.settings,
        baseUrl: publicAppUrl(),
        productImageUrl: sampleImageUrl,
      },
      repo,
      notifier,
      [{
        branchId: branch.id,
        branchName: branch.name,
        qualityScore: 100,
        activeJobsCount: 0,
        maxConcurrentJobs: 10,
        isActive: true,
        // Kênh liên lạc của chi nhánh chuỗi — thiếu thì tin xác nhận nhận đơn không gửi được
        channels: (await new ChainBranchRepository().findByCode(order.organization_id, branch.id))?.channels,
      }]
    )
    return jsonResponse({ data: result })
  }

  if (action === "CANCEL") {
    const result = await cancelClaimSubcontractUseCase(
      ctx,
      { orderId: order.id, branchId: branch.id },
      repo,
      new Date(),
      notifier
    )

    // Đánh giá chất lượng dịch vụ: Trừ điểm KPI chi nhánh vì đã hủy nhận đơn
    const penalty = await new ChainBranchRepository().applyPenalty(order.organization_id, branch.id, "CANCELLATION",
      `Hủy nhận đơn #${order.code} trong hạn kiểm tra kho (Kho thiếu hoa/nguyên liệu)`)

    return jsonResponse({
      data: {
        ...result,
        penalty: {
          penalized: true,
          scoreDeducted: 2,
          currentQualityScore: penalty.newQualityScore,
          totalCancellations: penalty.count,
        },
      },
    })
  }

  if (action === "COMMIT") {
    // Chốt dưới khoá dòng; bấm lại khi đã chốt không gửi lại tin M1 và tin báo khách (rà soát cụm G)
    const outcome = await commitSubcontractClaim(ctx, {
      orderId: order.id,
      orderCode: order.code,
      deliveryWindow: order.delivery_window as Record<string, unknown> | null,
      shopSettings: org?.settings,
      branchId: branch.id,
    })
    return jsonResponse({ data: { success: true, dispatchStatus: "COMMITTED", ...(outcome === "ALREADY_COMMITTED" ? { alreadyCommitted: true } : {}) } })
  }

  if (action === "DELETE_QC") {
    const photoToDelete = parsed.data.photoUrl
    if (!photoToDelete) {
      throw validationFailed({ photoUrl: "Thiếu thông tin ảnh cần xóa" })
    }
    const qcState = await repo.loadSubcontractState(ctx, order.id)
    if (!qcState || qcState.claimedBranchId !== branch.id) {
      throw unprocessable("Chỉ chi nhánh đã nhận đơn mới được xoá ảnh thành phẩm.")
    }

    // Xoá đúng MỘT ảnh, khớp nguyên khoá kho (trước đây khớp chuỗi con: một chuỗi ghép mọi khoá xoá
    // hết ảnh), và chỉ khi ảnh chưa được duyệt — sau đó ảnh QC là bằng chứng (rà soát cụm G)
    const key = photoToDelete.startsWith("org/") ? photoToDelete : photoToDelete.match(/(?:^|\/)(org\/[^?#]+)/)?.[1]
    let remainingCount = 0
    const ok = await new SubcontractStepStore().applyStep({
      organizationId: order.organization_id,
      orderId: order.id,
      require: { productionStatus: ["WAITING", "ASSIGNED", "ARRANGING", "QUALITY_CHECK"], deliveryStatus: ["PENDING"] },
      metadata: (current) => {
        const photos = Array.isArray(current.qc_photos) ? (current.qc_photos as string[]) : []
        const remaining = photos.filter((p) => p !== photoToDelete && p !== key)
        remainingCount = remaining.length
        return { ...current, qc_photos: remaining }
      },
    })
    if (!ok) throw conflict("Ảnh thành phẩm đã được duyệt, không thể xoá.")
    return jsonResponse({ data: { success: true, remainingCount } })
  }

  throw unprocessable("Hành động không hợp lệ.")
})

export const dynamic = "force-dynamic"
