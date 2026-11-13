import { validationFailed } from "@/core/http/errors"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { NextResponse } from "next/server"
import {
  fetchThumbnail,
  isValidDriveId,
  resolveFirstFileId,
} from "@/modules/greeting-card/adapters/google-drive-thumbnail"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/public/drive-thumb-proxy?folder_id=... | ?file_id=...
 * Proxy thumbnail Google Drive công khai (trang khách xem catalog): `folder_id` → ảnh đầu
 * tiên trong thư mục; `file_id` → chính tệp đó (link `/file/d/<id>` trong Excel).
 * Public nên có rate limit, kiểm tra id, timeout và trần kích thước trong adapter.
 */
export const GET = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "drive-thumb-proxy", limit: 120, windowMs: 60_000, per: "ip" },
  handler: async ({ request }) => {
    const params = new URL(request.url).searchParams
    const folderId = params.get("folder_id")?.trim()
    const directFileId = params.get("file_id")?.trim()
    if (directFileId !== undefined ? !isValidDriveId(directFileId) : !isValidDriveId(folderId)) {
      throw validationFailed({ issues: [{ path: [directFileId !== undefined ? "file_id" : "folder_id"], message: "Drive id không hợp lệ" }] })
    }

    const fileId = directFileId ?? (await resolveFirstFileId(folderId as string))
    if (!fileId) return new NextResponse(null, { status: 404 })

    const thumb = await fetchThumbnail(fileId)
    if (!thumb) return new NextResponse(null, { status: 404 })

    return new NextResponse(thumb.body, {
      status: 200,
      headers: {
        "Content-Type": thumb.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "Content-Length": String(thumb.body.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    })
  },
})

export const dynamic = "force-dynamic"
