/**
 * Đọc chứng thư của một lời gọi `/api/v1/integration/*` — luật thuần, không
 * chạm Prisma, không chạm `node:crypto` (giống `token-rules.ts` cùng thư mục).
 *
 * Hai đường danh tính, cố ý khác bản chất:
 *
 * - `Authorization: Bearer <token>` — token MÁY GỌI MÁY (`integration_tokens`,
 *   `YC-T8`). Gắn cứng vào một tổ chức, không gắn người dùng. Dùng cho lời gọi
 *   nền: cron, worker, đối soát.
 * - `X-ALG-SSO: <jwt>` — JWT phiên liên-app (`floraos_sso`, Unified Shell
 *   B1). Gắn NGƯỜI DÙNG + tổ chức đang hoạt động của chính người đó. Dùng cho
 *   lời gọi mà `LocalBudd`/`SocialFlow` thực hiện thay mặt một người đang
 *   đăng nhập.
 *
 * **SSO thắng khi có cả hai.** Lý do: phạm vi của nó HẸP hơn — nó bị khoá vào
 * đúng tổ chức của người đang thao tác và mang theo năng lực thật của người
 * đó, trong khi token máy gọi máy mở toàn bộ tổ chức đã cấp và không có năng
 * lực nào để cắt. Chọn cái hẹp hơn là mặc định an toàn; chọn ngược lại thì một
 * app chỉ cần kèm thêm token nền là bỏ qua được ranh giới người dùng.
 *
 * Không đường nào ở đây nhận `organization_id` từ client — cả hai đều giải nó
 * phía máy chủ (`AGENTS.md`, quy ước tenant).
 */

/** Tên header mang JWT phiên liên-app (`alg_sso`) khi gọi server-to-server. */
export const SSO_HEADER = "x-alg-sso"
/** Tên trước khi đổi thương hiệu ALG (12/11/2026) và trước nữa — vẫn đọc, và vẫn gửi kèm cho ứng dụng liên kết chưa cập nhật. */
export const LEGACY_SSO_HEADERS = ["x-smeos-sso", "x-floraos-sso"] as const

export type IntegrationCredential =
  | { readonly kind: "sso"; readonly value: string }
  | { readonly kind: "token"; readonly value: string }

type HeaderReader = { get(name: string): string | null }

function bearerFrom(headers: HeaderReader): string | null {
  const header = headers.get("authorization")
  if (!header) return null
  const match = /^Bearer\s+(.+)$/.exec(header)
  const raw = match?.[1]?.trim()
  return raw ? raw : null
}

/** `null` khi lời gọi không mang chứng thư nào đọc được. */
export function readIntegrationCredential(headers: HeaderReader): IntegrationCredential | null {
  const sso = [SSO_HEADER, ...LEGACY_SSO_HEADERS].map((h) => headers.get(h)?.trim()).find((v) => v)
  if (sso) return { kind: "sso", value: sso }

  const token = bearerFrom(headers)
  if (token) return { kind: "token", value: token }

  return null
}
