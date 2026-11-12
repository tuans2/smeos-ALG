import { resolveSession } from "@/modules/organization/use-cases/resolve-session"
import { sseNotificationHub, type SseNotificationEvent } from "@/modules/notification/adapters/notification-sse-adapter"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "custom", reason: "luồng SSE thông báo của chính mình (resolveSession)" },
  handler: async ({ request }) => {
    const { user } = await resolveSession(request)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Gửi event kết nối thành công ban đầu
        controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId: user.id })}\n\n`))

        // Lắng nghe thông báo mới cho user
        const unsubscribe = sseNotificationHub.subscribe(user.id, (evt: SseNotificationEvent) => {
          try {
            controller.enqueue(encoder.encode(`event: notification\ndata: ${JSON.stringify(evt)}\n\n`))
          } catch {
            // Controller có thể đã đóng
          }
        })

        // Heartbeat ping để giữ kết nối không bị timeout bởi proxy
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"))
          } catch {
            clearInterval(pingInterval)
          }
        }, 25000)

        request.signal.addEventListener("abort", () => {
          clearInterval(pingInterval)
          unsubscribe()
          try {
            controller.close()
          } catch {
            // Ignore
          }
        })
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    })
  },
})
