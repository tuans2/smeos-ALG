import { handle, jsonResponse } from "@/core/http/response"
import { configureChatChannelBody } from "@/app/api/v1/_contracts/requests-chat"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { listChatChannels } from "@/modules/chat-assistant/use-cases/list-chat-channels"
import { configureChatChannel } from "@/modules/chat-assistant/use-cases/configure-chat-channel"
import { maskChannelSecrets } from "@/modules/chat-assistant/domain/channel-secret-fields"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { buildEmbedSnippet } from "@/modules/chat-assistant/domain/embed-snippet"
import { publicAppUrl } from "@/lib/public-url"
import { PUBLIC_CHAT_SURFACES } from "@/modules/chat-assistant/domain/public-chat-policy"
import type { SupportedChatChannel } from "@/modules/chat-assistant/domain/channel-integration-types"

export const GET = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  const [channels, org] = await Promise.all([
    listChatChannels(ctx),
    new OrganizationRepository().current(ctx),
  ])
  // Mã nhúng dựng từ slug thật của tiệm phiên — null khi tiệm chưa có slug.
  const embedSnippet = buildEmbedSnippet({ shopSlug: org?.slug, appUrl: publicAppUrl() })
  return jsonResponse({ channels, embedSnippet })
})

export const POST = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  const body = await req.json().catch(() => null)
  const parsed = configureChatChannelBody.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const result = await configureChatChannel(ctx, {
    channel: parsed.data.channel as SupportedChatChannel,
    isEnabled: parsed.data.isEnabled,
    config: parsed.data.config,
  })

  return jsonResponse(
    { channel: { ...result, config: maskChannelSecrets(result.config) } },
    { status: 200 }
  )
})
