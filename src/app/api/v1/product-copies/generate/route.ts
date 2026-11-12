/**
 * `POST /api/v1/product-copies/generate` — sinh dữ liệu bán hàng từ một lượt
 * phân tích đã duyệt (`H5`; duyệt kết quả là `H6`, tách riêng theo Luật 4).
 *
 * Đây là một điểm TẠO JOB: nó gọi mô hình và tiêu tiền nhà cung cấp, nên nó
 * chịu đúng ràng buộc như `POST /vision/analyses` — `idempotency-key` bắt
 * buộc (`YC-U7`), hạn mức kiểm phía core trước khi chạy (PRD mục 7.5).
 *
 * Body: `{ analysisId: string, productId?: string }`
 */
import { jsonResponse } from "@/core/http/response";
import { defineRoute } from "@/core/http/define-route";
import type { TenantContext } from "@/core/tenancy";
import { validationFailed } from "@/core/http/errors";
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency";
import { generateProductCopy } from "@/modules/product-copies/use-cases/generate-product-copy";

async function generateHandler({ request, ctx }: { request: Request; ctx: TenantContext }) {

  // Quyền H5 gác ở use-case `generateProductCopy` (RS-9 18/09).
  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) {
    throw validationFailed({ "idempotency-key": "Bắt buộc trên mọi endpoint tạo job (YC-U7)" });
  }

  const body = await request.json().catch(() => null);
  if (!body?.analysisId) {
    throw validationFailed({ analysisId: "Bắt buộc" });
  }

  const result = await generateProductCopy(ctx, {
    analysisId: body.analysisId,
    productId: body.productId ?? null,
    idempotencyKey,
  });

  return jsonResponse(result);
}

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "H5 kiểm ở use-case (generateProductCopy)" },
  handler: generateHandler,
});
export const dynamic = "force-dynamic" as const;
export const revalidate = 0 as const;
