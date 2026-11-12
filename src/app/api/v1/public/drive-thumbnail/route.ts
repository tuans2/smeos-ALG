import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { enforceRateLimit } from "@/core/http/rate-limit"
import {
  isValidDriveId,
  resolveFirstFileId,
  thumbnailUrl,
} from "@/modules/greeting-card/adapters/google-drive-thumbnail"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/public/drive-thumbnail?folder_id=...
 * Phân giải folder Google Drive công khai thành URL thumbnail của file đầu tiên.
 */
export const GET = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "drive-thumbnail", limit: 120, windowMs: 60_000, per: "ip" },
  handler: async ({ request }) => {
    const folderId = new URL(request.url).searchParams.get("folder_id")?.trim()
    if (!isValidDriveId(folderId)) {
      throw validationFailed({ issues: [{ path: ["folder_id"], message: "folder_id không hợp lệ" }] })
    }

    const fileId = await resolveFirstFileId(folderId)
    return jsonResponse({
      folder_id: folderId,
      file_id: fileId,
      thumbnail_url: fileId ? thumbnailUrl(fileId) : null,
    })
  },
})

export const dynamic = "force-dynamic"
