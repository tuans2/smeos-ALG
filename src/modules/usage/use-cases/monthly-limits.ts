import type { TenantContext } from "@/core/tenancy"
import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed } from "@/core/http/errors"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { monthlySnapshot, setMonthlyLimit, type MonthlySnapshot } from "../infra/usage-limit-repository"
import { parseMonthlyLimit } from "../domain/monthly-limit"

/**
 * Hạn mức tháng của cửa hàng (checklist ALG 10.3, 9.7). Xem (`G8`): credit đã dùng/hạn mức tháng do nền tảng
 * đặt và phần AI. Điều hành (`U2`) đặt trần credit AI riêng — không vượt được hạn mức của nền tảng vì cả hai
 * cùng chặn khi trừ credit. Tổ chức lấy từ phiên.
 */

export async function getMonthlyLimits(ctx: TenantContext): Promise<MonthlySnapshot> {
  requireCapability(ctx, "G8")
  return monthlySnapshot(ctx.organizationId)
}

export async function setAiMonthlyLimit(ctx: TenantContext, raw: unknown): Promise<MonthlySnapshot> {
  requireCapability(ctx, "U2")
  const limit = parseMonthlyLimit(raw)
  if (limit === undefined) throw validationFailed({ aiMonthlyLimit: "Trần credit AI là số nguyên từ 0 hoặc bỏ trống để không giới hạn" })
  const before = await monthlySnapshot(ctx.organizationId)
  await setMonthlyLimit(ctx.organizationId, "AI", limit)
  await recordAuditLog(ctx, {
    action: "usage.ai_limit.set", entityType: "usage_limits", entityId: `${ctx.organizationId}:AI`,
    before: { limit: before.ai.limit }, after: { limit },
  })
  return monthlySnapshot(ctx.organizationId)
}
