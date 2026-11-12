/**
 * POST /api/v1/product-copies/:id/reject
 * Từ chối dữ liệu bán hàng — H6
 * Body: { reason?: string }
 * Quyền H6 gác ở use-case `rejectProductCopy` (RS-9 18/09).
 */
import { defineRoute } from "@/core/http/define-route";
import type { TenantContext } from "@/core/tenancy";
import { rejectProductCopy } from "@/modules/product-copies/use-cases/approve-product-copy";
import { getProductCopy } from "@/modules/product-copies/use-cases/get-product-copy";

async function rejectHandler({ request, ctx, params }: { request: Request; ctx: TenantContext; params: Record<string, string> }) {
  const { id } = params as { id: string };

  const body = await request.json().catch(() => ({}));
  const reason = body.reason ?? null;

  await rejectProductCopy(ctx, id, reason ?? undefined);

  // Return updated product copy
  const copy = await getProductCopy(ctx, id);

  return new Response(JSON.stringify(copy), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "H6 kiểm ở use-case (rejectProductCopy)" },
  handler: rejectHandler,
});
export const dynamic = "force-dynamic" as const;
export const revalidate = 0 as const;