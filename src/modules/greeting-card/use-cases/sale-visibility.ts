import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { UserRepository, getUserRepository } from "@/modules/organization/infra/user-repository"
import { CapabilityRepository, getCapabilityRepository } from "@/modules/organization/infra/capability-repository"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { updateCurrentOrganization } from "@/modules/organization/use-cases/update-current-organization"
import { GREETING_CARD_CAPABILITY } from "../domain/greeting-card-capabilities"
import {
  VISIBILITY_SETTINGS_KEY, alwaysSeesAll, parseVisibility,
  type VisibilityMode, type VisibilitySettings,
} from "../domain/order-visibility"

export interface SaleVisibilityMember {
  userId: string
  name: string
  roleName: string
  /** Chọn riêng cho người này; `null` = theo mặc định. */
  mode: VisibilityMode | null
}

export interface SaleVisibilityView {
  defaultMode: VisibilityMode
  members: SaleVisibilityMember[]
}

/** Nhân viên bán hàng thuần (gửi được link, không có quyền luôn-thấy-tất-cả) đang hoạt động. */
async function listSales(ctx: TenantContext): Promise<Array<Omit<SaleVisibilityMember, "mode">>> {
  const roles = getRoleRepository()
  const caps = getCapabilityRepository()
  const users = getUserRepository()
  const rows = (await getMembershipRepository().list(ctx)).filter((m) => m.status === "ACTIVE")
  const out = await Promise.all(rows.map(async (m) => {
    const role = await roles.findAssignableById(ctx, m.role_id)
    if (!role) return null
    const grants = new Set((await caps.resolveGrants(ctx.organizationId, role.id, role.key)).map((g) => g.code))
    if (!grants.has(GREETING_CARD_CAPABILITY.manage) || alwaysSeesAll(grants)) return null
    const user = await users.findById(m.user_id)
    return { userId: m.user_id, name: user?.name?.trim() || user?.email.split("@")[0] || "Nhân viên", roleName: role.name }
  }))
  return out.filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => a.name.localeCompare(b.name, "vi"))
}

export async function getSaleVisibility(ctx: TenantContext): Promise<SaleVisibilityView> {
  const vis = parseVisibility((await getCurrentOrganization(ctx))?.settings)
  const sales = await listSales(ctx)
  return { defaultMode: vis.mode, members: sales.map((s) => ({ ...s, mode: vis.members[s.userId] ?? null })) }
}

/**
 * Đổi mặc định (`userId` vắng) hoặc chọn riêng cho một sale (`mode: null` = bỏ chọn riêng).
 * Ghi cả khối `brochure_visibility` vì cài đặt tổ chức hợp nhất nông theo khoá.
 */
export async function setSaleVisibility(
  ctx: TenantContext,
  input: { userId?: string | undefined; mode: VisibilityMode | null },
): Promise<SaleVisibilityView> {
  const vis: VisibilitySettings = parseVisibility((await getCurrentOrganization(ctx))?.settings)
  if (!input.userId) {
    if (input.mode) vis.mode = input.mode
  } else {
    const sales = await listSales(ctx)
    // Người ngoài tổ chức / không phải sale → 404, không lộ là có tồn tại
    if (!sales.some((s) => s.userId === input.userId)) throw notFound()
    if (input.mode) vis.members[input.userId] = input.mode
    else delete vis.members[input.userId]
  }
  await updateCurrentOrganization(ctx, { settings: { [VISIBILITY_SETTINGS_KEY]: vis } })
  return getSaleVisibility(ctx)
}
