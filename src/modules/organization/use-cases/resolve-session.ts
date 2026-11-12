import { AppError, sessionSuperseded, unauthenticated } from "@/core/http/errors"
import { asSystemDb, bindTenantDb } from "@/core/tenancy/db-context"
import { readCookie, SESSION_COOKIE } from "@/core/http/cookies"
import { bindRequestActor } from "@/core/observability/request-context"
import type { TenantContext } from "@/core/tenancy"
import { canSignIn } from "@/modules/organization/domain/account-approval"
import { isUsable } from "@/modules/organization/domain/session-policy"
import type { memberships, sessions, users } from "@/modules/organization/infra/entities"
import { CapabilityRepository } from "@/modules/organization/infra/capability-repository"
import { MembershipRepository } from "@/modules/organization/infra/membership-repository"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { SessionRepository } from "@/modules/organization/infra/session-repository"
import { hashSessionToken } from "@/modules/organization/infra/session-token"
import { UserRepository } from "@/modules/organization/infra/user-repository"
import { WorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { checkSubscription } from "@/modules/subscription/use-cases/subscription-guard"
import { assertOrganizationLifecycle } from "./assert-organization-lifecycle"
import { lockedToolForPath, toolForPath, unlockedToolsFrom } from "@/modules/organization/domain/tool-route-entitlement"

export type ResolvedSession = {
  readonly user: users
  readonly session: sessions
  readonly membership: memberships | null
  /** null khi phiên chưa gắn với tổ chức nào — người dùng phải chọn trước. */
  readonly ctx: TenantContext | null
}

export function sessionTokenFrom(request: Request): string | null {
  return readCookie(request, SESSION_COOKIE)
}

/**
 * Giải ngữ cảnh một lần ở biên, từ `sessions.organization_id` phía máy chủ
 * (`YC-T2`). Không lớp nào bên dưới đi tìm lại `organization_id`, và không
 * đường nào nhận nó từ body, query hay header của client.
 */
/** Tra phiên theo mã phiên — chưa biết tổ chức nên chạy quyền hệ thống (RLS, checklist ALG 1.18). */
export async function resolveSession(request: Request): Promise<ResolvedSession> {
  return asSystemDb("session", () => resolveSessionUnscoped(request))
}

async function resolveSessionUnscoped(request: Request): Promise<ResolvedSession> {
  const token = sessionTokenFrom(request)
  if (!token) throw unauthenticated()

  const sessions = new SessionRepository()
  const session = await sessions.findByTokenHash(hashSessionToken(token))
  if (!session) throw unauthenticated()
  if (!isUsable(session, new Date())) {
    // Phiên bị thay bởi lần đăng nhập ở thiết bị khác → lý do riêng để giao
    // diện hiện cảnh báo thay vì lặng lẽ đẩy về trang đăng nhập.
    if (await sessions.wasSupersededByNewLogin(session)) throw sessionSuperseded()
    throw unauthenticated()
  }

  const user = await new UserRepository().findById(session.user_id)
  // Tài khoản chưa duyệt / bị từ chối không dùng được phiên nào (kể cả phiên cũ khi bị thu quyền)
  if (!user || !canSignIn(user.approval_status)) throw unauthenticated()

  if (!session.organization_id) {
    return { user, session, membership: null, ctx: null }
  }

  const resolved = await tenantContextFor(user.id, session.organization_id)
  if (!resolved) {
    return { user, session, membership: null, ctx: null }
  }

  return { user, session, membership: resolved.membership, ctx: resolved.ctx }
}

/**
 * Dựng `TenantContext` đầy đủ cho một cặp (người dùng, tổ chức) — tách khỏi
 * `resolveSession` để dùng lại cho đường danh tính KHÁC cookie phiên: JWT
 * `floraos_sso` mà `LocalBudd`/`SocialFlow` chuyển tiếp vào
 * `/api/v1/integration/*` (xem `modules/integration/use-cases/
 * resolve-integration-context.ts`).
 *
 * `null` = người này không còn là thành viên `ACTIVE` của tổ chức đó. Bên gọi
 * quyết định điều đó nghĩa là gì: `resolveSession` trả phiên chưa gắn tổ chức,
 * còn đường tích hợp trả `UNAUTHENTICATED`.
 *
 * `organizationId` LUÔN đến từ nguồn phía máy chủ đã xác minh (bản ghi
 * `sessions`, hoặc chữ ký JWT do chính core ký) — không bao giờ từ body/query.
 */
export async function tenantContextFor(
  userId: string,
  organizationId: string
): Promise<{ ctx: TenantContext; membership: memberships } | null> {
  // Tư cách thành viên kiểm lại ở mỗi lần giải ngữ cảnh: người bị gỡ khỏi tổ
  // chức mất quyền đọc ngay, không phải chờ phiên hết hạn.
  const membership = await new MembershipRepository().findForUserInOrganization(
    userId,
    organizationId
  )
  if (!membership || membership.status !== "ACTIVE") return null

  const workspace = await new WorkspaceRepository().findDefaultForSessionOrganization(
    organizationId
  )
  if (!workspace) {
    throw new AppError("INTERNAL", "Tổ chức không có workspace nào")
  }

  const role = await new RoleRepository().findAssignableByIdForOrganization(
    organizationId,
    membership.role_id
  )
  if (!role) {
    throw new AppError("INTERNAL", "Tư cách thành viên trỏ tới một vai không còn tồn tại")
  }

  // Ba lớp quyền tính một lần ở biên (đặc tả 02 mục 1): switchboard của vai,
  // đè bằng ngoại lệ của tổ chức, rồi trần cứng cắt sau cùng. `ctx.capabilities`
  // là kết quả cuối, chỉ còn việc `hasCapability`/`requireCapability` tra cứu.
  const grants = await new CapabilityRepository().resolveGrants(organizationId, role.id, role.key)

  return {
    ctx: {
      organizationId,
      workspaceId: workspace.id,
      userId,
      branchId: membership.branch_id,
      capabilities: new Set(grants.map((grant) => grant.code)),
      grants: new Map(grants.map((grant) => [grant.code, grant.scope])), // ADR-012 D-T7 (T-5)
    },
    membership,
  }
}

/** Đường duy nhất mở cho tài khoản còn mật khẩu tạm (`/auth/me`, đăng xuất không qua `requireTenantContext`). */
const PASSWORD_CHANGE_PATH = "/api/v1/session/password"

/** Dùng cho endpoint bắt buộc phải có tổ chức đang hoạt động. */
export async function requireTenantContext(
  request: Request
): Promise<{ resolved: ResolvedSession; ctx: TenantContext }> {
  const resolved = await resolveSession(request)
  if (!resolved.ctx) {
    throw new AppError("CONFLICT", "Phiên chưa chọn tổ chức đang hoạt động")
  }
  // Người thao tác đã xác thực → nhật ký tầng HTTP biết ai làm (checklist ALG 1.15, 1.17)
  bindRequestActor({ organizationId: resolved.ctx.organizationId, userId: resolved.ctx.userId })
  // Từ đây mọi truy vấn của request chạy trong tổ chức đã xác thực (RLS, checklist ALG 1.18)
  bindTenantDb(resolved.ctx.organizationId)
  // Đang dùng mật khẩu tạm → chỉ được đổi mật khẩu (checklist ALG 1.4)
  if (resolved.user.must_change_password && new URL(request.url).pathname !== PASSWORD_CHANGE_PATH) {
    throw new AppError("PASSWORD_CHANGE_REQUIRED", "Tài khoản đang dùng mật khẩu tạm — đổi mật khẩu trước khi tiếp tục")
  }
  await assertOrganizationLifecycle(resolved.ctx.organizationId, request.method) // ADR-016 D-S5
  await assertToolUnlocked(request, resolved.ctx)
  await assertSubscriptionWritable(request, resolved.ctx)
  return { resolved, ctx: resolved.ctx }
}

/** Gói quá hạn thanh toán → mọi yêu cầu ghi bị chặn, vẫn xem được dữ liệu (checklist ALG 10.7, PO Q9). */
async function assertSubscriptionWritable(request: Request, ctx: TenantContext): Promise<void> {
  const state = await checkSubscription(ctx.organizationId)
  if (!state.readOnly || READ_METHODS.has(request.method.toUpperCase())) return
  if (new URL(request.url).pathname === PASSWORD_CHANGE_PATH) return
  throw new AppError("SUBSCRIPTION_OVERDUE", "Gói dịch vụ quá hạn thanh toán — tài khoản đang ở chế độ chỉ xem. Thanh toán hoá đơn để mở lại.")
}

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * API riêng của công cụ mà cấp trên chưa mở khoá cho tổ chức → 403 ENTITLEMENT_REQUIRED.
 * Chỉ đọc settings khi đường dẫn thuộc một công cụ, để các API khác không tốn thêm truy vấn.
 */
async function assertToolUnlocked(request: Request, ctx: TenantContext): Promise<void> {
  const pathname = new URL(request.url).pathname
  if (!toolForPath(pathname)) return
  const org = await new OrganizationRepository().findById(ctx.organizationId)
  const locked = lockedToolForPath(pathname, unlockedToolsFrom(org?.settings))
  if (locked) {
    throw new AppError("ENTITLEMENT_REQUIRED", "Công cụ này chưa được cấp quản lý mở cho cửa hàng", { tool: locked })
  }
}
