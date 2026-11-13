import { randomUUID } from "crypto"
import { conflict, validationFailed, unprocessable } from "@/core/http/errors"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { loadPublicSession } from "./brochure-session-access"
import { queueStaffNotification } from "./notify-staff"

const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024 // 5 MB

export function sniffImage(bytes: Uint8Array): { ext: "jpg" | "png" | "webp"; mimeType: string } | null {
  if (bytes.length < 12) return null
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mimeType: "image/jpeg" }
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
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
  // WebP: RIFF .... WEBP
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

export interface UploadPaymentProofInput {
  sendCode: string
  file: File | Blob
  purpose: "DEPOSIT" | "BALANCE"
}

export async function uploadPaymentProof(
  input: UploadPaymentProofInput,
  repo = getGreetingCardRepository()
) {
  const session = await loadPublicSession(input.sendCode, repo)
  if (!session.order_id) {
    throw unprocessable("Bạn cần hoàn tất đặt hoa trước khi tải ảnh chuyển khoản")
  }
  const order = session.order
  const paid = Number(order?.paid_vnd ?? 0)
  const total = Number(order?.total_vnd ?? 0)
  if (order?.status === "CANCELLED") throw conflict("Đơn hàng đã huỷ, không cần gửi ảnh chuyển khoản")
  if (total > 0 && paid >= total) throw conflict("Đơn hàng đã thanh toán đủ, không cần gửi thêm ảnh chuyển khoản")
  // Đã nhận tiền Lần 1 thì ảnh mới chỉ có thể là Lần 2 — không ghi đè chứng từ Lần 1 đã đối soát
  const purpose = paid > 0 ? "BALANCE" : input.purpose

  const arrayBuffer = await input.file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  if (bytes.byteLength === 0) {
    throw validationFailed({ file: "Tệp tải lên không được rỗng" })
  }
  if (bytes.byteLength > MAX_PAYMENT_PROOF_BYTES) {
    throw validationFailed({ file: "Ảnh chuyển khoản tối đa 5MB" })
  }

  const sniffed = sniffImage(bytes)
  if (!sniffed) {
    throw validationFailed({ file: "Định dạng ảnh không hợp lệ — chỉ nhận JPG, PNG hoặc WebP" })
  }

  const assetId = randomUUID()
  const storageKey = `org/${session.organization_id}/payment-proof/${assetId}.${sniffed.ext}`

  const storage = getStorageProvider()
  await storage.put(storageKey, Buffer.from(bytes), sniffed.mimeType)

  await repo.createPaymentProofAsset({
    id: assetId,
    organizationId: session.organization_id,
    storageKey,
    mimeType: sniffed.mimeType,
    fileSize: bytes.byteLength,
    createdBy: session.sale_id || "customer",
    metadata: {
      source: "BROCHURE_PAYMENT_PROOF",
      sendCode: input.sendCode,
      purpose,
    },
  })

  if (purpose === "BALANCE") {
    await repo.updateSession(session.id, { paymentProofBalanceAssetId: assetId })
  } else {
    await repo.updateSession(session.id, { paymentProofAssetId: assetId })
  }

  const staffEvent = purpose === "BALANCE" ? "SECOND_PAYMENT_REPORTED" : "PAYMENT_REPORTED"
  queueStaffNotification(session.organization_id, staffEvent, {
    orderId: order?.id ?? null,
    orderCode: order?.code ?? null,
    sessionId: session.id,
    customerName: session.customer_name ?? "Khách hàng",
    customerPhone: session.customer_phone ?? null,
    amountVnd: total,
    assignedSaleId: session.sale_id ?? null,
  })

  // Chạy ngầm AI Vision bóc tách và đối soát bill (fire-and-forget, không chờ kết quả để không làm nghẽn khách)
  import("./process-payment-proof-job")
    .then(({ processPaymentProofVisionJob }) => {
      void processPaymentProofVisionJob({
        assetId,
        organizationId: session.organization_id,
        sendCode: input.sendCode,
        purpose,
      })
    })
    .catch(() => undefined)

  const url = await storage.signedUrl(storageKey, 3600)

  return {
    assetId,
    url,
  }
}
