import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import initialOverrides from "@/lib/data/industry-nav-matrix-overrides.json"
import { listAllIndustryPlugins } from "@/modules/organization/domain/industry-profile"

/**
 * Ma trận điều hướng theo ngành do Admin SaaS ghi đè ở Console `/van-hanh`.
 *
 * Lưu ở `platform_settings` (khoá `nav_matrix_overrides`) — trước 22/10/2026 lưu vào một tệp
 * trên máy chủ: mất khi deploy, mỗi instance một bản, và menu không bao giờ đọc nó (menu đóng gói
 * tệp JSON lúc build). Chưa có dòng trong CSDL thì dùng tệp JSON đã commit làm giá trị khởi đầu,
 * nên hành vi trước lần lưu đầu tiên giữ đúng như cũ (rà soát M13).
 */
export const NAV_MATRIX_SETTING_KEY = "nav_matrix_overrides"

export type PlatformNavMatrixOverrides = Record<string, string[]>

/** Đọc lại CSDL sau mỗi khoảng này — các instance khác thấy thay đổi chậm nhất chừng ấy. */
const CACHE_TTL_MS = 30_000

let cache: { value: PlatformNavMatrixOverrides; at: number } | null = null

function withAllIndustries(overrides: PlatformNavMatrixOverrides): PlatformNavMatrixOverrides {
  const merged: PlatformNavMatrixOverrides = {}
  for (const plugin of listAllIndustryPlugins()) merged[plugin.identity.key] = []
  for (const [key, hidden] of Object.entries(overrides)) {
    if (Array.isArray(hidden)) merged[key] = hidden.filter((k): k is string => typeof k === "string")
  }
  return merged
}

function parseStored(value: Prisma.JsonValue): PlatformNavMatrixOverrides {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as PlatformNavMatrixOverrides) : {}
}

export async function getPlatformNavMatrixOverrides(now: number = Date.now()): Promise<PlatformNavMatrixOverrides> {
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value
  const row = await prisma.platform_settings.findUnique({ where: { key: NAV_MATRIX_SETTING_KEY } })
  const value = withAllIndustries(row ? parseStored(row.value) : (initialOverrides as PlatformNavMatrixOverrides))
  cache = { value, at: now }
  return value
}

/** Danh sách mục ẩn ghi đè cho một ngành; `null` khi Admin không ghi đè (dùng mặc định của ngành). */
export async function getNavHiddenOverride(industryKey: string): Promise<string[] | null> {
  const hidden = (await getPlatformNavMatrixOverrides())[industryKey]
  return hidden && hidden.length > 0 ? hidden : null
}

/** Chỉ route `PUT /platform/nav-matrix` gọi (mã `N12`). */
export async function savePlatformNavMatrixOverrides(
  overrides: PlatformNavMatrixOverrides,
  updatedBy: string | null = null
): Promise<PlatformNavMatrixOverrides> {
  const value = withAllIndustries(overrides)
  await prisma.platform_settings.upsert({
    where: { key: NAV_MATRIX_SETTING_KEY },
    create: { key: NAV_MATRIX_SETTING_KEY, value, updated_by: updatedBy },
    update: { value, updated_by: updatedBy },
  })
  cache = { value, at: Date.now() }
  return value
}

/** Chỉ dùng trong test. */
export function clearPlatformNavMatrixCache(): void {
  cache = null
}
