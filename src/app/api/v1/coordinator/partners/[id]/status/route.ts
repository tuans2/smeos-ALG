import { z } from "zod"
import { handle, jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { changePartnershipStatus } from "@/modules/chain-partnership/use-cases/manage-chain-links"

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]),
  // Lý do kiểm ở use-case SAU bước kiểm sở hữu — chuỗi khác luôn nhận 404, không 400
  reason: z.string().max(500).optional(),
})

/**
 * `PATCH /coordinator/partners/:id/status` (F2) — Chuỗi tạm ngưng / mở lại / chấm dứt liên kết, hoặc rút lời mời.
 * Theo ma trận vòng đời (UJ-10): không tự kích hoạt lời mời thay cửa hàng, đã chấm dứt thì không mở lại; bắt buộc
 * lý do, ghi nhật ký, báo cửa hàng. Chuỗi khác → 404.
 */
export const PATCH = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const { id: partnershipId } = await context.params
  const parsed = statusSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    throw validationFailed({ reason: parsed.error.issues.map((e) => e.message).join(", ") })
  }
  const updated = await changePartnershipStatus(ctx, partnershipId, parsed.data.status, parsed.data.reason ?? "")
  return jsonResponse({ success: true, data: updated })
})
