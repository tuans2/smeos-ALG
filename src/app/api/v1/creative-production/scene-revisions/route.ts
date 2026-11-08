import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { reviseScene } from "@/modules/creative-production/use-cases/revise-assets"
import type { ScenePlanScene } from "@/modules/creative-production/domain/scene-plan-rules"
import { sceneRevisionBody } from "@/app/api/v1/_contracts/requests-creative"

/**
 * `POST /api/v1/creative-production/scene-revisions` (`I1`, 24/09/2026) — AI sửa
 * MỘT cảnh của kịch bản bối cảnh theo yêu cầu của chủ tiệm ở Chặng 07 (feature
 * `creative.scene_revise`, 1 credit, `Idempotency-Key` bắt buộc). Có
 * `scene_plan_id` thì đọc cảnh từ kho và ghi kịch bản đã sửa. Sinh lại ảnh là
 * một job biến thể riêng (`POST /media/variants`) — chạy qua cổng integrity.
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "I1")
  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) throw validationFailed({ "Idempotency-Key": "Bắt buộc (YC-U7)" })
  const parsed = sceneRevisionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const d = parsed.data
  const r = await reviseScene(ctx, {
    idempotencyKey,
    instruction: d.instruction,
    scenePlanId: d.scene_plan_id ?? null,
    sceneIndex: d.scene_index,
    scene: (d.scene as ScenePlanScene | null | undefined) ?? null,
    mode: d.mode,
    topicTitle: d.topic_title,
    productName: d.product_name,
    colors: d.colors,
  })
  return jsonResponse({
    job_id: r.jobId,
    scene: r.scene,
    /** Phiên bản kịch bản sau khi sửa (Đợt 5) — ảnh sinh lại mang số này. */
    scene_plan_revision: r.revision,
    usage: { cost_credit: r.usage.costCredit, balance_after: r.usage.balanceAfter },
  })
})
