/**
 * POST /api/v1/coordinator/orders/[id]/upload-qc-subcontract
 *
 * Coordinator-Stream M2: Điều phối viên tự upload ảnh thành phẩm thay cho cửa hàng.
 * Hành động này triệt tiêu (First-Wins Mutex) toàn bộ reminder M2 đang pending.
 *
 * Yêu cầu: Session đăng nhập có mã năng lực R3
 * hoặc "can_upload_qc_photo" (fallback: bất kỳ member có vai coordinator).
 */

import { randomUUID } from "crypto"
import { z } from "zod"
import { jsonResponse } from "@/core/http/response"
import { conflict, notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { SUBCONTRACT_STEP_NOT_ALLOWED, SUBCONTRACT_STEP_PRECONDITION, subcontractStepAllowed } from "@/modules/greeting-card/domain/subcontract-order"
import { ownStorageKey } from "@/modules/greeting-card/use-cases/sign-subcontract-photo"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { log } from "@/core/observability/log"
import {
  cancelSubcontractReminderSteps,
  getMilestoneSteps,
} from "@/modules/greeting-card/use-cases/cancel-subcontract-reminder-steps"
import { verifyQcPhotoWithAi } from "@/modules/greeting-card/use-cases/verify-qc-photo-ai"
import { queueOrderNotification } from "@/modules/greeting-card/use-cases/notify-customer"
import { defineRoute } from "@/core/http/define-route"

const MAX_QC_PHOTO_BYTES = 10 * 1024 * 1024

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
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id: orderId } = params as { id: string }

    const repo = new SubcontractOrderRepository()
    const order = await repo.findSubcontractById(orderId, ctx.organizationId)
    if (!order) throw notFound()

    const formData = await request.formData().catch(() => null)
    if (!formData) throw validationFailed({ body: "Dữ liệu phải là multipart/form-data" })

    const file = formData.get("file")
    if (!file || !(file instanceof Blob))
      throw validationFailed({ file: "Vui lòng chọn ảnh thành phẩm từ máy của bạn" })

    const note = typeof formData.get("note") === "string"
      ? (formData.get("note") as string).trim()
      : ""

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    if (bytes.byteLength === 0) throw validationFailed({ file: "Tệp ảnh bị rỗng" })
    if (bytes.byteLength > MAX_QC_PHOTO_BYTES)
      throw validationFailed({ file: "Ảnh vượt quá 10MB" })

    const sniffed = sniffImage(bytes)
    if (!sniffed) throw validationFailed({ file: "Định dạng không hợp lệ (JPG/PNG/WebP)" })
    if (!subcontractStepAllowed("QC", order)) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED.QC)

    // AI Verify — coordinator upload cũng phải pass AI để đảm bảo chất lượng
    const snapshot = (order.greeting_sessions?.[0]?.product_snapshot as Record<string, unknown> | null) ?? {}
    const productName = order.items[0]?.description || (snapshot.name as string) || "Sản phẩm gia công"
    let sampleImageUrl = (snapshot.image_url || snapshot.imageUrl) as string | undefined

    const storage = getStorageProvider()
    if (sampleImageUrl?.startsWith("org/")) {
      // Chỉ ký ảnh trong thư mục của chính tổ chức (rà soát cụm G)
      const ownKey = ownStorageKey(sampleImageUrl, order.organization_id)
      sampleImageUrl = ownKey ? await storage.signedUrl(ownKey, 3600, "GET").catch(() => undefined) : undefined
    }

    const aiVerify = await verifyQcPhotoWithAi({
      organizationId: order.organization_id,
      orderId: order.id,
      productName,
      sampleImageUrl,
      qcPhotoBytes: bytes,
      qcPhotoMimeType: sniffed.mimeType,
    })

    // Điều phối là người duyệt: chỉ chặn khi AI kết luận SAI ảnh; AI không chạy được thì người tự quyết
    if (aiVerify.verdict === "MISMATCH") {
      throw unprocessable(
        `❌ AI xác nhận ảnh không khớp sản phẩm: ${aiVerify.reason} (${aiVerify.confidenceScore}%). Vui lòng kiểm tra lại.`
      )
    }

    // Lưu ảnh vào storage
    const assetId = randomUUID()
    const storageKey = `org/${order.organization_id}/subcontract/${order.id}/coord-qc-${assetId}.${sniffed.ext}`
    await storage.put(storageKey, Buffer.from(bytes), sniffed.mimeType)
    const publicPhotoUrl = await storage.signedUrl(storageKey, 3600, "GET")

    // Cập nhật DB — giống store upload nhưng actor là coordinator
    const store = new SubcontractStepStore()
    const saved = await store.applyStep({
      organizationId: order.organization_id,
      orderId: order.id,
      order: { production_status: "READY" },
      require: SUBCONTRACT_STEP_PRECONDITION.QC,
      recordProductPhoto: { createdBy: ctx.userId },
      metadata: (current) => ({
        ...current,
        qc_photos: [...(Array.isArray(current.qc_photos) ? (current.qc_photos as string[]) : []), storageKey],
        last_qc_uploaded_at: new Date().toISOString(),
        last_qc_uploaded_by: `coordinator:${ctx.userId}`,
        last_qc_note: note || null,
        auto_bypassed_coordinator: false, // coordinator thực hiện trực tiếp
      }),
      events: [{
        axis: "production",
        fromValue: order.production_status,
        toValue: "READY",
        actorId: `coordinator:${ctx.userId}`,
        reason: `[Coordinator Upload QC] ${aiVerify.reason} (${aiVerify.confidenceScore}%). Ghi chú: ${note || "Không có"}`,
      }],
    })

    if (!saved) throw conflict(SUBCONTRACT_STEP_NOT_ALLOWED.QC)

    // ✅ First-Wins Mutex: Hủy toàn bộ M2 reminders đang pending
    await cancelSubcontractReminderSteps({
      organizationId: order.organization_id,
      orderId: order.id,
      steps: getMilestoneSteps("M2"),
      reason: "coordinator_action",
      actorId: ctx.userId,
    })

    // Notify khách hàng
    queueOrderNotification(order.organization_id, order.id, "READY")

    log.info("coordinator.upload_qc_subcontract", {
      orderId: order.id,
      orderCode: order.code,
      actorId: ctx.userId,
      storageKey,
    })

    return jsonResponse({
      data: {
        success: true,
        message: `✅ Điều phối đã upload ảnh thành phẩm thành công. AI xác nhận (${aiVerify.confidenceScore}%). Mọi nhắc nhở M2 đã bị hủy.`,
        photoUrl: publicPhotoUrl,
        productionStatus: "READY",
        cancelledReminders: getMilestoneSteps("M2"),
      },
    })
  },
})

export const dynamic = "force-dynamic"
