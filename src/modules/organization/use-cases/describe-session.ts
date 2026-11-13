import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { WorkspaceRepository, getWorkspaceRepository } from "@/modules/organization/infra/workspace-repository"

import type { ResolvedSession } from "./resolve-session"

export type SessionDescription = {
  /** `mustChangePassword`: đang dùng mật khẩu tạm, giao diện bắt đổi trước khi dùng (checklist ALG 1.4). */
  user: { id: string; name: string | null; email: string; mustChangePassword: boolean }
  organization: {
    id: string
    name: string
    slug: string
    type: string
    industry: string
    industry_locked: boolean
    /** Danh sách công cụ được cấp trên (Chuỗi/Ngành) phê duyệt mở khóa (Whitelist) */
    unlocked_tools?: string[] | null
    /** Yêu cầu đổi mô hình tổ chức đang chờ Admin SaaS duyệt (banner trong app). */
    pending_model_change: unknown
  } | null
  workspace: { id: string; kind: string } | null
  membership: { role_key: string | null; branch_id: string | null } | null
  capabilities: string[]
  credit_balance: number | null
}

function publicSettingsOf(settings: unknown) {
  const s = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const unlocked = Array.isArray(s.unlocked_tools)
    ? (s.unlocked_tools as unknown[]).filter((x): x is string => typeof x === "string")
    : null

  return {
    industry: typeof s.industry === "string" ? s.industry : "FLORAL",
    industry_locked: Boolean(s.industry_locked),
    unlocked_tools: unlocked,
    pending_model_change: s.pending_model_change ?? null,
  }
}

/**
 * Nội dung của `GET /auth/me` (đặc tả 06 mục 3).
 *
 * `capabilities` là danh sách mã đã tính sẵn cho phiên hiện tại — ba lớp quyền
 * (`src/core/rbac/`) đã chạy xong ở `resolveSession`, đây chỉ đọc lại kết quả.
 * Giao diện đọc nó để ẩn hiện nút; máy chủ vẫn kiểm lại ở mọi endpoint —
 * giao diện ẩn nút không phải là phép kiểm quyền.
 */
export async function describeSession(
  resolved: ResolvedSession
): Promise<SessionDescription> {
  const ctx = resolved.ctx
  const base = {
    user: { id: resolved.user.id, name: resolved.user.name, email: resolved.user.email, mustChangePassword: resolved.user.must_change_password },
    // Danh sách mã đã tính sẵn cho phiên hiện tại (đặc tả 06 mục 3). Giao
    // diện đọc để ẩn hiện nút; máy chủ vẫn kiểm lại ở mọi endpoint.
    capabilities: ctx ? Array.from(ctx.capabilities).sort() : ([] as string[]),
  }

  if (!ctx || !resolved.membership) {
    return {
      ...base,
      organization: null,
      workspace: null,
      membership: null,
      credit_balance: null,
    }
  }

  const organization = await getOrganizationRepository().current(ctx)
  const workspace = await getWorkspaceRepository().findById(ctx, ctx.workspaceId)
  const role = await getRoleRepository().findAssignableById(ctx, resolved.membership.role_id)

  return {
    ...base,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
          // Chỉ ngành và yêu cầu đổi mô hình — trước đây trả nguyên `settings` (SĐT điều phối, chat id, chính sách phí)
          // cho mọi thành viên, kể cả vai thấp nhất (rà soát lại cụm A, 23/10/2026)
          ...publicSettingsOf(organization.settings),
        }
      : null,
    workspace: workspace ? { id: workspace.id, kind: workspace.kind } : null,
    membership: { role_key: role?.key ?? null, branch_id: resolved.membership.branch_id },
    credit_balance: organization?.credit_balance ?? null,
  }
}
