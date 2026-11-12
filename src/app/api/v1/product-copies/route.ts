/**
 * GET /api/v1/product-copies
 * List product copies — query params: product_id?, approval_state?
 * Quyền: H5 — gác ở use-case `listProductCopies` (RS-8/RS-9 18/09).
 */
import { defineRoute } from "@/core/http/define-route";
import type { TenantContext } from "@/core/tenancy";
import { listProductCopies } from "@/modules/product-copies/use-cases/get-product-copy";

async function listHandler({ request, ctx }: { request: Request; ctx: TenantContext }) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id") ?? undefined;
  const approvalState = url.searchParams.get("approval_state") ?? undefined;

  const copies = await listProductCopies(ctx, productId);

  // Filter by approval_state if provided
  const filtered = approvalState
    ? copies.filter(c => c.approval_state === approvalState)
    : copies;

  return new Response(JSON.stringify({ data: filtered }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "H5 kiểm ở use-case (listProductCopies)" },
  handler: listHandler,
});
export const dynamic = "force-dynamic" as const;
export const revalidate = 0 as const;