/**
 * Luật cấu hình kho tệp (P0-05, ARC-006). Thuần — không đọc `process.env` trực tiếp.
 *
 * Production mà thiếu cấu hình kho dùng chung thì KHÔNG được lặng lẽ lùi về đĩa cục bộ:
 * đĩa của dịch vụ web trên Render bị xoá mỗi lần deploy, và worker không nhìn thấy tệp của web.
 * Chỉ cho dùng đĩa cục bộ khi không phải production, hoặc khi môi trường bật tường minh
 * `ALLOW_LOCAL_STORAGE=true` (CI chạy bản build production, máy dev chạy `next start`).
 */

export const SHARED_STORAGE_VARS = [
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
] as const

type Env = Readonly<Record<string, string | undefined>>

/** Các biến kho dùng chung đang thiếu (rỗng hoặc chỉ có khoảng trắng tính là thiếu). */
export function missingStorageVars(env: Env): string[] {
  return SHARED_STORAGE_VARS.filter((name) => !env[name]?.trim())
}

/** Có được phép chạy bằng đĩa cục bộ không. */
export function localStorageAllowed(env: Env): boolean {
  return env.NODE_ENV !== "production" || env.ALLOW_LOCAL_STORAGE === "true"
}

/** Cấu hình kho có dùng được ở môi trường này không — dùng cho `/api/health/ready`. */
export function storageConfigReady(env: Env): boolean {
  return missingStorageVars(env).length === 0 || localStorageAllowed(env)
}
