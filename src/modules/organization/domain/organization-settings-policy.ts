/**
 * Luật sửa `organizations.settings` qua `PATCH /organizations/current` (quyền tenant F2).
 *
 * Route này hợp nhất nông `settings` do client gửi lên. Trước 21/10/2026 nó nhận MỌI khoá, nên
 * tiệm tự mở được khoá ngành (`industry_locked: false`) hay tự ghi yêu cầu nâng cấp — khoá
 * ngành khi đó chỉ là ẩn nút trên giao diện (rà soát H11, PO duyệt 21/10/2026).
 */

/** Khoá do nền tảng/luồng riêng quản lý — tenant không sửa qua PATCH settings. */
export const PLATFORM_OWNED_SETTING_KEYS = [
  "industry_locked",
  "pending_model_change",
  "is_instant_trial",
  "lead_name",
  "lead_phone",
  "lead_email",
  "lead_captured_at",
  // Quyền mở khóa công cụ đa tầng — chỉ cấp quản lý (Chuỗi/SaaS Mother) mới được phê duyệt
  "unlocked_tools",
  // Phạm vi chi nhánh theo đợt — chỉ Admin SaaS bật (D-59, ADR-012 T-5)
  "branch_scope",
  // Chat Telegram đã chứng minh thuộc tổ chức — chỉ máy chủ ghi (greeting-card/infra/telegram-linked-chats.ts)
  "telegram_linked_chat_ids",
  "telegram_unlinked_chats",
  // Ma trận quản trị chỉ ghi qua `/organizations/current/governance-matrix` (kiểm khoá tầng trên + ghi kép
  // `governance_decisions`, ADR-012 T-7a) — ghi thẳng qua PATCH settings bỏ qua cả hai
  "governance_matrix",
] as const

/** Mã năng lực nền tảng được đổi ngành của tiệm đã khoá ngành. */
export const INDUSTRY_OVERRIDE_PLATFORM_CODES = ["N1", "N12"] as const

export function canOverrideIndustryLock(platformCapabilities: Iterable<string>): boolean {
  const codes = new Set(platformCapabilities)
  return INDUSTRY_OVERRIDE_PLATFORM_CODES.some((code) => codes.has(code))
}

/**
 * Lý do từ chối bản vá `settings`, hoặc `null` nếu hợp lệ. Người vận hành nền tảng (N1/N12) được
 * đổi ngành và khoá ngành; còn lại tenant không chạm khoá nền tảng và không đổi ngành khi đã khoá.
 */
export function settingsPatchViolation(
  patch: Record<string, unknown>,
  current: Record<string, unknown> | null,
  options: { canOverrideIndustryLock: boolean }
): string | null {
  const owned = PLATFORM_OWNED_SETTING_KEYS.filter((key) => key in patch)
  const blockedOwned = options.canOverrideIndustryLock ? owned.filter((key) => key !== "industry_locked") : owned
  if (blockedOwned.length > 0) {
    return `Không thể tự sửa cấu hình do hệ thống quản lý: ${blockedOwned.join(", ")}.`
  }

  const changesIndustry = "industry" in patch && patch.industry !== current?.industry
  if (changesIndustry && current?.industry_locked === true && !options.canOverrideIndustryLock) {
    return "Ngành kinh doanh đã được cố định theo đăng ký. Vui lòng liên hệ Admin SaaS để đổi ngành."
  }
  return null
}
