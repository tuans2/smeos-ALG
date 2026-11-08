/**
 * POST /api/v1/platform/marketplace/import-excel — nhập tệp khảo sát .xlsx/.xls/.csv (`N17`, tối đa 10 MB).
 * Trường `mapping` (JSON, tuỳ chọn): bảng ghép cột đã duyệt ở bước xem trước; thiếu → tự ghép theo tên tiêu đề.
 */
import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { importMarketplaceExcel } from "@/modules/platform/use-cases/manage-partner-marketplace"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { readExcelUpload } from "./read-excel-upload"
import { marketplaceMappingSchema } from "@/app/api/v1/platform/_contracts/requests"

export const POST = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  const { form, file } = await readExcelUpload(request)
  const rawMapping = form.get("mapping")
  let mapping: z.infer<typeof marketplaceMappingSchema> | undefined
  if (typeof rawMapping === "string" && rawMapping.trim()) {
    let json: unknown
    try {
      json = JSON.parse(rawMapping)
    } catch {
      json = null
    }
    const parsed = marketplaceMappingSchema.safeParse(json)
    if (!parsed.success) throw validationFailed({ mapping: "Bảng ghép cột không hợp lệ" })
    mapping = parsed.data
  }
  return jsonResponse({ data: await importMarketplaceExcel(pctx, file, undefined, mapping) })
})

export const dynamic = "force-dynamic"
