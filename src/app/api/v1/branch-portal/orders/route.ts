import { jsonResponse } from "@/core/http/response"
import { BranchPortalRepository } from "@/modules/greeting-card/infra/branch-portal-repository"
import { listBranchPortalOrders } from "@/modules/greeting-card/use-cases/branch-portal"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/branch-portal/orders
 * Trang cửa hàng nhận gia công: đơn đang mời chi nhánh của tài khoản và đơn chi nhánh đang làm.
 * Chi nhánh lấy từ membership của phiên (`memberships.branch_id`, ADR-012 T-4b) — không nhận tham số chi nhánh.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R14" },
  handler: async ({ request, ctx }) => {
    // Link Thẻ Gia Công dựng từ URL công khai đã cấu hình (giống tin Telegram), không từ header
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const data = await listBranchPortalOrders(ctx, new BranchPortalRepository(), baseUrl)
    return jsonResponse({ data })
  },
})

export const dynamic = "force-dynamic"
