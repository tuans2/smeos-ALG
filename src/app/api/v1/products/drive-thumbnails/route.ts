import { validationFailed } from "@/core/http/errors"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { jsonResponse } from "@/core/http/response"
import {
  resolveFirstFileIds,
  thumbnailUrl,
} from "@/modules/greeting-card/adapters/google-drive-thumbnail"
import { driveThumbnailsBody } from "@/app/api/v1/_contracts/requests-products"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/products/drive-thumbnails (Quyền: L2)
 * Màn nhập hàng loạt: phân giải tối đa 50 folder Drive/lần thành URL thumbnail.
 * Thay cho việc gọi route public từng folder một (trần 120 lượt/phút/IP → file >120 dòng mất ảnh).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L2" },
  handler: async ({ request, ctx }) => {
    await enforceRateLimit(request, { scope: "products-drive-thumbnails", limit: 60, windowMs: 60_000, subject: ctx.userId })

    const parsed = driveThumbnailsBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const resolved = await resolveFirstFileIds([...new Set(parsed.data.folder_ids)])
    const thumbnails: Record<string, string | null> = {}
    for (const [folderId, fileId] of resolved) thumbnails[folderId] = fileId ? thumbnailUrl(fileId) : null
    return jsonResponse({ thumbnails })
  },
})

export const dynamic = "force-dynamic"
