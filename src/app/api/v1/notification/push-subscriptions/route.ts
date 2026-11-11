import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { getPushStatus, subscribePush, unsubscribePush } from "@/modules/notification/use-cases/manage-push-subscriptions"
import { pushStatusQuery, pushSubscribeBody, pushUnsubscribeBody } from "@/app/api/v1/_contracts/requests-notification"

/** Nhận Web Push trên thiết bị của chính người gọi (checklist 4.30). */
const OWN = { kind: "tenant", capability: null, reason: "Thiết bị nhận tin của chính người đăng nhập" } as const

export const GET = defineRoute({
  auth: OWN,
  query: pushStatusQuery,
  handler: async ({ ctx, query }) => jsonResponse({ data: await getPushStatus(ctx, query.endpoint ?? null) }),
})

export const POST = defineRoute({
  auth: OWN,
  rateLimit: { scope: "notification-push-subscribe", limit: 30, windowMs: 10 * 60_000, per: "user" },
  body: pushSubscribeBody,
  handler: async ({ ctx, body, request }) => {
    await subscribePush(ctx, { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth }, request.headers.get("user-agent"))
    return jsonResponse({ data: { subscribed: true } })
  },
})

export const DELETE = defineRoute({
  auth: OWN,
  body: pushUnsubscribeBody,
  handler: async ({ ctx, body }) => jsonResponse({ data: { removed: await unsubscribePush(ctx, body.endpoint) } }),
})
