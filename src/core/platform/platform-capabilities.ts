import { AppError } from "@/core/http/errors"
import type { PlatformContext } from "./platform-context"
import { isPlatformCapabilityCode } from "./platform-capability-catalog"

/**
 * Cổng năng lực nền tảng — đối xứng với `hasCapability`/`requireCapability`
 * của tenant (`src/core/rbac/capabilities.ts`) nhưng nhận `PlatformContext`,
 * một kiểu khác hẳn `TenantContext` (D-N6). Hai cổng không thể gọi nhầm
 * nhau: truyền `TenantContext` vào đây không biên dịch được vì thiếu
 * `capabilities` đúng kiểu, và ngược lại `PlatformContext` không có
 * `organizationId` mà `requireCapability` không cần tới nó nên lỗi không
 * lộ ra ở đó — sự tách biệt thật nằm ở chỗ không route nào gọi cả hai cổng
 * trên cùng một ngữ cảnh (xem `resolve-platform-session.ts`).
 */
export function hasPlatformCapability(pctx: PlatformContext, code: string): boolean {
  return pctx.capabilities.has(code)
}

export function requirePlatformCapability(pctx: PlatformContext, code: string): void {
  if (!isPlatformCapabilityCode(code)) {
    throw new Error(`Mã năng lực nền tảng không tồn tại: ${code}`)
  }
  if (hasPlatformCapability(pctx, code)) return
  throw new AppError("CAPABILITY_DENIED", `Thiếu năng lực nền tảng ${code}`, {
    capability: code,
  })
}
