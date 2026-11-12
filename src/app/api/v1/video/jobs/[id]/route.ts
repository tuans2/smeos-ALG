import { jsonResponse } from "@/core/http/response"
import { GetVideoJobUseCase, videoViewUrl } from "@/modules/video-studio/use-cases/get-video-job"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = (params as { id: string });
    const useCase = new GetVideoJobUseCase();
    const job = await useCase.execute(ctx, id);

    // `final_video_view_url`: URL ký có hạn để phát video trên giao diện.
    return jsonResponse({ ...job, final_video_view_url: await videoViewUrl(ctx, job.final_video_url) });
  },
});
