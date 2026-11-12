import { requireCapability } from "@/core/rbac/capabilities"
import { exportOrdersToExcel } from "@/modules/orders/use-cases/export-orders"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: R13" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const fromDate = url.searchParams.get("from_date") ?? undefined
    const toDate = url.searchParams.get("to_date") ?? undefined
    const source = url.searchParams.get("source") ?? undefined // BROCHURE | MANUAL | CHAT

    // PO 14/10/2026: xuất Excel chỉ Điều hành; người khác cần Điều hành cấp quyền R13
    requireCapability(ctx, "R13")

    const buffer = await exportOrdersToExcel(ctx, { fromDate, toDate, source })
    await recordDataExport(ctx, "orders", { from_date: fromDate, to_date: toDate, source })

    const now = new Date()
    const dateSuffix = now.toISOString().slice(0, 10).replace(/-/g, "")
    const prefix = source === "BROCHURE" ? "the-chao" : "don-hang"
    const filename = `${prefix}-${dateSuffix}.xlsx`

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  },
})
