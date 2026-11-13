/**
 * Slug tổ chức. Luật thuần — không import hạ tầng.
 */

const MAX_LENGTH = 48

/** Bỏ dấu tiếng Việt rồi rút về [a-z0-9-]. */
export function toSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "")

  return base
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length <= MAX_LENGTH
}

/**
 * Slug phải là duy nhất toàn hệ thống. Hàm này chỉ sinh ứng viên; việc chọn
 * ứng viên còn trống thuộc về repository, vì chỉ nó biết cái gì đã tồn tại.
 */
export function slugCandidates(name: string, attempts = 20): string[] {
  const base = toSlug(name) || "to-chuc"
  const list = [base]
  for (let i = 2; i <= attempts; i += 1) {
    const suffix = `-${i}`
    list.push(base.slice(0, MAX_LENGTH - suffix.length) + suffix)
  }
  return list
}
