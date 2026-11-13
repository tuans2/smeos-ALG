import { asSystemDb } from "@/core/tenancy/db-context"
import { classifyCustomDomainPath, type CustomDomainStatus } from "../domain/custom-domain"
import { getCustomDomainRepository, type CustomDomainRepository } from "../infra/custom-domain-repository"

/**
 * Định tuyến request theo tên miền (checklist ALG 10.8), gọi từ `src/proxy.ts`.
 *
 * - Máy chủ của hệ thống (địa chỉ công khai, `*.onrender.com`, localhost) → đi tiếp như thường.
 * - Tên miền lạ không có trong `custom_domains` → đi tiếp (Render chỉ chuyển tới các tên miền đã gắn).
 * - Tên miền riêng chưa xác minh hoặc bị khoá → 404.
 * - Tên miền riêng đã xác minh → chỉ mở trang danh mục / Thẻ Chào / trang cửa hàng mà dữ liệu thuộc đúng tổ
 *   chức sở hữu tên miền; trang khác (đăng nhập, quản trị…) và dữ liệu của tổ chức khác → 404.
 *
 * Tra cứu chạy với quyền hệ thống (chưa có phiên). Kết quả nhớ ngắn hạn theo instance; đổi trạng thái tên
 * miền thì xoá nhớ ở instance đang xử lý, instance khác tự hết hạn sau `CACHE_TTL_MS`.
 */

export type DomainDecision =
  | { action: "next" }
  | { action: "not_found" }
  | { action: "redirect"; location: string }
  | { action: "unavailable" }

const CACHE_TTL_MS = 60_000
const CACHE_MAX = 2000

type HostEntry = { organizationId: string; orgSlug: string; status: CustomDomainStatus } | null
const hostCache = new Map<string, { at: number; value: HostEntry }>()
const ownerCache = new Map<string, { at: number; value: string | null }>()

function cached<T>(map: Map<string, { at: number; value: T }>, key: string, now: number): { value: T } | null {
  const hit = map.get(key)
  if (!hit || now - hit.at > CACHE_TTL_MS) return null
  return { value: hit.value }
}

function remember<T>(map: Map<string, { at: number; value: T }>, key: string, value: T, now: number): void {
  if (map.size >= CACHE_MAX) map.clear()
  map.set(key, { at: now, value })
}

/** Xoá nhớ của một tên miền; không truyền tên miền → xoá toàn bộ (cả nhớ chủ sở hữu trang). */
export function invalidateCustomDomainCache(hostname?: string): void {
  if (hostname) {
    hostCache.delete(hostname)
    return
  }
  hostCache.clear()
  ownerCache.clear()
}

/** Tên máy chủ của chính hệ thống — không bao giờ tra bảng tên miền riêng. */
export function platformHostnames(env: Record<string, string | undefined> = process.env): string[] {
  const hosts = new Set(["localhost", "127.0.0.1"])
  for (const key of ["PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL", "RENDER_EXTERNAL_URL"]) {
    const value = env[key]?.trim()
    if (!value) continue
    try {
      hosts.add(new URL(value).hostname.toLowerCase())
    } catch {
      // URL cấu hình sai — bỏ qua, env.ts đã kiểm khi khởi động
    }
  }
  const target = env["CUSTOM_DOMAIN_TARGET"]?.trim().toLowerCase()
  if (target) hosts.add(target)
  return [...hosts]
}

export function isPlatformHost(hostname: string, env: Record<string, string | undefined> = process.env): boolean {
  if (hostname.endsWith(".onrender.com") || hostname.endsWith(".localhost")) return true
  return platformHostnames(env).includes(hostname)
}

/** `host` header → tên máy chủ chữ thường, bỏ cổng. */
export function hostnameOf(hostHeader: string | null): string | null {
  if (!hostHeader) return null
  const host = hostHeader.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "")
  return host || null
}

export async function resolveCustomDomainRequest(
  hostHeader: string | null, pathname: string,
  repo: CustomDomainRepository = getCustomDomainRepository(), now = Date.now(),
): Promise<DomainDecision> {
  const hostname = hostnameOf(hostHeader)
  if (!hostname || isPlatformHost(hostname)) return { action: "next" }

  let entry = cached(hostCache, hostname, now)
  if (!entry) {
    const value = await asSystemDb("custom-domain", () => repo.byHostname(hostname))
    remember(hostCache, hostname, value, now)
    entry = { value }
  }
  const domain = entry.value
  if (!domain) return { action: "next" }
  if (domain.status !== "VERIFIED") return { action: "not_found" }

  const path = classifyCustomDomainPath(pathname)
  if (path.kind === "pass") return { action: "next" }
  if (path.kind === "blocked") return { action: "not_found" }
  if (path.kind === "home") {
    const slug = await asSystemDb("custom-domain", () => repo.homeStoreProfileSlug(domain.organizationId))
    return slug ? { action: "redirect", location: `/ch/${encodeURIComponent(slug)}` } : { action: "not_found" }
  }
  if (path.resource === "org_slug") return path.key === domain.orgSlug ? { action: "next" } : { action: "not_found" }

  const ownerKey = `${path.resource}:${path.key}`
  let owner = cached(ownerCache, ownerKey, now)
  if (!owner) {
    const value = await asSystemDb("custom-domain", () => repo.ownerOf(path.resource, path.key))
    remember(ownerCache, ownerKey, value, now)
    owner = { value }
  }
  return owner.value === domain.organizationId ? { action: "next" } : { action: "not_found" }
}
