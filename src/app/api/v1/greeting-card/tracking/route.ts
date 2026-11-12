import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { parseTrackingQuery } from "@/modules/greeting-card/contracts/tracking-query"
import { queryTracking } from "@/modules/greeting-card/use-cases/query-tracking"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/greeting-card/tracking?view=kanban|list|calendar|queue|dashboard&… — mọi view
 * "Theo dõi tiến độ" trên cùng một tập dữ liệu, cùng bộ lọc, cùng phạm vi xem (R1).
 * `list`/`queue` trả đúng dạng danh sách phân trang chung `{ data: [...], next_cursor, total }`
 * (bộ tải "Tải thêm" đọc thẳng `data` là mảng); view khác trả `{ data: <kết quả view> }`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request, ctx }) => {
    const result = await queryTracking(ctx, parseTrackingQuery(new URL(request.url)))
    if (result.view === "list" || result.view === "queue") {
      return jsonResponse({ view: result.view, data: result.data, next_cursor: result.next_cursor, total: result.total })
    }
    return jsonResponse({ data: result })
  },
})
