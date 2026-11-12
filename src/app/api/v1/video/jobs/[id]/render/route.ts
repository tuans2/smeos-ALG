import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { DispatchVideoRenderUseCase } from "@/modules/video-studio/use-cases/dispatch-video-render"
import { videoRenderBody } from "@/app/api/v1/_contracts/requests-ai-studio"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = (params as { id: string });
    // Thân tuỳ chọn (24/09/2026): ảnh hiện có trên storyboard để lấp cảnh còn
    // trống ảnh của job — không có thì máy chủ tự tìm ảnh Khu vực D / Master.
    const raw = await request.text().catch(() => "");
    const parsed = videoRenderBody.safeParse(raw ? parseJsonBody(raw) : {});
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues });
    const useCase = new DispatchVideoRenderUseCase();
    const result = await useCase.execute(ctx, id, {
      sceneImages: (parsed.data.scene_images ?? []).map((x) => ({ sceneIndex: x.scene_index, assetId: x.asset_id })),
      videoProvider: parsed.data.video_provider ?? null,
    });

    return jsonResponse(result);
  },
});

/** Thân không phải JSON → 400 như mọi route qua `handle()` (trước đây `JSON.parse` trần ném ra 500). */
function parseJsonBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw validationFailed({ body: "Thân yêu cầu không phải JSON hợp lệ" });
  }
}
