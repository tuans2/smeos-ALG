import { AppError, validationFailed, conflict } from "@/core/http/errors"
import { isValidEmail, normalizeEmail } from "@/modules/organization/domain/credentials"
import {
  DEFAULT_WORKSPACE_NAME,
  TRIAL_CREDIT_BALANCE,
  TRIAL_LIMIT,
} from "@/modules/organization/domain/experience"
import { slugCandidates } from "@/modules/organization/domain/slug"
import { FOUNDER_ROLE_KEY } from "@/modules/organization/domain/system-roles"
import { MembershipRepository } from "@/modules/organization/infra/membership-repository"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { hashPassword } from "@/modules/organization/infra/password-hasher"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { OccasionRepository } from "@/modules/organization/infra/occasion-repository"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { UserRepository } from "@/modules/organization/infra/user-repository"
import { WorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { seedExperienceMasterProfile } from "@/modules/profiles/use-cases/seed-experience-profile"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { seedSampleProductsForIndustry } from "@/modules/organization/infra/sample-product-seeder"
import crypto from "crypto"

export type InstantTrialInput = {
  name: string
  phone: string
  email: string
  industryKey?: string | undefined
}

export type InstantTrialResult = {
  userId: string
  organizationId: string
  organizationName: string
  industryKey: string
}

/**
 * Trải nghiệm dùng thử tức thì (Instant Demo Sandbox with Lead Capture).
 * Người dùng KHÔNG cần tạo mật khẩu, chỉ cần để lại thông tin liên hệ (Lead)
 * và chọn ngành nghề muốn xem thử.
 *
 * Hệ thống tự động cấp môi trường Sandbox EXPERIENCE có sẵn đầy đủ:
 * - Hồ sơ cửa hàng mẫu đúng ngành nghề
 * - Sản phẩm mẫu đúng ngành nghề
 * - 50 lượt trải nghiệm AI và tính năng vận hành
 */
export async function startInstantTrial(input: InstantTrialInput): Promise<InstantTrialResult> {
  const email = normalizeEmail(input.email)
  if (!isValidEmail(email)) {
    throw validationFailed({ email: "Địa chỉ thư không hợp lệ" })
  }
  const phone = input.phone.trim()
  if (!phone || phone.length < 8) {
    throw validationFailed({ phone: "Số điện thoại/Zalo không hợp lệ" })
  }
  const name = input.name.trim() || "Khách hàng dùng thử"

  const chosenIndustry = input.industryKey || "FLORAL"
  const industryPlugin = getIndustryPlugin(chosenIndustry)

  const randomPassword = `trial_${crypto.randomBytes(12).toString("hex")}!`
  const passwordHash = await hashPassword(randomPassword)
  const now = new Date()

  return runInTransaction(async (tx) => {
    const users = new UserRepository(tx)
    const organizations = new OrganizationRepository(tx)
    const workspaces = new WorkspaceRepository(tx)
    const roles = new RoleRepository(tx)
    const memberships = new MembershipRepository(tx)

    // Dùng thử không có mật khẩu — nên KHÔNG BAO GIỜ được gắn phiên vào một tài khoản có sẵn:
    // làm vậy là ai biết email cũng vào được tiệm thật của người đó.
    if (await users.findByEmail(email)) {
      throw conflict("Địa chỉ thư này đã có tài khoản. Vui lòng đăng nhập để tiếp tục.")
    }
    const user = await users.create({
      email,
      password_hash: passwordHash,
      name,
      // PO 22/10/2026: dùng thử cũng chờ superadmin duyệt. Lúc duyệt, hệ thống cấp mật khẩu tạm
      // (dùng thử không có mật khẩu) để superadmin gửi cho khách — xem account-approval-repository.
      approval_status: "PENDING",
    })

    const orgBaseName = `${name} - Demo ${industryPlugin.identity.name}`
    let slug: string | null = null
    for (const candidate of slugCandidates(orgBaseName)) {
      if (await organizations.findBySlug(candidate)) continue
      slug = candidate
      break
    }
    if (!slug) {
      slug = `demo-${chosenIndustry.toLowerCase()}-${Date.now().toString(36)}`
    }

    const organization = await organizations.create({
      name: orgBaseName,
      slug,
      type: "EXPERIENCE",
      credit_balance: 50,
      settings: {
        industry: chosenIndustry,
        industry_locked: true,
        is_instant_trial: true,
        lead_phone: phone,
        lead_name: name,
        lead_email: email,
        lead_captured_at: now.toISOString(),
      },
    })

    const workspace = await workspaces.createForNewOrganization({
      organizationId: organization.id,
      name: DEFAULT_WORKSPACE_NAME,
      kind: "EXPERIENCE",
      trial_limit: 50,
      trial_status: "ACTIVE",
    })

    await new OccasionRepository(tx).seedDefault({
      organizationId: organization.id,
      workspaceId: workspace.id,
      userId: user.id,
      branchId: null,
      capabilities: new Set<string>(),
    })

    // Nạp hồ sơ mẫu của ngành
    await seedExperienceMasterProfile(tx, organization.id, chosenIndustry)

    // Nạp các sản phẩm mẫu đặc trưng cho ngành
    await seedSampleProductsForIndustry(tx, organization.id, chosenIndustry)

    const founderRole = await roles.findSystemRoleByKey(FOUNDER_ROLE_KEY)
    if (!founderRole) {
      throw new AppError("INTERNAL", `Thiếu vai hệ thống ${FOUNDER_ROLE_KEY}`)
    }

    await memberships.createForNewOrganization({
      organizationId: organization.id,
      userId: user.id,
      roleId: founderRole.id,
      status: "ACTIVE",
      joinedAt: now,
    })

    return {
      userId: user.id,
      organizationId: organization.id,
      organizationName: orgBaseName,
      industryKey: chosenIndustry,
    }
  })
}
