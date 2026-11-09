import { z } from "zod"

import { page } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { decodeCursor, encodeCursor, pageQuery } from "@/core/http/pagination"
import { listContentLibrary } from "@/modules/content-studio/use-cases/content-product"

/** GET /api/v1/content-studio/products (L1) — Kho sản phẩm cho hành trình Tạo nội dung, kèm cờ đã có gì. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  query: z.object({ ...pageQuery }),
  handler: async ({ ctx, query }) => {
    const cursorId = query.cursor ? String(decodeCursor(query.cursor).id ?? "") : undefined
    const result = await listContentLibrary(ctx, { limit: query.limit, cursor: cursorId || undefined })
    return page({ data: result.data, next_cursor: result.next_cursor ? encodeCursor({ id: result.next_cursor }) : null })
  },
})
