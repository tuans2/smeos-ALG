import { z } from "zod"

import { pageQuery } from "@/core/http/pagination"
import { salesPitchRecord } from "@/modules/products/domain/sales-pitch-record"
import { POST_STATUSES, SOCIAL_CHANNELS } from "@/modules/social-publishing/domain/post-lifecycle"

/**
 * Lược đồ yêu cầu của `/api/v1/content-studio/*` và `/api/v1/social-publishing/*` (hành trình Tạo nội dung 4 bước, PO
 * 08/11/2026) — OpenAPI nội bộ, PO 07/11/2026. Lược đồ từng khai trong `defineRoute` của 4 route được chuyển NGUYÊN VĂN
 * về đây và route import lại (không đổi hành vi).
 */

// content-studio/products/route.ts
export const contentLibraryQuery = z.object({ ...pageQuery })

// content-studio/products/[id]/sales-pitch/route.ts
export const salesPitchBody = z.object({ pitch: salesPitchRecord })

// social-publishing/facebook-pages/route.ts
export const selectFacebookPageBody = z.object({ page_id: z.string().trim().min(1).max(64) })

// social-publishing/posts/route.ts
const channel = z.enum(SOCIAL_CHANNELS as unknown as [string, ...string[]])
export const socialPostsQuery = z.object({ ...pageQuery, status: z.enum(POST_STATUSES).optional(), content_generation_id: z.string().uuid().optional() })
export const schedulePostsBody = z.object({
  content_generation_id: z.string().uuid(),
  channels: z.array(channel).min(1).max(4),
  mode: z.enum(["NOW", "AUTO", "AT"]),
  scheduled_at: z.string().datetime().optional(),
})
