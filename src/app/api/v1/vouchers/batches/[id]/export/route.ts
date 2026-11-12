import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { exportVoucherBatchCsv } from "@/modules/promotions/use-cases/export-voucher-batch"
import { defineRoute } from "@/core/http/define-route"

/** `GET /vouchers/batches/:id/export` (`Q8`) — tải danh sách mã (CSV) để in thiệp / gửi khách. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q8" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const file = await exportVoucherBatchCsv(ctx, id)
    await recordDataExport(ctx, "voucher_codes", { batch: id })
    return new Response(file.body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  },
})
