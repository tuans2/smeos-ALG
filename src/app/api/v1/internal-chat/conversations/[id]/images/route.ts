import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { defineRoute } from "@/core/http/define-route"
import { payloadTooLarge, validationFailed } from "@/core/http/errors"
import { created } from "@/core/http/contract-responses"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { getChatLinkPolicy } from "@/modules/internal-chat/infra/prisma-chat-link-policy"
import { OrganizationChatNotifier } from "@/modules/internal-chat/infra/chat-notifier"
import { MAX_CHAT_IMAGE_BYTES, MAX_CHAT_IMAGES_PER_MESSAGE } from "@/modules/internal-chat/domain/chat-image"
import { sendChatImages } from "@/modules/internal-chat/use-cases/send-chat-images"

/** Trần cả yêu cầu multipart — đọc khung trước khi đọc tệp, để không nạp hàng trăm MB vào bộ nhớ. */
const MAX_REQUEST_BYTES = MAX_CHAT_IMAGES_PER_MESSAGE * MAX_CHAT_IMAGE_BYTES + 64 * 1024

/**
 * POST /api/v1/internal-chat/conversations/:id/images (S1) — gửi 1–5 ảnh (trường `files`) kèm chú thích (`caption`)
 * trong một tin. Kiểm quyền gửi vào phòng, kiểm byte thật từng ảnh (JPG/PNG/WebP, ≤ 10 MB) rồi mới ghi kho.
 * Trả `{ data: tin vừa tạo }` (201) — `attachments` là khoá kho; trang đọc lại phòng để có URL ký.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  rateLimit: { scope: "internal-chat-images", limit: 20, windowMs: 60_000, per: "user" },
  handler: async ({ ctx, request, params }) => {
    const declared = Number(request.headers.get("content-length") ?? "0")
    if (declared > MAX_REQUEST_BYTES) throw payloadTooLarge(MAX_REQUEST_BYTES)
    const form = await request.formData().catch(() => null)
    if (!form) throw validationFailed({ body: "Dữ liệu gửi lên phải là multipart/form-data" })
    const entries = form.getAll("files").filter((f): f is File => f instanceof Blob)
    if (entries.length > MAX_CHAT_IMAGES_PER_MESSAGE) throw validationFailed({ files: `Mỗi tin gửi tối đa ${MAX_CHAT_IMAGES_PER_MESSAGE} ảnh` })
    if (entries.some((f) => f.size > MAX_CHAT_IMAGE_BYTES)) throw payloadTooLarge(MAX_CHAT_IMAGE_BYTES)
    const caption = form.get("caption")

    const message = await sendChatImages(
      { chatRepo: getInternalChatRepository(), linkPolicy: getChatLinkPolicy(), storage: getStorageProvider(), notifier: new OrganizationChatNotifier() },
      {
        conversationId: params.id ?? "",
        caller: { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId },
        userRole: "member",
        caption: typeof caption === "string" ? caption : "",
        files: await Promise.all(entries.map(async (f) => new Uint8Array(await f.arrayBuffer()))),
      }
    )
    return created(message)
  },
})
