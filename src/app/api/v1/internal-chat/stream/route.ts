import { defineRoute } from "@/core/http/define-route"
import { eventVisibleTo, type ChatRoomEvent } from "@/modules/internal-chat/domain/chat-room-event"
import { getChatEventHub } from "@/modules/internal-chat/infra/chat-event-hub"

const PING_MS = 25_000
/** Đóng luồng sau 30 phút — trình duyệt tự nối lại; không giữ kết nối mãi. */
const MAX_STREAM_MS = 30 * 60_000

/**
 * GET /api/v1/internal-chat/stream (S1) — SSE báo phòng nào vừa có tin (IC-7.1). Sự kiện chỉ có mã phòng, không có
 * nội dung; trình duyệt đọc lại phòng qua API đã kiểm quyền. Lọc theo tổ chức + chi nhánh của phiên.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  handler: async ({ ctx, request }) => {
    const encoder = new TextEncoder()
    const viewer = { organizationId: ctx.organizationId, branchId: ctx.branchId }
    let cleanup = () => undefined as void

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (chunk: string) => {
          try {
            controller.enqueue(encoder.encode(chunk))
          } catch {
            cleanup()
          }
        }
        send("event: connected\ndata: {}\n\n")
        const unsubscribe = getChatEventHub().subscribe(ctx.organizationId, (event: ChatRoomEvent) => {
          if (eventVisibleTo(event, viewer)) send(`event: room\ndata: ${JSON.stringify({ conversationId: event.conversationId })}\n\n`)
        })
        const ping = setInterval(() => send(": ping\n\n"), PING_MS)
        const stop = setTimeout(() => cleanup(), MAX_STREAM_MS)
        cleanup = () => {
          clearInterval(ping)
          clearTimeout(stop)
          unsubscribe()
          try {
            controller.close()
          } catch {
            // đã đóng
          }
        }
        request.signal.addEventListener("abort", () => cleanup())
      },
      cancel() {
        cleanup()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
    })
  },
})

export const dynamic = "force-dynamic"
