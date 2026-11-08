import { AsyncLocalStorage } from "node:async_hooks"

/**
 * Ngữ cảnh CSDL của luồng đang chạy (ADR-013 D-I3, checklist ALG 1.18). Pool kết nối đọc ngữ cảnh này
 * để đặt `app.org_id` trước mỗi truy vấn; chính sách RLS của CSDL so `organization_id` với giá trị đó.
 *
 * - `tenant`: đã xác thực, thuộc một tổ chức — nguồn duy nhất là `requireTenantContext()` (non-negotiable #2).
 * - `system`: luồng hợp lệ không thuộc một tổ chức (trang công khai tra theo mã, xác thực phiên,
 *   Console nền tảng, webhook, bộ quét nền). Chỉ khai bằng `asSystemDb` hoặc theo nhóm đường dẫn.
 * - `pending`: request chưa gắn tổ chức — truy vấn bảng thuộc tổ chức lúc này là truy vấn bị chặn.
 * Ngoài mọi ngữ cảnh (trang server, script) = chưa phân loại: chạy như cũ, chế độ ghi nhận ghi log.
 */
export type DbContextKind = "tenant" | "system" | "pending"

export interface DbContext {
  kind: DbContextKind
  organizationId?: string | undefined
  /** Lý do chạy quyền hệ thống — hiện trong log, giúp rà soát */
  label?: string | undefined
  /** Đường dẫn request — để log ghi nhận chỉ ra chỗ cần sửa */
  route?: string | undefined
}

const store = new AsyncLocalStorage<DbContext>()

/**
 * Truy vấn Prisma chỉ chạy khi được `await` — `fn` trả thẳng một truy vấn thì phải chờ NGAY trong ngữ cảnh,
 * không thì truy vấn chạy ở luồng của người gọi (ngoài ngữ cảnh).
 */
function settleInside<T>(fn: () => T): T {
  const result = fn()
  const thenable = result && typeof (result as { then?: unknown }).then === "function"
  return (thenable ? (async () => await result)() : result) as T
}

export function currentDbContext(): Readonly<DbContext> | undefined {
  return store.getStore()
}

/** `handle()` mở một ngữ cảnh riêng cho mỗi request (đối tượng mutable để `requireTenantContext` gắn tổ chức). */
export function runWithDbContext<T>(initial: DbContext, fn: () => T): T {
  return store.run({ ...initial }, () => settleInside(fn))
}

/** Gắn tổ chức đã xác thực vào ngữ cảnh request hiện tại. Không làm gì nếu đang ngoài request. */
export function bindTenantDb(organizationId: string): void {
  const ctx = store.getStore()
  if (!ctx || ctx.kind === "system") return
  ctx.kind = "tenant"
  ctx.organizationId = organizationId
}

/** Chạy `fn` với tổ chức `organizationId` (job nền của một tổ chức, test). */
export function withTenantDb<T>(organizationId: string, fn: () => T): T {
  return store.run({ kind: "tenant", organizationId }, () => settleInside(fn))
}

/** Chạy `fn` bằng quyền hệ thống — bỏ qua RLS. Mỗi chỗ gọi là một quyết định có lý do (`label`). */
export function asSystemDb<T>(label: string, fn: () => T): T {
  return store.run({ kind: "system", label }, () => settleInside(fn))
}

/** Nhóm đường dẫn không thuộc một tổ chức: chạy quyền hệ thống ngay từ đầu request. */
const SYSTEM_PATH_PREFIXES = [
  "/api/v1/public/", "/api/v1/platform/", "/api/v1/auth/", "/api/v1/internal/", "/api/v1/billing/",
  "/api/v1/sso/", "/api/v1/chat/webhooks/", "/api/v1/chat/public/", "/api/v1/storage/", "/api/health", "/api/dev/",
] as const

/**
 * Chọn/tạo tổ chức của chính người dùng: đọc thành viên ở nhiều tổ chức trước khi có tổ chức đang hoạt động.
 * Route Console nằm ngoài `/api/v1/platform/` (gác `requirePlatformContext`) cũng khai ở đây — test kiến trúc
 * `rls-policies.test.ts` đòi mọi route gọi `requirePlatformContext` chạy quyền hệ thống (I-5, 07/11/2026).
 */
const SYSTEM_EXACT_PATHS = new Set([
  "/api/v1/organizations",
  "/api/v1/session/organization",
  "/api/v1/greeting-card/integrations/staff-notifications/saas-policy",
])

export function dbContextForPath(pathname: string): DbContext {
  if (SYSTEM_EXACT_PATHS.has(pathname)) return { kind: "system", label: `route:${pathname}`, route: pathname }
  const prefix = SYSTEM_PATH_PREFIXES.find((p) => pathname.startsWith(p))
  return prefix ? { kind: "system", label: `route:${prefix}`, route: pathname } : { kind: "pending", route: pathname }
}
