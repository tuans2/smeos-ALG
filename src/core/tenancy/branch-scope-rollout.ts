/**
 * Bật phạm vi chi nhánh theo đợt cho từng tổ chức (ADR-012 D-T7 bước T-5, quyết định D-59): cờ
 * `organizations.settings.branch_scope.wave1`, mặc định tắt. Admin SaaS bật sau khi đã báo khách
 * (`PATCH /platform/organizations/:id` `{ branch_scope_wave1 }`). Tổ chức chưa bật giữ hành vi cũ.
 *
 * Đợt 1: khách hàng (đơn hàng và điều phối đã lọc theo chi nhánh từ trước, không cần cờ).
 * Luật thuần — không import hạ tầng.
 */
export const BRANCH_SCOPE_SETTING_KEY = "branch_scope"

export type BranchScopeWave = "wave1"

export function isBranchScopeWaveEnabled(settings: unknown, wave: BranchScopeWave): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false
  const value = (settings as Record<string, unknown>)[BRANCH_SCOPE_SETTING_KEY]
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return (value as Record<string, unknown>)[wave] === true
}
