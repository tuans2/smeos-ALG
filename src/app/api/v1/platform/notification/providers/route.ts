import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { listChannelProviders, saveChannelProvider } from "@/modules/notification/use-cases/manage-channel-providers"
import { channelProviderSaveBody } from "@/app/api/v1/platform/_contracts/requests"

/** Sổ nhà cung cấp kênh liên lạc (checklist 4.30) — đọc và ghi đều cần `N2` vì chạm khoá nhà cung cấp. */
export const GET = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  handler: async ({ pctx }) => jsonResponse({ data: await listChannelProviders(pctx) }),
})

export const PUT = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  body: channelProviderSaveBody,
  handler: async ({ pctx, body }) => jsonResponse({ data: await saveChannelProvider(pctx, body) }),
})
