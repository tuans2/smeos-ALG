import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { analyzeProductVision } from "@/modules/market-intelligence/use-cases/analyze-product-vision"
import { visionExtractBodySchema } from "@/modules/creative-production/contracts/stage-02-understand"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 02 — nguồn chuẩn ở `contracts/stage-02-understand.ts`. */
const visionExtractSchema = visionExtractBodySchema;

/**
 * POST /api/v1/market-intelligence/vision-extract
 * Gác quyền V1 (market-intel.research.run), giải quyết tổ chức qua TenantContext.
 * Thu `product.vision_extract` (1 credit) khi mô hình thật sự đọc ảnh — xem use-case.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "V1" },
  handler: async ({ request, ctx }) => {
    const parsed = visionExtractSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues });

    // Ảnh đọc từ kho theo `asset_id` của đúng tổ chức — `image_url` client gửi bị bỏ qua (25/09/2026).
    const result = await analyzeProductVision(ctx, {
      assetId: parsed.data.asset_id,
      productTitle: parsed.data.product_title,
      reanalyzeKey: parsed.data.reanalyze_key,
    });

    return jsonResponse(
      {
        ...result,
        ...(result.usage ? { usage: { cost_credit: result.usage.costCredit, balance_after: result.usage.balanceAfter } } : {}),
      },
      { status: 200 }
    );
  },
});
