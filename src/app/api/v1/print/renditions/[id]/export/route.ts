import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { printExportBody } from "@/app/api/v1/_contracts/requests-misc"
import { exportPrintPdfUseCase } from "@/modules/print/use-cases/export-print-pdf.use-case"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "M5" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

    const raw = await request.json().catch(() => ({}))
    const parsed = printExportBody.safeParse(raw)
    if (!parsed.success) {
      const details: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        details[issue.path.join(".")] = issue.message
      }
      throw validationFailed(details)
    }
    const input = camelKeys(parsed.data)

    const result = await exportPrintPdfUseCase(ctx, id, {
      title: input.title ?? undefined,
      subtitle: input.subtitle ?? undefined,
      storeName: input.storeName ?? undefined,
      includeBleedMarks: input.includeBleedMarks,
      imageDataUrl: input.imageDataUrl ?? undefined,
    })

    await recordDataExport(ctx, "print_renditions", { rendition_id: id })

    return jsonResponse({ data: result })
  },
})
