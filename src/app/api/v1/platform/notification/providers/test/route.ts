import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { testChannelProvider } from "@/modules/notification/use-cases/manage-channel-providers"
import { channelProviderTestBody } from "@/app/api/v1/platform/_contracts/requests"

/**
 * Gửi một tin thử qua nhà cung cấp đã đăng ký — kiểm khoá trước khi bật kênh cho cả hệ thống (checklist 4.30).
 * Mỗi tin thử tốn phí nhà cung cấp → trần 10 tin / 10 phút / người vận hành.
 */
export const POST = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  rateLimit: { scope: "platform-notification-provider-test", limit: 10, windowMs: 10 * 60_000, per: "user" },
  body: channelProviderTestBody,
  handler: async ({ pctx, body }) => jsonResponse({ data: await testChannelProvider(pctx, body) }),
})
