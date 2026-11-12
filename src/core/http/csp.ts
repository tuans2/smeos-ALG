/**
 * Content Security Policy theo nonce (ARC-022 bước A6; PO 12/11/2026: CHẶN NGAY khi triển khai, thay phần "2 tuần ghi
 * nhận" của D-25). `src/proxy.ts` sinh nonce mới cho mỗi request, gắn vào CSP của request (Next.js đọc để tự gắn
 * nonce cho script của nó khi render) và của phản hồi.
 *
 * Nguồn ngoài đã rà trong mã (12/11/2026):
 * - script: chỉ của chính app + Cloudflare Turnstile qua `next/script` — `'strict-dynamic'` cho phép script do script
 *   đã có nonce nạp vào, nên không cần liệt kê host;
 * - frame: YouTube, TikTok (video landing page), Turnstile; khung "Xem trước" cùng origin;
 * - img/media: URL https bất kỳ (ảnh kho có URL ký sẵn, video MP4 do tiệm dán), `data:`/`blob:` (ảnh vừa chọn);
 * - connect: chính app + origin kho lưu trữ (`STORAGE_ENDPOINT`) vì trình duyệt PUT thẳng ảnh lên URL ký sẵn;
 * - font: `next/font` tự lưu trữ; style: thuộc tính `style` của React cần `'unsafe-inline'` (không dùng nonce cho
 *   style — có nonce thì trình duyệt bỏ qua `'unsafe-inline'`).
 *
 * `CSP_MODE=report-only` (biến môi trường) tạm lùi về chỉ ghi nhận khi có sự cố mà không phải triển khai lại; mặc định
 * và mọi giá trị khác là chặn.
 */
export type CspMode = "enforce" | "report-only"

type Env = Readonly<Record<string, string | undefined>>

export const CSP_REPORT_URI = "/api/v1/public/csp-report"

export function cspMode(env: Env = process.env): CspMode {
  return env.CSP_MODE?.trim().toLowerCase() === "report-only" ? "report-only" : "enforce"
}

export function cspHeaderName(mode: CspMode): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"
}

/** Nonce ngẫu nhiên, mới cho mỗi request (≥ 128 bit, base64). */
export function newCspNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function originOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.origin : null
  } catch {
    return null
  }
}

export function buildCsp(nonce: string, env: Env = process.env): string {
  const dev = env.NODE_ENV === "development"
  const storage = originOf(env.STORAGE_ENDPOINT)
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // `'unsafe-eval'` chỉ khi phát triển: React dùng eval để dựng lại stack lỗi; production không cần
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
    ["font-src", ["'self'", "data:", "https://fonts.gstatic.com"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["media-src", ["'self'", "data:", "blob:", "https:"]],
    ["connect-src", ["'self'", ...(storage ? [storage] : []), "https://challenges.cloudflare.com", ...(dev ? ["ws:"] : [])]],
    ["frame-src", ["'self'", "https://www.youtube.com", "https://www.tiktok.com", "https://challenges.cloudflare.com"]],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
    ["report-uri", [CSP_REPORT_URI]],
  ]
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ")
}
