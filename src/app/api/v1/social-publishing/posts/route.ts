import { z } from "zod"

import { created, page } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { decodeCursor, encodeCursor, pageQuery } from "@/core/http/pagination"
import { POST_STATUSES, SOCIAL_CHANNELS } from "@/modules/social-publishing/domain/post-lifecycle"
import { listPosts } from "@/modules/social-publishing/use-cases/manage-posts"
import { schedulePosts } from "@/modules/social-publishing/use-cases/schedule-posts"

const channel = z.enum(SOCIAL_CHANNELS as unknown as [string, ...string[]])

/** GET /api/v1/social-publishing/posts (J5) — bài đăng tự động của tổ chức, mới trước. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  query: z.object({ ...pageQuery, status: z.enum(POST_STATUSES).optional(), content_generation_id: z.string().uuid().optional() }),
  handler: async ({ ctx, query }) => {
    const cursorId = query.cursor ? String(decodeCursor(query.cursor).id ?? "") : undefined
    const r = await listPosts(ctx, { limit: query.limit, cursor: cursorId || undefined, status: query.status, contentGenerationId: query.content_generation_id })
    return page({ data: r.data, next_cursor: r.next_cursor ? encodeCursor({ id: r.next_cursor }) : null })
  },
})

/**
 * POST /api/v1/social-publishing/posts (J5) — lên lịch đăng các bài đã duyệt ở Bước 3. `mode`: NOW (đăng ngay ở lượt kế
 * tiếp) · AUTO (khung giờ vàng gần nhất) · AT (kèm `scheduled_at`). `Idempotency-Key` bắt buộc — gửi lại không đăng trùng.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  idempotency: "required",
  rateLimit: { scope: "social-posts-schedule", limit: 30, windowMs: 60_000, per: "user" },
  body: z.object({
    content_generation_id: z.string().uuid(),
    channels: z.array(channel).min(1).max(4),
    mode: z.enum(["NOW", "AUTO", "AT"]),
    scheduled_at: z.string().datetime().optional(),
  }),
  handler: async ({ ctx, body, idempotencyKey }) => {
    const mode = body.mode === "AT"
      ? { kind: "AT" as const, at: new Date(body.scheduled_at ?? "") }
      : { kind: body.mode }
    const posts = await schedulePosts(ctx, {
      generationId: body.content_generation_id,
      channels: body.channels as Parameters<typeof schedulePosts>[1]["channels"],
      mode,
      idempotencyKey: idempotencyKey ?? "",
    })
    return created(posts)
  },
})
