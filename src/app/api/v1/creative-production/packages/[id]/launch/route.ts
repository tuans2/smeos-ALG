import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { saveLaunchPlan } from "@/modules/creative-production/use-cases/manage-campaign-package"
import { launchPlanSchema } from "../../schemas"
import { defineRoute } from "@/core/http/define-route"

/**
 * `PUT /api/v1/creative-production/packages/:id/launch` (`J5`) — Chặng 10: lưu
 * kế hoạch đăng (kênh, giờ) và mã bài đã đăng bên Lịch đăng (SocialFlow M07)
 * để Chặng 12 đọc `content_metrics` thật. Việc đăng bài thực hiện ở Lịch đăng.
 */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = launchPlanSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse(
      await saveLaunchPlan(ctx, id, {
        channels: parsed.data.channels,
        scheduledAt: parsed.data.scheduled_at ?? null,
        postRefs: parsed.data.post_refs.map((r) => ({ platform: r.platform, contentId: r.content_id })),
      })
    )
  },
})
