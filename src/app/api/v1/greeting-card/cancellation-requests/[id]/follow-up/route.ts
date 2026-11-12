import { notFound, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { CancellationFollowUpRepository } from "@/modules/greeting-card/infra/cancellation-follow-up-repository"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { cancellationFollowUpBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /api/v1/greeting-card/cancellation-requests/:id/follow-up`
 * Điều hành xác nhận đã xử lý xong đơn hệ thống tự huỷ (đã chuyển hoàn tiền / đã liên hệ khách).
 * Huỷ → R6; còn tiền phải hoàn → thêm R10 (trần cứng điều hành, như khi tự duyệt đề xuất).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderCancel },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = cancellationFollowUpBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const repo = new CancellationFollowUpRepository()
    const pending = (await repo.listPending(ctx)).find((r) => r.id === id)
    if (!pending) throw notFound()
    if ((pending.payload.followUp?.refundDueVnd ?? 0) > 0) requireCapability(ctx, GREETING_CARD_CAPABILITY.paymentRefund)

    return jsonResponse({ data: await repo.complete(ctx, id, parsed.data.note) })
  },
})

export const dynamic = "force-dynamic"
