import { jsonResponse } from "@/core/http/response"
import { ApproveVideoOutputUseCase } from "@/modules/video-studio/use-cases/approve-video-output"
import { defineRoute } from "@/core/http/define-route"

// Gác quyền (P4) ở use-case — RS-9, thống nhất 18/09: route không lặp lại
// phép kiểm mà use-case đã làm.
export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "P4 kiểm ở use-case (ApproveVideoOutputUseCase.execute)" },
  handler: async ({ ctx, params }) => {
    const { id } = (params as { id: string });
    const useCase = new ApproveVideoOutputUseCase();
    const approved = await useCase.execute(ctx, id);

    return jsonResponse(approved);
  },
});
