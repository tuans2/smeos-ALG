/**
 * Chuyển khoá lưu trên trình duyệt sang tên ALG (đổi thương hiệu 12/11/2026), chạy MỘT lần khi module được nạp —
 * trước khi component đọc khoá — nên người dùng không mất bản nháp, tuỳ chọn hay trạng thái đã lưu.
 *
 * Khoá cũ `smeos_*`, `smeos.*`, `smeos:*` và `floraos_*`, `floraos.*`, `floraos:*` (đổi tên lần trước) → `alg` + phần còn lại
 * (`smeos_nav_groups_v2` → `alg_nav_groups_v2`, `floraos:visitor` → `alg:visitor`). Khoá mới đã có thì giữ, chỉ xoá khoá cũ.
 * Module định nghĩa khoá lưu trữ chỉ cần `import "@/lib/brand-storage-migration"`.
 */

const LEGACY_PREFIX = /^(smeos|floraos)([_.:])/

/** Đổi tên khoá trong một kho; trả số khoá đã chuyển. Không ném lỗi (kho bị chặn, đầy…). */
export function migrateLegacyBrandKeys(storage: Storage): number {
  let moved = 0
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && LEGACY_PREFIX.test(key)) keys.push(key)
    }
    // smeos_* chuyển trước floraos_* để giá trị mới hơn thắng khi cả hai cùng có
    keys.sort((a, b) => (a.startsWith("smeos") === b.startsWith("smeos") ? 0 : a.startsWith("smeos") ? -1 : 1))
    for (const key of keys) {
      const next = key.replace(LEGACY_PREFIX, "alg$2")
      const value = storage.getItem(key)
      if (value !== null && storage.getItem(next) === null) {
        storage.setItem(next, value)
        moved++
      }
      storage.removeItem(key)
    }
  } catch {
    // Kho không dùng được (chế độ riêng tư, bị chặn) — bỏ qua, ứng dụng vẫn chạy với khoá mới
  }
  return moved
}

let done = false

export function ensureBrandStorageMigrated(): void {
  if (done || typeof window === "undefined") return
  done = true
  try {
    migrateLegacyBrandKeys(window.localStorage)
    migrateLegacyBrandKeys(window.sessionStorage)
  } catch {
    // Truy cập kho bị chặn
  }
}

ensureBrandStorageMigrated()
