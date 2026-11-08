import { validationFailed } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import { handle, jsonResponse } from "@/core/http/response";
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session";
import { DispatchVideoRenderUseCase } from "@/modules/video-studio/use-cases/dispatch-video-render";
import { videoRenderBody } from "@/app/api/v1/_contracts/requests-ai-studio";

export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request);
  requireCapability(ctx, "I1");

  const { id } = await context.params;
  // Thân tuỳ chọn (24/09/2026): ảnh hiện có trên storyboard để lấp cảnh còn
  // trống ảnh của job — không có thì máy chủ tự tìm ảnh Khu vực D / Master.
  const raw = await request.text().catch(() => "");
  const parsed = videoRenderBody.safeParse(raw ? JSON.parse(raw) : {});
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues });
  const useCase = new DispatchVideoRenderUseCase();
  const result = await useCase.execute(ctx, id, {
    sceneImages: (parsed.data.scene_images ?? []).map((x) => ({ sceneIndex: x.scene_index, assetId: x.asset_id })),
    videoProvider: parsed.data.video_provider ?? null,
  });

  return jsonResponse(result);
});
