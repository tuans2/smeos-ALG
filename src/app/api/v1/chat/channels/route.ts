import { jsonResponse } from "@/core/http/response"
import { configureChatChannelBody } from "@/app/api/v1/_contracts/requests-chat"
import { validationFailed } from "@/core/http/errors"
import { listChatChannels } from "@/modules/chat-assistant/use-cases/list-chat-channels"
import { configureChatChannel } from "@/modules/chat-assistant/use-cases/configure-chat-channel"
import { maskChannelSecrets } from "@/modules/chat-assistant/domain/channel-secret-fields"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { buildEmbedSnippet } from "@/modules/chat-assistant/domain/embed-snippet"
import { publicAppUrl } from "@/lib/public-url"
import { PUBLIC_CHAT_SURFACES } from "@/modules/chat-assistant/domain/public-chat-policy"
import type { SupportedChatChannel } from "@/modules/chat-assistant/domain/channel-integration-types"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  // Xem cấu hình kênh trong màn Tích hợp — cùng mã xem danh mục tích hợp (PO 12/11/2026); khoá đã che
  auth: { kind: "tenant", capability: "W1" },
  handler: async ({ ctx }) => {
    const [channels, org] = await Promise.all([
      listChatChannels(ctx),
      new OrganizationRepository().current(ctx),
    ])
    // Mã nhúng dựng từ slug thật của tiệm phiên — null khi tiệm chưa có slug.
    const embedSnippet = buildEmbedSnippet({ shopSlug: org?.slug, appUrl: publicAppUrl() })
    return jsonResponse({ channels, embedSnippet })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: configureChatChannel" },
  handler: async ({ request: req, ctx }) => {
    const body = await req.json().catch(() => null)
    const parsed = configureChatChannelBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const result = await configureChatChannel(ctx, {
      channel: parsed.data.channel as SupportedChatChannel,
      isEnabled: parsed.data.is_enabled,
      config: parsed.data.config,
    })

    return jsonResponse(
      { channel: { ...result, config: maskChannelSecrets(result.config) } },
      { status: 200 }
    )
  },
})
