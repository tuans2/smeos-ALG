/**
 * POST /api/v1/platform/marketplace/import-excel/preview — đọc tiêu đề tệp khảo sát và tự ghép
 * cột theo tên (`N17`). Không ghi dữ liệu; người nhập duyệt bảng ghép rồi gọi `import-excel`.
 */
import { jsonResponse } from "@/core/http/response"
import { previewMarketplaceExcel } from "@/modules/platform/use-cases/manage-partner-marketplace"
import { readExcelUpload } from "../read-excel-upload"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const { file } = await readExcelUpload(request)
    return jsonResponse({ data: await previewMarketplaceExcel(pctx, file) })
  },
})

export const dynamic = "force-dynamic"
