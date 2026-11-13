import { z } from "zod"

import { defineRoute } from "@/core/http/define-route"
import { pageQuery } from "@/core/http/pagination"
import { jsonResponse } from "@/core/http/response"
import { listPlatformAccessLogs } from "@/modules/audit/use-cases/list-platform-access-logs"

/** Nhân viên nền tảng đã truy cập dữ liệu của tổ chức (ADR-013 D-I5, D-60) — cùng quyền với nhật ký kiểm toán (G9). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G9" },
  query: z.object(pageQuery),
  handler: async ({ ctx, query }) => jsonResponse(await listPlatformAccessLogs(ctx, { limit: query.limit, cursor: query.cursor ?? null })),
})
