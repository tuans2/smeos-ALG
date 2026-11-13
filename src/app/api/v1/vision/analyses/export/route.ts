import { exportAnalyses } from "@/modules/products/use-cases/export-analyses"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /vision/analyses/export` (`H3`) — tệp đối soát mở được bằng Excel.
 *
 * Gác bằng `H3` chứ không phải `H1`: bản xuất mang toàn bộ lượt phân tích
 * của tổ chức kèm ai duyệt lúc nào, tức là rộng hơn hẳn quyền xem một kết
 * quả mình vừa chạy.
 *
 * Tham số: `states` (nhiều giá trị, hoặc ngăn bằng dấu phẩy), `from`, `to`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const states = url.searchParams
      .getAll("states")
      .flatMap((v) => v.split(","))
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean)

    const { csv, soLuot, soDong, chamTran } = await exportAnalyses(ctx, {
      states,
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    })
    await recordDataExport(ctx, "vision_analyses", {
      states,
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    })

    const ngay = new Date().toISOString().slice(0, 10)
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="phan-tich-anh-${ngay}.csv"`,
        "x-so-luot": String(soLuot),
        "x-so-dong": String(soDong),
        "x-cham-tran": String(chamTran),
      },
    })
  },
})
