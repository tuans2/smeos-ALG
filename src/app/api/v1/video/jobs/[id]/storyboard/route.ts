import { validationFailed } from "@/core/http/errors";
import { requireCapability } from "@/core/rbac/capabilities";
import { handle, jsonResponse } from "@/core/http/response";
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session";
import { UpdateStoryboardUseCase } from "@/modules/video-studio/use-cases/update-storyboard";
import { VideoSceneItem } from "@/modules/video-studio/domain/video-types";
import { storyboardBody } from "@/app/api/v1/_contracts/requests-ai-studio";

export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request);
  requireCapability(ctx, "I1");

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = storyboardBody.safeParse(body);
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues });
  }

  const useCase = new UpdateStoryboardUseCase();
  const updated = await useCase.execute(ctx, {
    jobId: id,
    scenes: parsed.data.scenes as VideoSceneItem[],
  });

  return jsonResponse(updated);
});
