import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import { SESSION_COOKIE } from "@/core/http/cookies"
import { WorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { recomputePrimaryLink } from "@/modules/organization/infra/organization-links"
import { signUp } from "@/modules/organization/use-cases/sign-up"
import { SSO_HEADER } from "@/modules/integration/domain/integration-credential"
import { ssoClaimsFor } from "@/modules/sso/domain/sso-claims"
import { signSsoToken } from "@/modules/sso/infra/sso-jwt"

export type Tenant = {
  readonly organizationId: string
  readonly userId: string
  readonly token: string
  readonly ctx: TenantContext
}

/** Mật khẩu dùng chung của tài khoản thử trong bộ test (không phải mật khẩu thật). */
export const TEST_PASSWORD = "mat-khau-du-dai"

/**
 * Dựng một tổ chức hoàn chỉnh qua đúng luồng đăng ký thật, để bộ test cách ly
 * chạy trên dữ liệu do chính hệ thống sinh ra chứ không do test cấy vào.
 */
export async function createTenant(label: string): Promise<Tenant> {
  const result = await signUp({
    email: `${label}@vi-du.test`,
    password: TEST_PASSWORD,
    name: `Người dùng ${label}`,
    organizationName: `Tiệm hoa ${label}`,
  })

  if (!result.token) throw new Error("Fixture tạo tài khoản đã duyệt nên phải có phiên")
  const workspace = await new WorkspaceRepository().findDefaultForSessionOrganization(
    result.organizationId
  )
  if (!workspace) throw new Error("Đăng ký không tạo workspace")

  const { randomUUID } = await import("node:crypto")
  const { prisma } = await import("@/core/tenancy/infra/prisma")
  const { newSessionToken, hashSessionToken } = await import("@/modules/organization/infra/session-token")
  const { expiresAt } = await import("@/modules/organization/domain/session-policy")

  await prisma.memberships.updateMany({
    where: { user_id: result.userId, organization_id: result.organizationId },
    data: { status: "ACTIVE" },
  })

  const token = newSessionToken()
  const now = new Date()
  await prisma.sessions.create({
    data: {
      id: randomUUID(),
      user_id: result.userId,
      token_hash: hashSessionToken(token),
      organization_id: result.organizationId,
      expires_at: expiresAt(now),
      created_at: now,
    },
  })

  return {
    organizationId: result.organizationId,
    userId: result.userId,
    token,
    ctx: {
      organizationId: result.organizationId,
      workspaceId: workspace.id,
      userId: result.userId,
      branchId: null,
      capabilities: new Set<string>(),
    },
  }
}

export function withSession(url: string, token: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers)
  headers.set("cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}`)
  if (init?.body) headers.set("content-type", "application/json")
  return new Request(url, { ...init, headers })
}

/**
 * Cùng vai trò với `withSession` nhưng cho token máy gọi máy (P7, `YC-T8`) —
 * `Authorization: Bearer`, không phải cookie phiên. Dùng để gọi thẳng
 * `/api/v1/integration/*` trong test cách ly tenant.
 */
export function withBearer(url: string, token: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers)
  headers.set("authorization", `Bearer ${token}`)
  if (init?.body) headers.set("content-type", "application/json")
  return new Request(url, { ...init, headers })
}

/**
 * Lời gọi `/api/v1/integration/*` THAY MẶT một người dùng — JWT `floraos_sso`
 * chuyển tiếp trong header `X-FloraOS-SSO`, đúng cách `LocalBudd`/`SocialFlow`
 * gọi từ backend của chúng. Ký bằng chính `signSsoToken` của core để test
 * khoá luôn cả khuôn JWT, không tự chế một chuỗi giả.
 */
export function withSso(
  url: string,
  input: { userId: string; organizationId: string | null; email?: string | null },
  init?: RequestInit
): Request {
  const token = signSsoToken(
    ssoClaimsFor({
      userId: input.userId,
      organizationId: input.organizationId,
      email: input.email ?? null,
      now: new Date(),
    })
  )
  const headers = new Headers(init?.headers)
  headers.set(SSO_HEADER, token)
  if (init?.body) headers.set("content-type", "application/json")
  return new Request(url, { ...init, headers })
}

export async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

/**
 * Thêm một nhân viên ĐANG HOẠT ĐỘNG vào tổ chức với vai hệ thống `roleKey`, kèm phiên đăng nhập
 * thật (cookie) — để gọi thẳng route và để máy chủ tự suy năng lực từ vai, không cấy năng lực tay.
 */
export async function addStaffWithSession(
  tenant: Tenant,
  roleKey: import("@/modules/organization/domain/system-roles").SystemRoleKey,
  label: string
): Promise<{ userId: string; token: string; email: string }> {
  const { randomUUID } = await import("node:crypto")
  const { RoleRepository } = await import("@/modules/organization/infra/role-repository")
  const { newSessionToken, hashSessionToken } = await import("@/modules/organization/infra/session-token")
  const { expiresAt } = await import("@/modules/organization/domain/session-policy")
  const role = await new RoleRepository().findSystemRoleByKey(roleKey)
  if (!role) throw new Error(`Thiếu vai hệ thống ${roleKey}`)
  const email = `${label}-${randomUUID().slice(0, 8)}@vi-du.test`
  const user = await prisma.users.create({ data: { id: randomUUID(), email, name: label } })
  await prisma.memberships.create({
    data: { id: randomUUID(), organization_id: tenant.organizationId, user_id: user.id, role_id: role.id, status: "ACTIVE", joined_at: new Date() },
  })
  const token = newSessionToken()
  await prisma.sessions.create({
    data: { user_id: user.id, token_hash: hashSessionToken(token), organization_id: tenant.organizationId, expires_at: expiresAt(new Date()) },
  })
  return { userId: user.id, token, email }
}

/**
 * Chuyển tổ chức sang mô hình Chuỗi — như Admin SaaS duyệt yêu cầu đổi mô hình. Tính năng điều phối
 * chuỗi (mời chi nhánh, nhập chi nhánh) chỉ mở cho loại CHAIN (PO 22/10/2026; FLOWER_NETWORK gộp vào — ADR-012 T-8b).
 */
export async function makeChainOrganization(tenant: Tenant): Promise<void> {
  await prisma.organizations.update({ where: { id: tenant.organizationId }, data: { type: "CHAIN" } })
}

/**
 * Liên kết chuỗi → cửa hàng đối tác như đường ghi thật: một dòng `organization_links` rồi đặt lại cạnh chính
 * (ADR-012 T-3b). Trả id liên kết.
 */
export async function linkPartner(
  chain: Tenant,
  partner: Tenant,
  opts: { code: string; status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED"; createdAt?: Date },
): Promise<string> {
  const row = await prisma.organization_links.create({
    data: {
      parent_org_id: chain.organizationId,
      child_org_id: partner.organizationId,
      partner_code: opts.code,
      status: opts.status ?? "ACTIVE",
      ...(opts.createdAt ? { created_at: opts.createdAt, valid_from: opts.createdAt } : {}),
    },
  })
  await recomputePrimaryLink(prisma, partner.organizationId)
  return row.id
}

/** Chi nhánh nhận đơn điều phối chuỗi: dòng `branches` có `accepts_dispatch` (ADR-012 T-4c). Trả `branches.id`. */
export async function seedChainBranch(tenant: Tenant, code: string, name: string): Promise<string> {
  const row = await prisma.branches.create({ data: { organization_id: tenant.organizationId, code, name, accepts_dispatch: true } })
  return row.id
}
