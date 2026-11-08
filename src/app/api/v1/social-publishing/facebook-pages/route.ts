import { z } from "zod"

import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { listPendingPages, selectFacebookPage } from "@/modules/social-publishing/use-cases/connect-channel"

/** GET /api/v1/social-publishing/facebook-pages (W2) — các Trang Facebook chờ chọn sau khi đồng ý (không trả khoá). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "W2" },
  handler: async ({ ctx }) => ok(await listPendingPages(ctx)),
})

/** POST /api/v1/social-publishing/facebook-pages (W2) — chọn Trang để đăng (kèm Instagram gắn với Trang, nếu có). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "W2" },
  body: z.object({ page_id: z.string().trim().min(1).max(64) }),
  handler: async ({ ctx, body }) => ok(await selectFacebookPage(ctx, body.page_id)),
})
