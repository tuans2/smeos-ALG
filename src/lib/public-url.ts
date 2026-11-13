/**
 * Địa chỉ công khai của ứng dụng (không có "/" cuối): `PUBLIC_APP_URL`, nếu trống
 * thì `RENDER_EXTERNAL_URL` do Render cấp. Rỗng khi chạy local chưa cấu hình.
 */
export function publicAppUrl(): string {
  const configured = (
    process.env["PUBLIC_APP_URL"] ||
    process.env["NEXT_PUBLIC_APP_URL"] ||
    process.env["RENDER_EXTERNAL_URL"] ||
    (process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"]}` : "") ||
    ""
  ).trim().replace(/\/$/, "")

  if (configured) return configured

  if (process.env.NODE_ENV === "development") {
    const port = process.env["PORT"] || "3200"
    return `http://localhost:${port}`
  }

  return ""
}
