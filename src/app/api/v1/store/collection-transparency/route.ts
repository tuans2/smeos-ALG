/**
 * GET /api/v1/store/collection-transparency
 *
 * Implements store collection transparency (§9.5.8):
 * Stores can view all data points the chain collects from them and the effective format.
 */

import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { ChainCollectionProfileRepository } from "@/modules/field-platform/infra/chain-collection-repository"
import { getStoreCollectionTransparency } from "@/modules/field-platform/use-cases/get-store-collection-transparency"
import { getBranchRepository } from "@/modules/organization/infra/branch-repository"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ request, ctx }) => {
    const repo = new ChainCollectionProfileRepository()

    const url = new URL(request.url)
    let storeId = url.searchParams.get("storeId")

    if (!storeId) {
      // If storeId is not provided, pick the first active branch for this organization
      const branches = await getBranchRepository().list(ctx)
      const firstBranch = branches.find((b) => b.is_active)
      storeId = firstBranch?.id ?? ""
    }

    if (!storeId) {
      return jsonResponse({
        data: {
          storeId: "",
          storeName: "Cửa hàng mặc định",
          profileVersion: 1,
          items: [],
        },
      })
    }

    // Chi nhánh của tổ chức khác hoặc mã lạ → 404 (không lộ là có tồn tại).
    const result = await getStoreCollectionTransparency(storeId, ctx.organizationId, repo)
    if (!result) throw notFound()
    return jsonResponse({ data: result })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
