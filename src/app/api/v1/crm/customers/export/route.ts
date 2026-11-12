import { exportCustomers } from "@/modules/crm/use-cases/export-customers"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R13" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const formatParam = url.searchParams.get("format")
    const format = formatParam === "json" ? "json" : "xlsx"
    const tier = url.searchParams.get("tier") ?? undefined
    const search = url.searchParams.get("search") ?? undefined

    const result = await exportCustomers(ctx, { format, tier, search })
    await recordDataExport(ctx, "crm_customers", { format, tier, search })

    return new Response(result.data as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  },
})
