import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { analyzeProductIntelligence } from "@/modules/market-intelligence/use-cases/analyze-product-intelligence"
import { productIntelligenceBodySchema } from "@/modules/creative-production/contracts/stage-03-discover"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 03 — nguồn chuẩn ở `contracts/stage-03-discover.ts` (asset_id BẮT BUỘC, nợ #118). */
const productIntelligenceSchema = productIntelligenceBodySchema;

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "V1" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => ({}));
    const parsed = productIntelligenceSchema.safeParse(body);
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues });
    }

    const productName = parsed.data.product_name ?? "Sản phẩm mẫu phong cách thanh lịch";
    // Không có ảnh thì để trống như bản lưu DB — "/images/sample-product.jpg" không tồn tại (rà soát lại cụm A)
    const imageUrl = parsed.data.image_url ?? "";

    const result = await analyzeProductIntelligence({
      organizationId: ctx.organizationId,
      productName,
      imageUrl,
      assetId: parsed.data.asset_id,
      components: parsed.data.components,
      attributes: parsed.data.attributes,
      packaging: parsed.data.packaging,
      context: parsed.data.context,
      commercialPassport: parsed.data.commercial_passport ?? undefined,
    });

    return jsonResponse(result, { status: 200 });
  },
});
