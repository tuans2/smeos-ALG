import { jsonResponse } from "@/core/http/response"
import { ApproveStoryboardUseCase } from "@/modules/video-studio/use-cases/approve-storyboard"
import { defineRoute } from "@/core/http/define-route"

// Gác quyền (P3) ở use-case — RS-9, thống nhất 18/09: route không lặp lại
// phép kiểm mà use-case đã làm.
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "P3 kiểm ở use-case (ApproveStoryboardUseCase.execute)" },
  handler: async ({ ctx, params }) => {
    const { id } = (params as { id: string });
    const useCase = new ApproveStoryboardUseCase();
    const approved = await useCase.execute(ctx, id);

    return jsonResponse(approved);
  },
});
