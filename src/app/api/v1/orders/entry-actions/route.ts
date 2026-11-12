/**
 * Nút "Đặt hàng" / "Liên hệ" trên trang khách, bật tắt theo toàn bộ hoặc từng nguồn
 * (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.2).
 * GET — R1 (xem đơn) · PUT — F2 (sửa cài đặt tổ chức, trần cứng Điều hành).
 */

import { jsonResponse } from "@/core/http/response"
import { getEntryActions, updateEntryActions } from "@/modules/orders/use-cases/entry-actions-settings"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getEntryActions(ctx))
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const body: unknown = await request.json().catch(() => null)
    return jsonResponse(await updateEntryActions(ctx, body))
  },
})

export const dynamic = "force-dynamic"
