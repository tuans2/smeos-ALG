/**
 * Quyền và credit của "Viết lại bằng AI" (`POST /api/v1/content-engine/rewrite`) — PO chốt 07/11/2026 (audit
 * API-02, nợ #170).
 *
 * - Quyền: một trong `F2` (sửa hồ sơ tổ chức), `L2`/`L3` (tạo/sửa sản phẩm) — đúng những người thấy nút ở form
 *   hồ sơ cửa hàng/thương hiệu và form sản phẩm.
 * - Credit: giá `content.rewrite` (`usage/domain/pricing.ts`) cho mỗi lượt AI thật sự trả gợi ý. Giữ credit
 *   TRƯỚC khi gọi AI (hết credit → 422 như các tính năng AI khác, không tốn lượt gọi), hoàn lại khi rơi về gợi ý
 *   dựng sẵn. Không gian trải nghiệm (`EXPERIENCE`) không trừ credit — cùng quy tắc nguồn quỹ của job.
 */

import { quotaExceeded } from "@/core/http/errors"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { getWorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import { fundingSourceForWorkspace } from "@/modules/usage/domain/quota"

export const REWRITE_FEATURE = "content.rewrite"
export const REWRITE_CAPABILITIES = ["F2", "L2", "L3"] as const

export function requireRewriteCapability(ctx: TenantContext): void {
  if (REWRITE_CAPABILITIES.some((code) => hasCapability(ctx, code))) return
  // Không có mã nào → lỗi thiếu quyền chuẩn (nêu mã đầu tiên)
  requireCapability(ctx, REWRITE_CAPABILITIES[0])
}

export interface RewriteCreditDeps {
  workspaceKind: (ctx: TenantContext) => Promise<string | null>
  deduct: (ctx: TenantContext, cost: number) => Promise<boolean>
  refund: (ctx: TenantContext, cost: number) => Promise<void>
}

function defaultDeps(): RewriteCreditDeps {
  return {
    workspaceKind: async (ctx) => (await getWorkspaceRepository().findById(ctx, ctx.workspaceId))?.kind ?? null,
    deduct: (ctx, cost) => getOrganizationRepository().tryDeductCredit(ctx, cost, { service: "AI", reason: REWRITE_FEATURE }),
    refund: (ctx, cost) =>
      getOrganizationRepository().refundCredit(ctx, cost, { service: "AI", reason: `${REWRITE_FEATURE} — dùng gợi ý dựng sẵn` }),
  }
}

export interface RewriteCreditHold {
  /** Credit đã giữ (0 khi không trừ). */
  cost: number
  /** Hoàn credit đã giữ — gọi khi không có gợi ý từ AI; gọi lần hai không hoàn thêm. */
  release: () => Promise<void>
}

export async function holdRewriteCredit(ctx: TenantContext, deps: RewriteCreditDeps = defaultDeps()): Promise<RewriteCreditHold> {
  const kind = await deps.workspaceKind(ctx)
  if (kind !== null && fundingSourceForWorkspace(kind) === "trial") return { cost: 0, release: async () => undefined }
  const cost = costCreditForFeature(REWRITE_FEATURE)
  if (!(await deps.deduct(ctx, cost))) throw quotaExceeded("Không đủ credit", { required: cost })
  let released = false
  return {
    cost,
    release: async () => {
      if (released) return
      released = true
      await deps.refund(ctx, cost)
    },
  }
}
