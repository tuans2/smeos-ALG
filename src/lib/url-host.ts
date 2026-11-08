/**
 * So tên miền của một URL — thay cho `url.includes("drive.google.com")`, vốn khớp cả
 * `https://evil.example/?x=drive.google.com` (CodeQL `js/incomplete-url-substring-sanitization`).
 * Khớp đúng tên miền hoặc tên miền con (`www.youtube.com` khớp `youtube.com`). URL thiếu giao thức
 * (`drive.google.com/file/...`) được hiểu như `https://`; chuỗi không phải URL → `false`.
 */
export function urlHostIs(url: string | null | undefined, domain: string): boolean {
  if (!url) return false
  const host = hostOf(url.trim())
  if (!host) return false
  const d = domain.toLowerCase()
  return host === d || host.endsWith(`.${d}`)
}

function hostOf(url: string): string | null {
  if (!url || url.startsWith("/")) return null
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase()
  } catch {
    return null
  }
}
