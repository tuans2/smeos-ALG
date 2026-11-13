import { randomBytes } from "node:crypto"

import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { conflict, validationFailed } from "@/core/http/errors"
import { isValidEmail, normalizeEmail } from "@/modules/organization/domain/credentials"
import { FOUNDER_ROLE_KEY } from "@/modules/organization/domain/system-roles"
import { slugCandidates } from "@/modules/organization/domain/slug"
import { ALL_INDUSTRY_KEYS } from "@/modules/organization/domain/industry-profile"
import { getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { hashPassword } from "@/modules/organization/infra/password-hasher"
import { getRoleRepository } from "@/modules/organization/infra/role-repository"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { getUserRepository } from "@/modules/organization/infra/user-repository"
import { OccasionRepository } from "@/modules/organization/infra/occasion-repository"
import { getWorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { markInvoicePaid, upsertSubscription } from "@/modules/subscription/infra/subscription-repository"
import { isPlanCode, type SubscriptionCycle } from "@/modules/subscription/domain/subscription-rules"

/**
 * Console tạo tổ chức mới (checklist ALG 9.10, `N7`; gán gói cần thêm `N19`): cửa hàng (ngành), workspace vận hành,
 * tài khoản chủ tiệm vai Điều hành với mật khẩu tạm — buộc đổi ở lần đăng nhập đầu (1.4) — và gói thuê bao (10.7).
 * Mật khẩu tạm chỉ trả về một lần trong phản hồi, không ghi vào nhật ký.
 */

export interface CreateOrganizationInput {
  organizationName: string
  ownerEmail: string
  ownerName?: string | undefined
  industry?: string | undefined
  subscription?: { plan: string; cycle: SubscriptionCycle; priceVnd: number; includedCreditsMonthly: number; firstPeriodPaid?: boolean | undefined } | undefined
}

export async function createOrganizationFromConsole(pctx: PlatformContext, input: CreateOrganizationInput) {
  requirePlatformCapability(pctx, "N7")
  if (input.subscription) requirePlatformCapability(pctx, "N19")
  const name = input.organizationName.trim()
  const email = normalizeEmail(input.ownerEmail)
  if (!name) throw validationFailed({ organizationName: "Cần tên cửa hàng" })
  if (!isValidEmail(email)) throw validationFailed({ ownerEmail: "Địa chỉ thư không hợp lệ" })
  const industry = input.industry ?? "FLORAL"
  if (!(ALL_INDUSTRY_KEYS as readonly string[]).includes(industry)) throw validationFailed({ industry: "Ngành không hợp lệ" })
  if (input.subscription && !isPlanCode(input.subscription.plan)) throw validationFailed({ plan: "Gói không hợp lệ" })

  const temporaryPassword = randomBytes(12).toString("base64url")
  const passwordHash = await hashPassword(temporaryPassword)
  const now = new Date()

  const created = await runInTransaction(async (tx) => {
    const users = getUserRepository(tx)
    if (await users.findByEmail(email)) throw conflict("Địa chỉ thư này đã có tài khoản")
    const user = await users.create({ email, password_hash: passwordHash, name: input.ownerName?.trim() || null, must_change_password: true })
    const organizations = getOrganizationRepository(tx)
    let slug: string | null = null
    for (const candidate of slugCandidates(name)) {
      if (await organizations.findBySlug(candidate)) continue
      slug = candidate
      break
    }
    if (!slug) throw conflict("Không sinh được định danh cho tên cửa hàng này")
    const organization = await organizations.create({ name, slug, type: "SINGLE", credit_balance: 0, settings: { industry, industry_locked: true } })
    const workspace = await getWorkspaceRepository(tx).createForNewOrganization({ organizationId: organization.id, name, kind: "PRODUCTION", trial_limit: null, trial_status: null })
    // Danh mục dịp mặc định như cửa hàng tự đăng ký (checklist ALG 1.7)
    await new OccasionRepository(tx).seedDefault({ organizationId: organization.id, workspaceId: workspace.id, userId: user.id, branchId: null, capabilities: new Set<string>() })
    const founderRole = await getRoleRepository(tx).findSystemRoleByKey(FOUNDER_ROLE_KEY)
    if (!founderRole) throw new Error(`Thiếu vai hệ thống ${FOUNDER_ROLE_KEY}. Chạy \`npm run db:seed\`.`)
    await getMembershipRepository(tx).createForNewOrganization({ organizationId: organization.id, userId: user.id, roleId: founderRole.id, status: "ACTIVE", joinedAt: now })
    if (input.subscription) {
      const { firstInvoice } = await upsertSubscription(tx, organization.id, { ...input.subscription, actorId: pctx.userId, now })
      if (firstInvoice && (input.subscription.firstPeriodPaid || input.subscription.priceVnd === 0)) await markInvoicePaid(tx, firstInvoice.id, `CONSOLE-${organization.id}`, now)
    }
    return { organizationId: organization.id, slug, userId: user.id }
  })

  await recordPlatformAuditLog(pctx, {
    action: "platform.organization.create", entityType: "organizations", entityId: created.organizationId, before: null,
    after: { name, slug: created.slug, industry, ownerUserId: created.userId, plan: input.subscription?.plan ?? null },
  })
  return { ...created, ownerEmail: email, temporaryPassword }
}
