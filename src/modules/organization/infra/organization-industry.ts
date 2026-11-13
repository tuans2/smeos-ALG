import type { Prisma } from "@/generated/prisma/client"

import { splitIndustrySettings } from "../domain/industry-key"

/**
 * ADR-012 T-6c-1 — ngành của tổ chức nằm ở cột `organizations.industry_key`.
 *
 * - Đọc: chọn `ORG_SETTINGS_SELECT` (settings + cột ngành) rồi qua `withIndustryKey` / `withOrganizationIndustry`
 *   (`../domain/industry-key`) để mã phía sau đọc `settings.industry` như cũ mà nguồn là cột.
 * - Ghi: `organizationSettingsData` tách `industry` khỏi settings và ghi vào cột.
 */
export const ORG_SETTINGS_SELECT = { settings: true, industry_key: true } as const

/** Dữ liệu ghi `settings` của một tổ chức: không còn khoá `industry`; có khoá đó thì ghi cột `industry_key`. */
export function organizationSettingsData(settings: Record<string, unknown>): { settings: Prisma.InputJsonValue; industry_key?: string | null } {
  const split = splitIndustrySettings(settings)
  return { settings: split.settings as Prisma.InputJsonValue, ...(split.industryKey !== undefined ? { industry_key: split.industryKey } : {}) }
}
