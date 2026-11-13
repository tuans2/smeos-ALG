/**
 * Báo việc mới trong app (không cần nhà cung cấp ngoài):
 * - tiêu đề tab trình duyệt có tiền tố "(n)" khi còn việc chưa xử lý;
 * - chỉ báo "có việc mới" khi số việc TĂNG so với lần tải trước (không báo ở lần tải đầu).
 */
const PREFIX = /^\(\d+\+?\)\s+/

export function stripCountPrefix(title: string): string {
  return title.replace(PREFIX, "")
}

export function titleWithCount(title: string, total: number): string {
  const base = stripCountPrefix(title)
  if (total <= 0) return base
  return `(${total > 99 ? "99+" : total}) ${base}`
}

/** previous = null nghĩa là lần tải đầu tiên → không báo. */
export function newItemsSince(previous: number | null, current: number): number {
  if (previous === null) return 0
  return Math.max(0, current - previous)
}
