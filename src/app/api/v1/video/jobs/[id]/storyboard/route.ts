import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { UpdateStoryboardUseCase } from "@/modules/video-studio/use-cases/update-storyboard"
import { VideoSceneItem } from "@/modules/video-studio/domain/video-types"
import { storyboardBody } from "@/app/api/v1/_contracts/requests-ai-studio"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = (params as { id: string });
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
  },
});
