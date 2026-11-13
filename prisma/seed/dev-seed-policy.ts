/**
 * Seed nào được phép nạp tài khoản/dữ liệu mẫu có mật khẩu viết cứng.
 *
 * Production (`NODE_ENV=production`) chỉ nạp khi cờ `SEED_DEV_DATA=true` bật rõ ràng
 * (máy demo / staging). Render production đặt cờ này là "false".
 */
export function devSeedEnabled(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV !== "production" || env.SEED_DEV_DATA === "true"
}
