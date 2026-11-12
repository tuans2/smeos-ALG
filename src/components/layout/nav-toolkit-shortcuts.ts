/**
 * nav-toolkit-shortcuts.ts — Lưu trữ shortcuts Công cụ user tự pin (localStorage)
 *
 * Thiết kế:
 * - Tối đa MAX_SHORTCUTS công cụ pinned per organization.
 * - Lưu dưới dạng mảng navKey (string[]), gắn organization_id.
 * - Nếu user chưa pin gì → dùng DEFAULT_SHORTCUT_KEYS (5 công cụ hay dùng nhất).
 * - Tất cả operations đều safe với SSR (typeof window guard).
 */

import "@/lib/brand-storage-migration"
import { getAllTools } from "@/modules/toolkit/domain/toolkit-catalog"
import { DEFERRED_TOOL_HREFS } from "@/modules/toolkit/domain/deferred-module-content"
import { isDevEnvironment } from "@/lib/dev-environment"
import type { NavEntry } from "./nav-model"

export const MAX_SHORTCUTS = 5

/** Mặc định hiển thị nếu user chưa tự chọn (StoreOS) */
export const DEFAULT_SHORTCUT_KEYS: readonly string[] = [
  "creative-studio",   // Chế tác tự động A-Z
  "catalog",           // Tạo Catalog & Link bán hàng
  "content",           // Viết nội dung marketing
  "templates",         // Kho mẫu & Ấn phẩm
  "scan-photo",        // Phân tích ảnh bằng AI
]

/**
 * Ánh xạ toàn bộ công cụ từ SSOT toolkit-catalog sang danh sách NavEntry
 * để hiển thị đầy đủ trong danh sách chọn lối tắt (mini picker) và sidebar shortcuts.
 */
export function getAllToolkitNavEntries(): NavEntry[] {
  // Lối vào PHÁT_TRIỂN_SAU (thư viện thương hiệu, danh thiếp) chỉ hiện ở môi trường phát triển
  const tools = isDevEnvironment() ? getAllTools() : getAllTools().filter((t) => !DEFERRED_TOOL_HREFS.includes(t.href ?? ""))
  return tools.map((t) => {
    // Map các route quen thuộc sang navKey tương thích với sidebar StoreOS
    const navKey =
      t.href === "/creative-studio"
        ? "creative-studio"
        : t.href === "/the-chao" || t.href === "/the-chao?quick=true"
        ? "greeting-card"
        : t.href === "/catalog"
        ? "catalog"
        : t.href === "/tai-anh" || t.href?.startsWith("/tai-anh")
        ? "scan-photo"
        : t.href === "/video"
        ? "video"
        : t.href === "/noi-dung"
        ? "content"
        : t.href === "/market-intelligence"
        ? "market-intel"
        : t.href === "/kho-templates"
        ? "templates"
        : t.href === "/cong-cu/toi-uu-he-thong"
        ? "system-optimizer"
        : `tool-${t.id}`

    return {
      href: t.href || `/cong-cu#tool-${t.id}`,
      label: t.name,
      group: "cong-cu",
      iconKey: t.icon,
      navKey,
      mobileLabel: t.name.slice(0, 8),
    }
  })
}

function storageKey(orgId?: string | null): string {
  const suffix = orgId ? `__${orgId}` : ""
  return `alg_toolkit_shortcuts_v1${suffix}`
}

/**
 * Tải danh sách navKey đã pin. Trả null nếu user chưa lần nào lưu
 * (dùng null để phân biệt "chưa pin" với "đã pin rỗng").
 */
export function loadShortcutKeys(orgId?: string | null): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(storageKey(orgId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed as string[]
    return null
  } catch {
    return null
  }
}

/** Trả danh sách hiển thị (defaults nếu chưa pin) */
export function getEffectiveShortcutKeys(orgId?: string | null, availableDefaultKeys?: string[]): string[] {
  const loaded = loadShortcutKeys(orgId)
  if (loaded !== null) return loaded
  if (availableDefaultKeys && availableDefaultKeys.length > 0) {
    return availableDefaultKeys.slice(0, MAX_SHORTCUTS)
  }
  return [...DEFAULT_SHORTCUT_KEYS]
}

/** Kiểm tra user đã tự chỉnh shortcuts chưa */
export function hasCustomShortcuts(orgId?: string | null): boolean {
  return loadShortcutKeys(orgId) !== null
}

/** Lưu danh sách shortcuts mới (tối đa MAX_SHORTCUTS) */
export function saveShortcutKeys(orgId: string | null | undefined, keys: string[]): void {
  try {
    const limited = keys.slice(0, MAX_SHORTCUTS)
    localStorage.setItem(storageKey(orgId), JSON.stringify(limited))
  } catch {
    // localStorage bị khoá — bỏ qua
  }
}

/** Thêm một công cụ vào shortcuts (bỏ nếu đã có, không vượt MAX) */
export function pinShortcut(orgId: string | null | undefined, navKey: string): string[] {
  const current = getEffectiveShortcutKeys(orgId)
  if (current.includes(navKey)) return current
  const next = [...current, navKey].slice(0, MAX_SHORTCUTS)
  saveShortcutKeys(orgId, next)
  return next
}

/** Bỏ pin một công cụ khỏi shortcuts */
export function unpinShortcut(orgId: string | null | undefined, navKey: string): string[] {
  const current = getEffectiveShortcutKeys(orgId)
  const next = current.filter((k) => k !== navKey)
  saveShortcutKeys(orgId, next)
  return next
}

/** Đặt lại về defaults (xóa key trong localStorage) */
export function resetShortcuts(orgId?: string | null): void {
  try {
    localStorage.removeItem(storageKey(orgId))
  } catch {
    // bỏ qua
  }
}
