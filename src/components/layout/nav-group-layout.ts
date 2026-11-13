/**
 * nav-group-layout.ts — Quy tắc trình bày nhóm trong sidebar (thuần, không phụ thuộc React).
 *
 * 1. Mặc định chỉ mở nhóm chứa trang hiện tại (Screen Contract `_dieu-huong.md`:
 *    "≤ 8 mục mở sẵn"); nhóm người dùng đã tự đóng/mở thì giữ theo lựa chọn đó.
 * 2. Mục đang chọn là mục có href khớp dài nhất (`resolveActiveHref`).
 * 3. Các mục "Ma trận …" trong một nhóm được gom vào mục con "Ma trận quản trị"
 *    khi có từ 3 mục trở lên và nhóm không phải nhóm chỉ gồm ma trận.
 */

import type { NavEntry, NavGroup } from "./nav-model"

const MATRIX_PREFIX = /^Ma trận\s+/i
const MIN_MATRIX_ENTRIES = 3

export const MATRIX_SUBTREE_LABEL = "Ma trận quản trị"

function matchesPath(href: string, pathname: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
}

/**
 * Mục đang chọn = href khớp dài nhất với đường dẫn hiện tại, để `/cai-dat` không sáng
 * cùng lúc với `/cai-dat/ma-tran-uudai`. Không khớp mục nào → trả lại chính đường dẫn.
 */
export function resolveActiveHref(hrefs: Iterable<string>, pathname: string): string {
  let best: string | null = null
  for (const href of hrefs) {
    if (matchesPath(href, pathname) && (best === null || href.length > best.length)) best = href
  }
  return best ?? pathname
}

export function isEntryActive(entry: Pick<NavEntry, "href">, activeHref: string): boolean {
  return entry.href === activeHref
}

export function isNavGroupExpanded(
  group: Pick<NavGroup, "key" | "entries">,
  activeHref: string,
  openGroups: Record<string, boolean>
): boolean {
  if (group.entries.some((e) => isEntryActive(e, activeHref))) return true
  return openGroups[group.key] ?? false
}

export function matrixSubtreeKey(groupKey: string): string {
  return `${groupKey}:ma-tran`
}

export function splitMatrixEntries(entries: readonly NavEntry[]): {
  primary: NavEntry[]
  matrix: NavEntry[]
} {
  const matrix = entries.filter((e) => MATRIX_PREFIX.test(e.label))
  if (matrix.length < MIN_MATRIX_ENTRIES || matrix.length === entries.length) {
    return { primary: [...entries], matrix: [] }
  }
  return { primary: entries.filter((e) => !MATRIX_PREFIX.test(e.label)), matrix }
}

/** Nhãn mục con trong cây "Ma trận quản trị": bỏ tiền tố "Ma trận", viết hoa chữ đầu. */
export function matrixChildLabel(label: string): string {
  const rest = label.replace(MATRIX_PREFIX, "").trim()
  if (!rest) return label
  return rest.charAt(0).toLocaleUpperCase("vi") + rest.slice(1)
}
