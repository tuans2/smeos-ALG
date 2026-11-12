/**
 * GET /api/v1/platform/orgs-data/[orgId]
 *
 * Platform Admin: Lấy toàn bộ dữ liệu theo mô hình Folder-in-Folder
 * của một tổ chức cụ thể. Yêu cầu PlatformContext N1.
 */

import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { getPlatformOrgFolderData } from "@/modules/platform/use-cases/get-platform-org-folder-data"
import { notFound } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { orgId } = params as { orgId: string }
    const result = await getPlatformOrgFolderData(pctx, orgId as string)
    if (!result) throw notFound()
    return jsonResponse({ data: result })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
