import { randomUUID } from "crypto"
import { statusAfterDelivery } from "@/modules/greeting-card/domain/order-settlement"
import { completeIfSettled } from "@/modules/greeting-card/infra/order-settlement"
import { prepareLateDeliveryDeduction } from "@/modules/greeting-card/use-cases/craft-fee-deductions"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { conflict, unprocessable, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { loadSubcontractOrderForBranch } from "@/modules/greeting-card/use-cases/authorize-subcontract-branch"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { log } from "@/core/observability/log"
import { queueOrderNotification } from "@/modules/greeting-card/use-cases/notify-customer"
import { MultiChannelDispatchNotifier } from "@/modules/greeting-card/infra/dispatch-notification-adapter"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"
import { escapeTelegramHtml } from "@/modules/greeting-card/domain/chain-dispatch-policy"
import { SUBCONTRACT_STEP_NOT_ALLOWED, SUBCONTRACT_STEP_PRECONDITION, subcontractStepAllowed } from "@/modules/greeting-card/domain/subcontract-order"
import { publicAppUrl } from "@/lib/public-url"
import type { TenantContext } from "@/core/tenancy"
import {
  cancelSubcontractReminderSteps,
  getMilestoneSteps,
} from "@/modules/greeting-card/use-cases/cancel-subcontract-reminder-steps"
import { defineRoute } from "@/core/http/define-route"

const MAX_POD_PHOTO_BYTES = 10 * 1024 * 1024 // 10 MB

function sniffImage(bytes: Uint8Array): { ext: "jpg" | "png" | "webp"; mimeType: string } | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mimeType: "image/jpeg" }
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", mimeType: "image/png" }
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mimeType: "image/webp" }
  }
  return null
}

/**
 * POST /api/v1/public/subcontract/[orderCode]/submit-delivery
 *
 * Cửa hàng/Chi nhánh gửi ảnh bằng chứng giao hàng (POD) và xác nhận hoàn tất đơn hàng.
 * Cập nhật delivery_status = DELIVERED, status = COMPLETED, và thông báo cho khách hàng.
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "subcontract-submit-delivery", limit: 30, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { orderCode } = params as { orderCode: string }

    const formData = await request.formData().catch(() => null)
    if (!formData) {
      throw validationFailed({ body: "Dữ liệu gửi lên không đúng định dạng multipart/form-data" })
    }

    const file = formData.get("file")
    const branchId = formData.get("branchId")
    const note = typeof formData.get("note") === "string" ? (formData.get("note") as string).trim() : ""

    if (typeof branchId !== "string" || !branchId.trim()) {
      throw validationFailed({ branchId: "Thiếu mã chi nhánh phụ trách" })
    }

    const repo = new SubcontractOrderRepository()
    const order = await loadSubcontractOrderForBranch(request, orderCode, branchId, repo)

    if (!file || !(file instanceof Blob)) {
      throw validationFailed({ file: "Vui lòng chọn ảnh chụp giao hàng (ảnh người nhận / trước cửa / phiếu nhận)" })
    }

    // Kiểm tra chi nhánh có đúng là bên đang gia công đơn này không
    const coordMeta = (order.coordination?.metadata as Record<string, unknown> | null) ?? {}
    const subState = coordMeta.subcontract_dispatch as Record<string, unknown> | undefined
    if (subState?.claimedBranchId !== branchId) {
      throw unprocessable("Đơn hàng này không thuộc chi nhánh của bạn.")
    }
    if (!subcontractStepAllowed("POD", order)) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED.POD)

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    if (bytes.byteLength === 0) {
      throw validationFailed({ file: "Tệp ảnh được chọn bị rỗng" })
    }
    if (bytes.byteLength > MAX_POD_PHOTO_BYTES) {
      throw validationFailed({ file: "Ảnh tải lên vượt quá dung lượng tối đa 10MB" })
    }

    const sniffed = sniffImage(bytes)
    if (!sniffed) {
      throw validationFailed({ file: "Định dạng tệp không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WebP." })
    }

    const storage = getStorageProvider()

    // 1. Lấy thông tin sản phẩm và ảnh mẫu gốc ban đầu
    const snapshot = (order.greeting_sessions?.[0]?.product_snapshot as Record<string, unknown> | null) ?? {}
    const itemMeta = (order.items[0]?.metadata as Record<string, unknown> | null) ?? {}
    const productName = order.items[0]?.description || (snapshot.name as string | undefined) || (itemMeta.name as string | undefined) || "Sản phẩm đặt gia công"
    const { resolveSubcontractSamplePhoto } = await import("@/modules/greeting-card/use-cases/resolve-subcontract-sample-photo")
    const samplePhotoUrl = await resolveSubcontractSamplePhoto(order)
    let sampleImageUrl = samplePhotoUrl || (snapshot.image_url || snapshot.imageUrl || itemMeta.imageUrl || itemMeta.image_url) as string | undefined

    if (sampleImageUrl && (sampleImageUrl.startsWith("org/") || sampleImageUrl.includes("floraos-core/org/") || sampleImageUrl.includes("smeos-core/org/"))) {
      try {
        const key = sampleImageUrl.startsWith("org/")
          ? sampleImageUrl
          : sampleImageUrl.match(/(?:floraos-core|smeos-core)\/(org\/[^?]+)/)?.[1]
        if (key) {
          sampleImageUrl = await storage.signedUrl(key, 604800, "GET").catch(() => sampleImageUrl)
        }
      } catch {
        // ignore
      }
    }

    // 2. Lấy ảnh thành phẩm QC đã upload trước đó để AI đối chiếu chéo
    const store = new SubcontractStepStore()
    const existingMeta = await store.readMetadata(order.organization_id, order.id)
    const existingQcPhotos = Array.isArray(existingMeta.qc_photos) ? (existingMeta.qc_photos as string[]) : []
    const latestQcKey = existingQcPhotos[existingQcPhotos.length - 1]
    let qcImageUrl: string | undefined
    if (latestQcKey) {
      if (latestQcKey.startsWith("http://") || latestQcKey.startsWith("https://") || latestQcKey.startsWith("data:")) {
        qcImageUrl = latestQcKey
      } else {
        qcImageUrl = await storage.signedUrl(latestQcKey, 3600, "GET").catch(() => undefined)
      }
    }

    // 3. AI Vision kiểm định ảnh bàn giao hàng POD
    const { verifyPodPhotoWithAi } = await import("@/modules/greeting-card/use-cases/verify-pod-photo-ai")
    const aiVerify = await verifyPodPhotoWithAi({
      organizationId: order.organization_id,
      orderId: order.id,
      productName,
      sampleImageUrl,
      qcImageUrl,
      podPhotoBytes: bytes,
      podPhotoMimeType: sniffed.mimeType,
    })

    if (!aiVerify.isMatch) {
      log.warn("subcontract.pod_photo_rejected_by_ai", {
        orderId: order.id,
        orderCode: order.code,
        branchId,
        aiVerify,
      })
      if (aiVerify.verdict === "UNCERTAIN") throw unprocessable(aiVerify.reason)
      throw unprocessable(
        `❌ Ảnh giao hàng không hợp lệ: ${aiVerify.reason} (Độ tin cậy: ${aiVerify.confidenceScore}%). Vui lòng chụp rõ người nhận hoặc kiện hàng tại điểm giao!`
      )
    }

    const assetId = randomUUID()
    const storageKey = `org/${order.organization_id}/subcontract/${order.id}/pod-${assetId}.${sniffed.ext}`
    await storage.put(storageKey, Buffer.from(bytes), sniffed.mimeType)
    const publicPhotoUrl = await storage.signedUrl(storageKey, 3600, "GET")

    const deliveredAt = new Date().toISOString()
    // Giao trễ giờ hẹn → trừ phí gia công theo % tiệm cài (mặc định 0%)
    const applyLateFee = await prepareLateDeliveryDeduction(order.organization_id, order.id, new CraftFeeFactsRepository(), new Date(deliveredAt))
    // Giao xong còn nợ → "Đã giao — chờ thu đủ" (checklist ALG 4.26)
    const settledStatus = statusAfterDelivery({ totalVnd: Number(order.total_vnd), paidVnd: Number(order.paid_vnd) })
    const saved = await store.applyStep({
      organizationId: order.organization_id,
      orderId: order.id,
      order: { delivery_status: "DELIVERED", status: settledStatus },
      require: SUBCONTRACT_STEP_PRECONDITION.POD,
      metadata: (current) => {
        const podPhotos = [...(Array.isArray(current.pod_photos) ? (current.pod_photos as string[]) : []), storageKey]
        const deliveryProof = { photoUrls: podPhotos, note: note || "Đã giao thành công cho khách hàng", deliveredAt, deliveredByBranch: branchId }
        return applyLateFee({ ...current, pod_photos: podPhotos, delivery_proof: deliveryProof, last_pod_uploaded_at: deliveredAt })
      },
      events: [
        {
          axis: "delivery",
          fromValue: order.delivery_status || "DELIVERING",
          toValue: "DELIVERED",
          actorId: `branch_${branchId}`,
          reason: `[Xác Nhận Giao Hàng POD] Chi nhánh tải ảnh giao hàng thành công. Ghi chú: ${note || "Không có"}`,
        },
        {
          axis: "status",
          fromValue: order.status,
          toValue: settledStatus,
          actorId: `branch_${branchId}`,
          reason: settledStatus === "COMPLETED" ? "[Hoàn Tất] Đơn hàng hoàn thành sau khi xác nhận giao hoa thành công." : "[Đã giao] Chờ thu đủ tiền trước khi hoàn tất.",
        },
      ],
    })
    if (!saved) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED.POD)
    await completeIfSettled(order.organization_id, order.id)

    // 1. Tự động gửi thông báo chúc mừng & cảm ơn khách hàng kèm ảnh giao hàng
    try {
      queueOrderNotification(order.organization_id, order.id, "DELIVERED")
    } catch (err) {
      log.error("subcontract.customer_notify_delivered_failed", { orderId: order.id, error: err })
    }

    // ✅ First-Wins Mutex (Store-Stream): Hủy toàn bộ M4 reminders vì cửa hàng đã xác nhận giao qua link
    cancelSubcontractReminderSteps({
      organizationId: order.organization_id,
      orderId: order.id,
      steps: getMilestoneSteps("M4"),
      reason: "store_action_via_link",
      actorId: `branch_${branchId}`,
    }).catch((err) => {
      log.warn("subcontract.cancel_m4_reminders_failed", {
        orderCode: order.code,
        error: err instanceof Error ? err.message : String(err),
      })
    })

    // 2. Bắn thông báo xác nhận hoàn tất tới kênh Điều phối / Chi nhánh
    try {
      const branchObj = await new ChainBranchRepository().findByCode(order.organization_id, branchId)
      const branchName = branchObj?.branchName || "Chi nhánh phụ trách"

      const tenantCtx: TenantContext = {
        organizationId: order.organization_id,
        workspaceId: "default",
        userId: `branch_${branchId}`,
        branchId,
        capabilities: new Set<string>(),
      }
      const notifier = new MultiChannelDispatchNotifier()
      const cardUrl = subcontractBranchUrl({ baseUrl: publicAppUrl(), organizationId: order.organization_id, orderCode: order.code, branchId })
      if (branchObj) {
        await notifier.sendSubcontractInvite(tenantCtx, {
          branch: branchObj,
          orderCode: order.code,
          messageText: `🎉 [HOÀN TẤT GIAO HÀNG] Đơn hàng #${order.code} đã được giao thành công!\n📸 Bằng chứng giao hàng (POD) đã lưu trữ.\n💰 Chi phí gia công đã được ghi nhận quyết toán. Cảm ơn chi nhánh ${escapeTelegramHtml(branchName)}!`,
          claimUrl: cardUrl,
          title: `🎉 [GIAO THÀNH CÔNG #${order.code}]`,
          actions: [{ text: "👁️ Xem Thẻ Đơn", url: cardUrl }],
        })
      }
    } catch (err) {
      log.error("subcontract.branch_notify_delivered_failed", { orderId: order.id, error: err })
    }

    log.info("subcontract.delivery_completed", {
      orderId: order.id,
      orderCode: order.code,
      branchId,
      deliveredAt,
    })

    return jsonResponse({
      data: {
        orderCode: order.code,
        deliveryStatus: "DELIVERED",
        orderStatus: settledStatus,
        deliveredAt,
        photoUrl: publicPhotoUrl,
        note: note || null,
      },
    })
  },
})
