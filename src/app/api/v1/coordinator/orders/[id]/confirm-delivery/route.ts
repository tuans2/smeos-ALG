/**
 * POST /api/v1/coordinator/orders/[id]/confirm-delivery
 *
 * Coordinator-Stream M4: Điều phối viên xác nhận giao hàng thành công thay cửa hàng.
 * Hỗ trợ 2 sub-mode:
 *   1. Upload ảnh POD (multipart/form-data với file)
 *   2. Xác nhận không ảnh (application/json với confirmWithoutPhoto=true + reason)
 *
 * Hành động này triệt tiêu (First-Wins Mutex) toàn bộ reminder M4 đang pending.
 */

import { prepareLateDeliveryDeduction } from "@/modules/greeting-card/use-cases/craft-fee-deductions"
import { statusAfterDelivery } from "@/modules/greeting-card/domain/order-settlement"
import { completeIfSettled } from "@/modules/greeting-card/infra/order-settlement"
import { canBypassDeliveryPhoto, parseBrochureWorkflowPolicy } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { randomUUID } from "crypto"
import { jsonResponse } from "@/core/http/response"
import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { log } from "@/core/observability/log"
import {
  cancelSubcontractReminderSteps,
  getMilestoneSteps,
} from "@/modules/greeting-card/use-cases/cancel-subcontract-reminder-steps"
import { queueOrderNotification } from "@/modules/greeting-card/use-cases/notify-customer"
import { confirmDeliveryBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

const MAX_POD_BYTES = 10 * 1024 * 1024

function sniffImage(bytes: Uint8Array): { ext: "jpg" | "png" | "webp"; mimeType: string } | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { ext: "jpg", mimeType: "image/jpeg" }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { ext: "png", mimeType: "image/png" }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
    return { ext: "webp", mimeType: "image/webp" }
  return null
}

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R5" },
  handler: async ({ request, ctx, params }) => {
    const { id: orderId } = params as { id: string }

    const repo = new SubcontractOrderRepository()
    const order = await repo.findSubcontractById(orderId, ctx.organizationId)
    if (!order) throw notFound()

    if (order.status === "COMPLETED" || order.delivery_status === "DELIVERED") {
      return jsonResponse({
        data: {
          success: true,
          alreadyCompleted: true,
          message: "Đơn hàng đã hoàn thành trước đó.",
          orderStatus: order.status,
          deliveryStatus: order.delivery_status,
        },
      })
    }

    const contentType = request.headers.get("content-type") ?? ""
    const deliveredAt = new Date().toISOString()

    let podPhotoStorageKey: string | null = null
    let publicPhotoUrl: string | null = null
    let confirmNote = ""
    let confirmMode: "with_photo" | "without_photo" = "with_photo"

    if (contentType.includes("multipart/form-data")) {
      // Mode 1: Upload ảnh POD
      const formData = await request.formData().catch(() => null)
      if (!formData) throw validationFailed({ body: "Dữ liệu phải là multipart/form-data" })

      const file = formData.get("file")
      if (!file || !(file instanceof Blob))
        throw validationFailed({ file: "Vui lòng chọn ảnh giao hàng (POD)" })

      confirmNote = typeof formData.get("note") === "string"
        ? (formData.get("note") as string).trim()
        : ""

      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      if (bytes.byteLength === 0) throw validationFailed({ file: "Tệp ảnh bị rỗng" })
      if (bytes.byteLength > MAX_POD_BYTES) throw validationFailed({ file: "Ảnh vượt quá 10MB" })

      const sniffed = sniffImage(bytes)
      if (!sniffed) throw validationFailed({ file: "Định dạng không hợp lệ (JPG/PNG/WebP)" })

      const storage = getStorageProvider()

      // AI kiểm định ảnh giao hàng POD đối chiếu với mẫu và thành phẩm QC
      const snapshot = (order.greeting_sessions?.[0]?.product_snapshot as Record<string, unknown> | null) ?? {}
      const productName = order.items[0]?.description || (snapshot.name as string) || "Sản phẩm gia công"
      let sampleImageUrl = (snapshot.image_url || snapshot.imageUrl) as string | undefined
      if (sampleImageUrl?.startsWith("org/")) {
        sampleImageUrl = await storage.signedUrl(sampleImageUrl, 3600, "GET").catch(() => sampleImageUrl)
      }

      const coordExistingMeta = await new SubcontractStepStore().readMetadata(order.organization_id, order.id)
      const existingQcPhotos = Array.isArray(coordExistingMeta.qc_photos) ? (coordExistingMeta.qc_photos as string[]) : []
      const latestQcKey = existingQcPhotos[existingQcPhotos.length - 1]
      let qcImageUrl: string | undefined
      if (latestQcKey) {
        if (latestQcKey.startsWith("http://") || latestQcKey.startsWith("https://") || latestQcKey.startsWith("data:")) {
          qcImageUrl = latestQcKey
        } else {
          qcImageUrl = await storage.signedUrl(latestQcKey, 3600, "GET").catch(() => undefined)
        }
      }

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

      // Điều phối là người duyệt: chỉ chặn khi AI kết luận SAI ảnh; AI không chạy được thì người tự quyết
      if (aiVerify.verdict === "MISMATCH") {
        throw unprocessable(
          `❌ AI phát hiện ảnh giao hàng không hợp lệ: ${aiVerify.reason} (${aiVerify.confidenceScore}%). Vui lòng kiểm tra lại ảnh chụp!`
        )
      }

      const assetId = randomUUID()
      podPhotoStorageKey = `org/${order.organization_id}/subcontract/${order.id}/coord-pod-${assetId}.${sniffed.ext}`
      await storage.put(podPhotoStorageKey, Buffer.from(bytes), sniffed.mimeType)
      publicPhotoUrl = await storage.signedUrl(podPhotoStorageKey, 604800, "GET")
      confirmMode = "with_photo"
    } else {
      // Mode 2: Xác nhận không ảnh — chỉ khi tiệm đã tắt yêu cầu ảnh giao (checklist ALG 4.18)
      const workflow = parseBrochureWorkflowPolicy((await new GreetingCardRepository().getShopProfile(order.organization_id)).settings)
      if (!canBypassDeliveryPhoto(workflow)) throw conflict("Tiệm bắt buộc ảnh giao hàng — tải ảnh để xác nhận")
      const body = await request.json().catch(() => ({}))
      const parsed = confirmDeliveryBody.safeParse(body)
      if (!parsed.success) {
        throw validationFailed(
          Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? "body", i.message]))
        )
      }
      const input = camelKeys(parsed.data)
      confirmNote = input.reason
      confirmMode = "without_photo"
    }

    // Cập nhật DB
    const store = new SubcontractStepStore()
    const actorId = `coordinator:${ctx.userId}`
    // Điều phối được xác nhận giao cả khi chưa nhập shipper (tiệm tự giao), nhưng hoa phải đã xong
    // và đơn chưa huỷ/hoàn tất — trước 22/10/2026 đơn đã huỷ vẫn bị đưa sang COMPLETED (rà soát cụm G)
    const applyLateFee = await prepareLateDeliveryDeduction(order.organization_id, order.id, new CraftFeeFactsRepository(), new Date(deliveredAt))
    // Giao xong còn nợ → "Đã giao — chờ thu đủ" (checklist ALG 4.26)
    const settledStatus = statusAfterDelivery({ totalVnd: Number(order.total_vnd), paidVnd: Number(order.paid_vnd) })
    const saved = await store.applyStep({
      organizationId: order.organization_id,
      orderId: order.id,
      order: { delivery_status: "DELIVERED", status: settledStatus },
      require: { productionStatus: ["READY"], deliveryStatus: ["PENDING", "DISPATCHED", "DELIVERING"] },
      metadata: (current) => {
        const podPhotos = Array.isArray(current.pod_photos) ? (current.pod_photos as string[]) : []
        const photoUrls = podPhotoStorageKey ? [...podPhotos, podPhotoStorageKey] : podPhotos
        const deliveryProof = {
          photoUrls,
          note: confirmNote || "Điều phối xác nhận giao hàng thành công",
          deliveredAt,
          confirmedByCoordinator: ctx.userId,
          confirmMode,
        }
        return applyLateFee({ ...current, ...(podPhotoStorageKey && { pod_photos: photoUrls }), delivery_proof: deliveryProof, last_pod_uploaded_at: deliveredAt })
      },
      events: [
        { axis: "delivery", fromValue: order.delivery_status || "DELIVERING", toValue: "DELIVERED", actorId, reason: `[Coordinator Confirm Delivery][${confirmMode}] ${confirmNote}` },
        { axis: "status", fromValue: order.status, toValue: settledStatus, actorId, reason: settledStatus === "COMPLETED" ? "[Hoàn Tất] Điều phối xác nhận giao hàng thành công." : "[Đã giao] Chờ thu đủ tiền trước khi hoàn tất." },
      ],
    })

    if (!saved) throw conflict("Đơn hàng chưa có ảnh thành phẩm được duyệt, hoặc đã huỷ/hoàn tất.")
    await completeIfSettled(order.organization_id, order.id)

    // ✅ First-Wins Mutex: Hủy toàn bộ M4 reminders đang pending
    const cancelResult = await cancelSubcontractReminderSteps({
      organizationId: order.organization_id,
      orderId: order.id,
      steps: getMilestoneSteps("M4"),
      reason: "coordinator_action",
      actorId: ctx.userId,
    })

    queueOrderNotification(order.organization_id, order.id, "DELIVERED")

    log.info("coordinator.confirm_delivery_subcontract", {
      orderId: order.id,
      orderCode: order.code,
      actorId: ctx.userId,
      confirmMode,
      cancelledSteps: cancelResult.cancelledSteps,
    })

    return jsonResponse({
      data: {
        success: true,
        message: `✅ Điều phối đã xác nhận giao hàng thành công (${confirmMode === "with_photo" ? "có ảnh POD" : "xác nhận không ảnh"}). Mọi nhắc nhở M4 đã bị hủy.`,
        orderStatus: settledStatus,
        deliveryStatus: "DELIVERED",
        deliveredAt,
        photoUrl: publicPhotoUrl,
        cancelledReminders: cancelResult.cancelledSteps,
      },
    })
  },
})

export const dynamic = "force-dynamic"
