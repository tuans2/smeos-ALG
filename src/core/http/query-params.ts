import { validationFailed } from "./errors"

/**
 * Đọc tham số query là một giá trị enum. Thiếu hoặc rỗng → `undefined`;
 * ngoài danh sách cho phép → 400 (thay vì để Prisma ném lỗi enum thành 500).
 */
export function enumParam<T extends string>(url: URL, name: string, allowed: readonly T[]): T | undefined {
  const raw = url.searchParams.get(name)
  if (raw === null || raw === "") return undefined
  if ((allowed as readonly string[]).includes(raw)) return raw as T
  throw validationFailed({ [name]: `Phải là một trong: ${allowed.join(", ")}` })
}
