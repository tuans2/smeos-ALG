import { prisma } from "@/core/tenancy/infra/prisma"
import { type UxRolloutFlags, parseUxRolloutFlags } from "@/modules/platform/domain/ux-rollout-flags"

/**
 * Cờ rollout UX lưu ở `platform_settings` (khoá `ux_rollout_flags`) — cùng cơ chế với
 * `nav-matrix-store.ts`: không cần bảng mới, `updated_by` giữ vết người đổi.
 */
export const UX_ROLLOUT_SETTING_KEY = "ux_rollout_flags"

/** Tắt cờ có hiệu lực trên mọi instance chậm nhất sau khoảng này. */
const CACHE_TTL_MS = 30_000

let cache: { value: UxRolloutFlags; at: number } | null = null

export async function getUxRolloutFlags(now: number = Date.now()): Promise<UxRolloutFlags> {
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value
  const row = await prisma.platform_settings.findUnique({ where: { key: UX_ROLLOUT_SETTING_KEY } })
  const value = parseUxRolloutFlags(row?.value ?? null)
  cache = { value, at: now }
  return value
}

/** Chỉ route `PUT /platform/ux-rollout-flags` gọi (mã `N12`). */
export async function saveUxRolloutFlags(raw: unknown, updatedBy: string | null = null): Promise<UxRolloutFlags> {
  const value = parseUxRolloutFlags(raw)
  const json = JSON.parse(JSON.stringify(value))
  await prisma.platform_settings.upsert({
    where: { key: UX_ROLLOUT_SETTING_KEY },
    create: { key: UX_ROLLOUT_SETTING_KEY, value: json, updated_by: updatedBy },
    update: { value: json, updated_by: updatedBy },
  })
  cache = { value, at: Date.now() }
  return value
}

/** Chỉ dùng trong test. */
export function clearUxRolloutFlagCache(): void {
  cache = null
}
