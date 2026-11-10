import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { printExportBody } from "@/app/api/v1/_contracts/requests-misc"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { exportPrintPdfUseCase } from "@/modules/print/use-cases/export-print-pdf.use-case"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"

export const POST = handle(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M5")

  const { id } = await (context as { params: Promise<{ id: string }> }).params

  const raw = await request.json().catch(() => ({}))
  const parsed = printExportBody.safeParse(raw)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      details[issue.path.join(".")] = issue.message
    }
    throw validationFailed(details)
  }

  const result = await exportPrintPdfUseCase(ctx, id, {
    title: parsed.data.title ?? undefined,
    subtitle: parsed.data.subtitle ?? undefined,
    storeName: parsed.data.storeName ?? undefined,
    includeBleedMarks: parsed.data.includeBleedMarks,
    imageDataUrl: parsed.data.imageDataUrl ?? undefined,
  })

  await recordDataExport(ctx, "print_renditions", { rendition_id: id })

  return jsonResponse({ data: result })
})
