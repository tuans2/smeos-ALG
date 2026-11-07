/**
 * POST /api/v1/internal/chain-dispatch-sweep
 *
 * Cron endpoint — Bộ Quét Mốc Tiến Độ Tự Động cho Đơn Gia Công Chuỗi.
 *
 * Gọi định kỳ mỗi 5-10 phút để:
 *  - M1: Nhắc bắt đầu chế tác khi hết Grace Period
 *  - M2: Nhắc chụp ảnh thành phẩm QC trước giờ giao (mặc định 45 phút)
 *  - M3: Nhắc bàn giao Shipper (mặc định 20 phút trước giờ giao)
 *  - M4: Cảnh báo trễ hạn SLA (mặc định sau 5 phút quá hạn)
 *
 * Bảo mật: Chỉ được gọi khi có header CRON_SECRET hoặc từ Vercel Cron.
 * Chống gửi trùng: Dùng state.remindersSent ghi timestamp lần đã gửi.
 *
 * Gọi thủ công (dev):
 *   curl -X POST http://localhost:3200/api/v1/internal/chain-dispatch-sweep \
 *     -H "x-cron-secret: dev"
 */

import { parseDeliveryTimestampMs } from "@/modules/greeting-card/domain/subcontract-countdown"
import { purgeExpiredIdempotencyKeys } from "@/core/idempotency/infra/idempotency-repository"
import { publicAppUrl } from "@/lib/public-url"
import { jsonResponse } from "@/core/http/response"
import { handle } from "@/core/http/response"
import { forceStepAllowed, isAuthorizedCronRequest } from "@/core/http/cron-auth"
import { ChainDispatchSweepQuery } from "@/modules/greeting-card/infra/chain-dispatch-sweep-query"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { MultiChannelDispatchNotifier } from "@/modules/greeting-card/infra/dispatch-notification-adapter"
import { processOrderDispatchReminders } from "@/modules/greeting-card/use-cases/process-dispatch-reminders"
import type { SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import type { BranchCandidate } from "@/modules/greeting-card/domain/chain-dispatch-engine"
import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { advanceExpiredDispatchRound } from "@/modules/greeting-card/use-cases/advance-dispatch-round"
import { commitSubcontractClaim } from "@/modules/greeting-card/use-cases/commit-subcontract-claim"
import { deliveryAreaOf, formatDeliveryAddress, hasDeliveryAddress } from "@/modules/greeting-card/domain/delivery-address"
import { GoongGeocoder } from "@/modules/greeting-card/adapters/goong-geocoder"
import { resolveDeliveryLocation } from "@/modules/greeting-card/use-cases/resolve-geo-location"
import { sweepProductProposalsIfDue } from "@/modules/products/use-cases/sweep-product-proposals"
import { scanStuckJobs } from "@/modules/jobs/use-cases/scan-stuck-jobs"
import { sweepStorageLifecycle } from "@/modules/storage/use-cases/sweep-storage-lifecycle"
import { runPiiBackfill } from "@/core/security/infra/pii-backfill"

/** Kích thước một trang truy vấn — nhỏ để giới hạn bộ nhớ, lặp tới khi hết tập cần xử lý */
const PAGE_SIZE = 50
/**
 * Ngân sách thời gian một lượt quét — dưới `--max-time 120` của cron Render (render.yaml).
 * Hết ngân sách → dừng có kiểm soát sau trang đang xử lý, lượt 5 phút sau đi tiếp.
 */
const TIME_BUDGET_MS = 90 * 1000
/** Trần an toàn số trang một lượt (50 × 200 = 10.000 đơn) — vòng lặp luôn có giới hạn */
const MAX_PAGES = 200
/** Giới hạn số dòng chi tiết trả về trong phản hồi cron */
const MAX_REPORTED = 100

export const POST = handle(async (request) => {
  // Bảo mật: xác thực cron secret header (production thiếu CRON_SECRET → luôn từ chối)
  if (!isAuthorizedCronRequest(request)) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const forceStep = (forceStepAllowed() ? url.searchParams.get("forceStep") : null) as
    | "M1_PREP"
    | "M2_QC"
    | "M2_QC_RETRY"
    | "M2_QC_ESCALATED"
    | "M3_DISPATCH"
    | "M4_OVERDUE"
    | null

  const now = new Date()
  const stateRepo = new SubcontractOrderRepository()
  const notifier = new MultiChannelDispatchNotifier()
  const geocoder = new GoongGeocoder()

  let totalProcessed = 0
  let totalRemindersSent = 0
  const sentDetails: Array<{ orderCode: string; step: string; message?: string | undefined }> = []
  const errors: string[] = []

  // 1. Phiên điều phối đang hoạt động (OPEN / CLAIMED_GRACE / COMMITTED), lọc trong DB, duyệt theo trang
  const sweepQuery = new ChainDispatchSweepQuery()
  let roundsAdvanced = 0
  let graceCommitted = 0
  type Coordination = Awaited<ReturnType<ChainDispatchSweepQuery["listActiveDispatchPage"]>>[number]

  const processPage = async (coordinations: Coordination[]): Promise<void> => {

    const subStatus = (c: (typeof coordinations)[number]) =>
      ((c.metadata as Record<string, unknown> | null)?.subcontract_dispatch as Record<string, unknown> | undefined)
        ?.dispatchStatus as string | undefined

    // Đơn còn OPEN: hết hạn vòng nhận → mời vòng tiếp theo hoặc chuyển Điều phối
    const openCoords = coordinations.filter((c) => subStatus(c) === "OPEN")
    if (openCoords.length > 0) {
      const openOrgs = new Map((await sweepQuery.listOrganizationSettings([...new Set(openCoords.map((c) => c.organization_id))])).map((o) => [o.id, o]))
      const openOrders = new Map((await sweepQuery.listOrdersForReminders(openCoords.map((c) => c.order_id))).map((o) => [o.id, o]))
      const branchRepo = new ChainBranchRepository()
      for (const coord of openCoords) {
        const order = openOrders.get(coord.order_id)
        const org = openOrgs.get(coord.organization_id)
        if (!order || !org) continue
        const state = (coord.metadata as Record<string, unknown>).subcontract_dispatch as SubcontractOrderState
        if (!state.roundExpiresAt || now.getTime() < new Date(state.roundExpiresAt).getTime()) continue
        try {
          const ctx: TenantContext = { organizationId: coord.organization_id, workspaceId: coord.organization_id, userId: "cron:chain-dispatch-sweep", branchId: null, capabilities: new Set<string>() }
          const win = (order.delivery_window as Record<string, unknown> | null) ?? {}
          const settings = (org.settings as Record<string, unknown> | null) ?? {}
          const coordinatorChannel = settings.coordinator_channel as { telegramChatId?: string } | undefined
          const firstItemMeta = (order.items?.[0]?.metadata as Record<string, unknown> | null) ?? {}
          const deliveryAddress = formatDeliveryAddress(order.delivery_address)
          const result = await advanceExpiredDispatchRound(ctx, {
            state,
            shopSettings: org.settings,
            branches: await branchRepo.listCandidates(coord.organization_id),
            deliveryAddress,
            deliveryLocation: hasDeliveryAddress(deliveryAddress)
              ? await resolveDeliveryLocation(ctx, { orderId: coord.order_id, address: deliveryAddress }, geocoder, stateRepo, now)
              : null,
            deliveryArea: deliveryAreaOf(order.delivery_address),
            deliveryTime: typeof win.timeSlot === "string" && typeof win.date === "string" ? `${win.timeSlot} ngày ${win.date}` : "Giao trong ngày",
            baseUrl: publicAppUrl() || url.origin,
            imageUrl: (firstItemMeta.imageUrl as string | undefined) || (firstItemMeta.image as string | undefined) || null,
            coordinatorTelegramChatId: coordinatorChannel?.telegramChatId ?? null,
          }, stateRepo, notifier, now)
          if (result.action !== "NONE") {
            roundsAdvanced++
            log.info("chain_dispatch_sweep.round_expired", { orderId: coord.order_id, action: result.action })
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`order:${coord.order_id} — ${msg}`)
          log.warn("chain_dispatch_sweep.round_error", { orderId: coord.order_id, error: msg })
        }
      }
    }

    // Lọc chỉ những đơn đang ở trạng thái cần nhắc việc
    const activeCoords = coordinations.filter((c) => {
      const meta = c.metadata as Record<string, unknown> | null
      if (!meta || typeof meta !== "object") return false
      const sub = meta.subcontract_dispatch as Record<string, unknown> | undefined
      if (!sub) return false
      const status = sub.dispatchStatus as string | undefined
      return status === "COMMITTED" || status === "CLAIMED_GRACE"
    })

    if (activeCoords.length === 0) return

    // 2. Nhóm theo organization để lấy settings một lần
    const orgIds = [...new Set(activeCoords.map((c) => c.organization_id))]
    const orgs = await sweepQuery.listOrganizationSettings(orgIds)
    const orgMap = new Map(orgs.map((o) => [o.id, o]))
    const chainBranches = new ChainBranchRepository()

    // 3. Lấy thông tin đơn hàng (delivery_window, items) theo batch
    const orderIds = activeCoords.map((c) => c.order_id)
    const orders = await sweepQuery.listOrdersForReminders(orderIds)
    const orderMap = new Map(orders.map((o) => [o.id, o]))

    // 4. Xử lý từng coordination
    for (const coord of activeCoords) {
      try {
        const order = orderMap.get(coord.order_id)
        if (!order) continue

        const org = orgMap.get(coord.organization_id)
        if (!org) continue

        const meta = coord.metadata as Record<string, unknown>
        let state = meta.subcontract_dispatch as SubcontractOrderState
        if (!state?.claimedBranchId) continue
        const claimedBranchId = state.claimedBranchId

        const ctx: TenantContext = { organizationId: coord.organization_id, workspaceId: coord.organization_id, userId: "cron:chain-dispatch-sweep", branchId: null, capabilities: new Set<string>() }

        // Hết thời gian huỷ nhận mà chi nhánh không huỷ → hệ thống chốt (PO 22/10/2026, "bật cả hai")
        if (state.dispatchStatus === "CLAIMED_GRACE") {
          const committed = await commitSubcontractClaim(ctx, {
            orderId: coord.order_id, orderCode: order.code, deliveryWindow: order.delivery_window as Record<string, unknown> | null, shopSettings: org.settings, now,
          })
          if (committed === "COMMITTED") {
            graceCommitted++
            state = { ...state, dispatchStatus: "COMMITTED", remindersSent: { ...(state.remindersSent ?? {}), M1_PREP: now.toISOString() } }
          }
        }

        // Giờ giao = cuối khung giờ, cùng một hàm với thẻ chi nhánh, đếm ngược và khấu trừ giao trễ.
        // Trước 22/10/2026 sweep lấy đầu khung và bỏ qua khung dạng "12h" (rà soát cụm G, G-c).
        const deliveryWindow = order.delivery_window as Record<string, unknown> | null
        const deliveryTimeStr = (deliveryWindow?.timeSlot as string | undefined) || "Theo thỏa thuận"
        const deliveryDateStr = (deliveryWindow?.date as string | undefined) || null
        let deliveryTimestampMs = parseDeliveryTimestampMs(deliveryDateStr, deliveryWindow?.timeSlot as string | undefined) ?? 0

        // Nếu không có thông tin thời gian và không ép step → bỏ qua đơn này
        if (deliveryTimestampMs === 0 && !forceStep) continue
        if (deliveryTimestampMs === 0) {
          deliveryTimestampMs = Date.now() + 30 * 60 * 1000 // Giả lập 30 phút nữa giao nếu không có giờ
        }

        // Chi nhánh đã nhận đơn — cần kênh liên lạc để nhắc mốc
        const branchData = await chainBranches.findByCode(coord.organization_id, claimedBranchId)
        if (!branchData) continue
        const branch: BranchCandidate = {
          ...branchData,
          branchName: state.claimedBranchName ?? branchData.branchName,
          activeJobsCount: 0,
          maxConcurrentJobs: 10,
          isActive: true,
        }

        // Đơn hàng có ảnh thành phẩm khi production_status là QUALITY_CHECK / READY hoặc metadata có qc_photos
        const hasQcPhoto = order.production_status === "QUALITY_CHECK" || order.production_status === "READY"
        const subDispatchMeta = (coord.metadata as Record<string, unknown> | null)?.subcontract_dispatch as Record<string, unknown> | undefined
        const hasShipperInfo = Boolean(subDispatchMeta?.shipper_info) || order.delivery_status === "DELIVERING" || order.delivery_status === "DELIVERED"
        const hasDeliveryProof = Boolean((coord.metadata as Record<string, unknown> | null)?.delivery_proof) || order.delivery_status === "DELIVERED"

        const settings = (org.settings as Record<string, unknown> | null) ?? {}
        const coordinatorChannel = settings.coordinator_channel as
          | { phone?: string; telegramChatId?: string }
          | undefined

        // Khách duyệt ảnh thành phẩm: tính theo thời gian lúc đọc (domain/photo-approval.ts), không cần quét

        // Xác định ảnh sản phẩm (Ưu tiên ảnh QC nếu có, fallback ảnh mẫu trong items)
        const coordMeta = (coord.metadata as Record<string, unknown> | null) ?? {}
        const qcPhotos = Array.isArray(coordMeta.qc_photos) ? (coordMeta.qc_photos as string[]) : []
        const firstItemMeta = (order.items?.[0]?.metadata as Record<string, unknown> | null) ?? {}
        const sampleImageUrl = (firstItemMeta.imageUrl as string | undefined) || (firstItemMeta.image as string | undefined) || null
        const productImageUrl = qcPhotos.length > 0 ? qcPhotos[0] : sampleImageUrl

        const results = await processOrderDispatchReminders(
          ctx,
          {
            orderId: coord.order_id,
            orderCode: order.code,
            deliveryTimeStr,
            deliveryDateStr,
            deliveryTimestampMs,
            state,
            branch,
            shopSettings: org.settings,
            hasQcPhoto,
            hasShipperInfo,
            hasDeliveryProof,
            deliveryStatus: order.delivery_status ?? undefined,
            coordinatorChannel,
            // Cron gọi qua host nội bộ Render — link gửi chi nhánh phải dùng URL công khai đã cấu hình
            baseUrl: publicAppUrl() || url.origin,
            forceStep: forceStep ?? undefined,
            productImageUrl,
          },
          stateRepo,
          notifier,
          now
        )

        const successfullySent = results.filter((r) => r.sent)
        if (successfullySent.length > 0) {
          log.info("chain_dispatch_sweep.reminders_sent", {
            orderId: coord.order_id,
            orderCode: order.code,
            orgId: coord.organization_id,
            steps: successfullySent.map((r) => r.step),
          })
          for (const item of successfullySent) {
            sentDetails.push({
              orderCode: order.code,
              step: item.step,
              message: item.message,
            })
          }
        }

        totalRemindersSent += successfullySent.length
        totalProcessed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`order:${coord.order_id} — ${msg}`)
        log.warn("chain_dispatch_sweep.error", { orderId: coord.order_id, error: msg })
      }
    }
  }

  // Duyệt hết các phiên điều phối đang hoạt động theo trang; một lượt chồng lượt khác thì bỏ qua
  const startedMs = Date.now()
  const sweep = await sweepQuery.withSweepLock(TIME_BUDGET_MS + 25_000, async () => {
    let afterId: string | null = null
    for (let page = 0; page < MAX_PAGES; page++) {
      if (Date.now() - startedMs > TIME_BUDGET_MS) return { pages: page, complete: false }
      const coordinations = await sweepQuery.listActiveDispatchPage(PAGE_SIZE, afterId)
      if (coordinations.length === 0) return { pages: page, complete: true }
      afterId = coordinations[coordinations.length - 1]!.id
      await processPage(coordinations)
      if (coordinations.length < PAGE_SIZE) return { pages: page + 1, complete: true }
    }
    return { pages: MAX_PAGES, complete: false }
  })

  if (!sweep) {
    log.info("chain_dispatch_sweep.skipped_locked", {})
    return jsonResponse({ ok: true, skipped: "Lượt quét trước vẫn đang chạy", sweepAt: now.toISOString() })
  }
  if (!sweep.complete) log.warn("chain_dispatch_sweep.incomplete", { pages: sweep.pages, processed: totalProcessed })
  // Mẫu sản phẩm đề xuất (nhắc / hết hạn / dọn) — đi chung cron để không thêm dịch vụ Render.
  const productProposals = await sweepProductProposalsIfDue(now)
  // YC-J10: job PROCESSING quá 15 phút → FAILED. Render không có cron riêng cho
  // `scripts/scan-stuck-jobs.ts`, nên job kẹt làm /internal/health trả 503 mãi.
  const stuckJobsFailed = await scanStuckJobs(now).catch((error: unknown) => {
    log.error("chain_dispatch_sweep.stuck_jobs_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })
  // SDAGF P1: dọn thùng rác quá hạn + xoá payload trong hàng đợi.
  const storageLifecycle = await sweepStorageLifecycle(now)
  // E5.3: khoá idempotent quá 30 ngày.
  const idempotencyKeysPurged = await purgeExpiredIdempotencyKeys(now).catch(() => null)
  // ADR-014 P-5a: mã hoá theo lô cột cá nhân còn chữ rõ (dữ liệu cũ, lệnh ghi không rõ tổ chức)
  const piiEncrypted = await runPiiBackfill().catch((error: unknown) => {
    log.error("chain_dispatch_sweep.pii_backfill_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  })

  return jsonResponse({
    ok: true,
    processed: totalProcessed,
    remindersSent: totalRemindersSent,
    roundsAdvanced,
    graceCommitted,
    pages: sweep.pages,
    stuckJobsFailed,
    storageLifecycle,
    idempotencyKeysPurged,
    piiEncrypted,
    complete: sweep.complete,
    productProposals: productProposals ?? undefined,
    sentDetails: sentDetails.length > 0 ? sentDetails.slice(0, MAX_REPORTED) : undefined,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors.slice(0, MAX_REPORTED) : undefined,
    sweepAt: now.toISOString(),
  })
})
