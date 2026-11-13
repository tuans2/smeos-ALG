import type { TenantContext } from "./tenant-context"

/**
 * Cách ly dữ liệu theo chi nhánh (checklist ALG 9.13): nhân viên được giao một chi nhánh
 * (`memberships.branch_id`, có trong `TenantContext.branchId`) chỉ thấy đơn hàng, doanh số, tồn kho
 * của chi nhánh đó; trưởng chi nhánh chỉ quản lý cơ sở của mình. Người có quyền quản lý mọi chi nhánh
 * (`F7` — trần cứng Điều hành) không bị giới hạn.
 */
export const ORG_WIDE_BRANCH_CAPABILITY = "F7"

/** Chi nhánh người thao tác bị giới hạn vào; `null` = thấy toàn tổ chức. */
export function branchScopeOf(ctx: Pick<TenantContext, "branchId" | "capabilities">): string | null {
  if (!ctx.branchId) return null
  return ctx.capabilities.has(ORG_WIDE_BRANCH_CAPABILITY) ? null : ctx.branchId
}

/**
 * Chi nhánh người thao tác bị giới hạn vào **cho một mã quyền** (ADR-012 D-T7, bước T-5). Mã được cấp phạm vi
 * `BRANCH` (`role_capabilities.scope`) → luôn giới hạn vào chi nhánh của người đó, kể cả khi có F7. Mã phạm vi
 * `ORGANIZATION` → luật chung `branchScopeOf` (có chi nhánh mà không có F7 thì giới hạn). Không có chi nhánh → không
 * giới hạn.
 */
export function branchScopeFor(ctx: Pick<TenantContext, "branchId" | "capabilities" | "grants">, code: string): string | null {
  if (!ctx.branchId) return null
  if (ctx.grants?.get(code) === "BRANCH") return ctx.branchId
  return branchScopeOf(ctx)
}

/**
 * Người thao tác có được gán bản ghi vào `branchId` với mã quyền `code` không (ADR-012 T-5b): không bị giới hạn → mọi
 * chi nhánh; bị giới hạn → chỉ chi nhánh của mình, và `null` (dùng chung toàn tổ chức) khi `allowShared`.
 */
export function canAssignBranch(
  ctx: Pick<TenantContext, "branchId" | "capabilities" | "grants">,
  code: string,
  branchId: string | null | undefined,
  opts: { allowShared: boolean },
): boolean {
  const scope = branchScopeFor(ctx, code)
  if (!scope) return true
  if (branchId === undefined || branchId === null) return opts.allowShared
  return branchId === scope
}

/** `branchScopedWhere` theo một mã quyền — `{}` khi không giới hạn (dùng thay `branchScopedWhere` ở đợt T-5 trở đi). */
export function scopedWhereForBranch(ctx: Pick<TenantContext, "branchId" | "capabilities" | "grants">, code: string): { branch_id?: string } {
  const scope = branchScopeFor(ctx, code)
  return scope ? { branch_id: scope } : {}
}

/** Điều kiện `branch_id` cho truy vấn bảng có cột chi nhánh (đơn hàng…); `{}` khi không giới hạn. */
export function branchScopedWhere(ctx: Pick<TenantContext, "branchId" | "capabilities">): { branch_id?: string } {
  const scope = branchScopeOf(ctx)
  return scope ? { branch_id: scope } : {}
}

/** Bản ghi có nằm trong phạm vi chi nhánh của người thao tác không (ngoài phạm vi → trả 404 như khác tổ chức). */
export function inBranchScope(ctx: Pick<TenantContext, "branchId" | "capabilities">, branchId: string | null | undefined): boolean {
  const scope = branchScopeOf(ctx)
  return scope === null || branchId === scope
}

/**
 * Lọc sản phẩm/tồn kho theo chi nhánh (checklist ALG 9.13): người bị giới hạn chỉ thấy sản phẩm dùng
 * chung (`branch_id` rỗng) và sản phẩm của chi nhánh mình. `requested` là bộ lọc chi nhánh người gọi
 * tự chọn — chọn chi nhánh khác thì không ra dòng nào.
 */
export function branchScopedProductWhere(
  ctx: Pick<TenantContext, "branchId" | "capabilities">,
  requested: string | null | undefined
): { branch_id?: string | null; OR?: Array<{ branch_id: string | null }> } {
  const base = requested !== undefined ? { branch_id: requested } : {}
  const scope = branchScopeOf(ctx)
  return scope ? { ...base, OR: [{ branch_id: null }, { branch_id: scope }] } : base
}
