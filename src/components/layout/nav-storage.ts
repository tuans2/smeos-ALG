import "@/lib/brand-storage-migration"
/**
 * nav-storage.ts — Trạng thái điều hướng persistent (localStorage)
 * Gắn organization_id để không lẫn trạng thái giữa các tổ chức.
 */

export function navStorageKeys(orgId?: string | null) {
  const suffix = orgId ? `__${orgId}` : ""
  return {
    groupsKey: `alg_nav_groups_v2${suffix}`,
    reportsKey: `alg_nav_reports_open_v2${suffix}`,
    collapseKey: `alg_nav_collapsed_v1`,
  }
}

export function loadNavGroups(key: string): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export function persistNavGroups(key: string, states: Record<string, boolean>): void {
  try {
    localStorage.setItem(key, JSON.stringify(states))
  } catch {
    // localStorage bị khoá — chỉ mất ghi nhớ trạng thái
  }
}

/** Mục Báo cáo mặc định mở khi chưa lưu gì. */
export function loadReportsOpen(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "false"
  } catch {
    return true
  }
}

/** Trạng thái thu gọn sidebar (icon-only mode) — global, không phân biệt org. */
export function loadNavCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true"
  } catch {
    return false
  }
}

export function persistNavCollapsed(key: string, collapsed: boolean): void {
  try {
    localStorage.setItem(key, String(collapsed))
  } catch {
    // bỏ qua
  }
}
