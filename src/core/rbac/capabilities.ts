import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"

/**
 * Cổng năng lực — `hasCapability`/`requireCapability` chỉ tra cứu một tập đã
 * tính sẵn, không tự đi tính. `TenantContext.capabilities` được nạp ở
 * `resolve-session.ts`, kết quả của ba lớp (`src/core/rbac/capability-catalog.ts`,
 * `permission-resolver.ts`, `src/modules/organization/infra/capability-repository.ts`)
 * — xem `src/core/rbac/README.md` và `docs/dac-ta/02-function-catalog.md`.
 *
 * Trước P2, `TenantContext.capabilities` luôn rỗng nên hàm này từ chối mọi
 * mã — trạng thái đúng của một cổng chưa có bảng quyền: chặn hết, không mở
 * tạm.
 *
 * Kiểm bằng mã năng lực, không bằng vai giao diện. Không có `if (role === …)`
 * ở bất kỳ đâu (`YC-Q7`).
 */
export function hasCapability(ctx: TenantContext, code: string): boolean {
  return ctx.capabilities.has(code)
}

export function requireCapability(ctx: TenantContext, code: string): void {
  if (hasCapability(ctx, code)) return
  throw new AppError("CAPABILITY_DENIED", `Thiếu năng lực ${code}`, {
    capability: code,
  })
}
