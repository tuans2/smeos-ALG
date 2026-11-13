/**
 * POST /api/v1/product-copies/:id/approve
 * Duyệt dữ liệu bán hàng → ghi Product Master + audit_logs — H6
 * Quyền H6 gác ở use-case `approveProductCopy` (RS-9 18/09).
 */
import { defineRoute } from "@/core/http/define-route";
import { jsonResponse } from "@/core/http/response";
import type { TenantContext } from "@/core/tenancy";
import { approveProductCopy } from "@/modules/product-copies/use-cases/approve-product-copy";
import { getProductCopy } from "@/modules/product-copies/use-cases/get-product-copy";

async function approveHandler({ ctx, params }: { ctx: TenantContext; params: Record<string, string> }) {
  const { id } = params as { id: string };

  await approveProductCopy(ctx, id);

  // Return full product copy with approval state
  const copy = await getProductCopy(ctx, id);

  return jsonResponse({ data: copy });
}

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "H6 kiểm ở use-case (approveProductCopy)" },
  handler: approveHandler,
});
export const dynamic = "force-dynamic" as const;
export const revalidate = 0 as const;