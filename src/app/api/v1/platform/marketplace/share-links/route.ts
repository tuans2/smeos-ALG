/** GET · POST /api/v1/platform/marketplace/share-links — liệt kê / tạo link chia sẻ chợ đối tác (`N17`). */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createShareLink, listShareLinks } from "@/modules/platform/use-cases/share-partner-marketplace"
import { shareLinkBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: { links: await listShareLinks(pctx) } })
  },
})

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const parsed = shareLinkBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await createShareLink(pctx, parsed.data) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
