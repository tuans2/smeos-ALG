/**
 * Môi trường phát triển (máy dev, bản xem trước) — nơi DUY NHẤT hiện nội dung gắn PHÁT_TRIỂN_SAU
 * (`src/modules/toolkit/domain/deferred-module-content.ts`). Production luôn ẩn.
 */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
}
