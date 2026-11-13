import { AppError, conflict, validationFailed } from "@/core/http/errors"
import {
  isAcceptablePassword,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@/modules/organization/domain/credentials"
import {
  DEFAULT_WORKSPACE_NAME,
  TRIAL_CREDIT_BALANCE,
  TRIAL_LIMIT,
} from "@/modules/organization/domain/experience"
import { expiresAt } from "@/modules/organization/domain/session-policy"
import { slugCandidates } from "@/modules/organization/domain/slug"
import { FOUNDER_ROLE_KEY } from "@/modules/organization/domain/system-roles"
import { MembershipRepository } from "@/modules/organization/infra/membership-repository"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { hashPassword } from "@/modules/organization/infra/password-hasher"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { SessionRepository } from "@/modules/organization/infra/session-repository"
import { OccasionRepository } from "@/modules/organization/infra/occasion-repository"
import { hashSessionToken, newSessionToken } from "@/modules/organization/infra/session-token"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { UserRepository } from "@/modules/organization/infra/user-repository"
import { WorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { seedExperienceMasterProfile } from "@/modules/profiles/use-cases/seed-experience-profile"

export type SignUpInput = {
  email: string
  password: string
  name?: string | null
  organizationName: string
  industryKey?: string | undefined
  organizationType?: "SINGLE" | "CHAIN" | undefined
  seedProfile?: boolean | undefined
  /** Đăng ký công khai (`/auth/signup`): tài khoản chờ superadmin duyệt, không mở phiên. */
  pendingApproval?: boolean | undefined
}

export type SignUpResult = {
  /** `null` khi tài khoản chờ duyệt — chưa có phiên nào. */
  token: string | null
  userId: string
  organizationId: string
}

/**
 * Đăng ký tạo người dùng **và** tổ chức trải nghiệm của họ (đặc tả 06 mục 3).
 *
 * Người mở tổ chức nhận vai `dieu_hanh`: họ điều hành chính tổ chức mình vừa
 * tạo. Vai `experience_user` dành cho người được mời vào một workspace trải
 * nghiệm sẵn có, và luồng mời thuộc P2.
 *
 * Cả năm bản ghi — user, organization, workspace, membership, session — nằm
 * trong một giao dịch. Giao dịch hỏng thì không sinh ra tổ chức mồ côi.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const email = normalizeEmail(input.email)
  if (!isValidEmail(email)) throw validationFailed({ email: "Địa chỉ thư không hợp lệ" })
  if (!isAcceptablePassword(input.password)) {
    throw validationFailed({ password: `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự` })
  }
  const organizationName = input.organizationName.trim()
  if (organizationName.length === 0) {
    throw validationFailed({ organization_name: "Tên tổ chức không được để trống" })
  }

  // Băm trước khi mở giao dịch: bcrypt cố ý chậm, giữ giao dịch mở trong lúc
  // băm là giữ khoá cơ sở dữ liệu không vì lý do gì.
  const passwordHash = await hashPassword(input.password)
  const now = new Date()
  const token = newSessionToken()

  return runInTransaction(async (tx) => {
    const users = new UserRepository(tx)
    const organizations = new OrganizationRepository(tx)
    const workspaces = new WorkspaceRepository(tx)
    const roles = new RoleRepository(tx)
    const memberships = new MembershipRepository(tx)
    const sessions = new SessionRepository(tx)

    if (await users.findByEmail(email)) {
      throw conflict("Địa chỉ thư này đã có tài khoản")
    }

    const user = await users.create({
      email,
      password_hash: passwordHash,
      name: input.name?.trim() || null,
      approval_status: input.pendingApproval ? "PENDING" : "APPROVED",
    })

    let slug: string | null = null
    for (const candidate of slugCandidates(organizationName)) {
      if (await organizations.findBySlug(candidate)) continue
      slug = candidate
      break
    }
    if (!slug) throw conflict("Không sinh được định danh cho tên tổ chức này")

    const chosenIndustry = input.industryKey || "FLORAL"
    // Mô hình Chuỗi mở gói FLOWER_NETWORK (entitlement-service) — client tự chọn thì không được
    // trao ngay (rà soát 21/10/2026, H5). Tổ chức luôn bắt đầu là 1 cửa hàng; chọn Chuỗi chỉ ghi
    // yêu cầu chờ Quản trị SaaS duyệt (N2), cùng cơ chế với request-organization-upgrade.
    const wantsChain = input.organizationType === "CHAIN"

    const organization = await organizations.create({
      name: organizationName,
      slug,
      type: "SINGLE",
      credit_balance: TRIAL_CREDIT_BALANCE,
      settings: {
        industry: chosenIndustry,
        industry_locked: true, // Khóa đổi ngành ngay sau khi chọn ban đầu
        brochure_workflow_policy: {
          require_coordinator_acceptance: false,
        },
        ...(wantsChain
          ? {
              pending_model_change: {
                requested_type: "CHAIN",
                requested_at: new Date().toISOString(),
                requested_by: user.id,
                note: "Chọn mô hình Chuỗi khi đăng ký",
              },
            }
          : {}),
      },
    })

    const workspace = await workspaces.createForNewOrganization({
      organizationId: organization.id,
      name: DEFAULT_WORKSPACE_NAME,
      kind: "EXPERIENCE",
      trial_limit: TRIAL_LIMIT,
      trial_status: "ACTIVE",
    })

    await new OccasionRepository(tx).seedDefault({ organizationId: organization.id, workspaceId: workspace.id, userId: user.id, branchId: null, capabilities: new Set<string>() })
    if (input.seedProfile) {
      await seedExperienceMasterProfile(tx, organization.id, chosenIndustry)
    }

    const founderRole = await roles.findSystemRoleByKey(FOUNDER_ROLE_KEY)
    if (!founderRole) {
      throw new AppError(
        "INTERNAL",
        `Thiếu vai hệ thống ${FOUNDER_ROLE_KEY}. Chạy \`npm run db:seed\`.`
      )
    }

    await memberships.createForNewOrganization({
      organizationId: organization.id,
      userId: user.id,
      roleId: founderRole.id,
      status: "ACTIVE",
      joinedAt: now,
    })

    if (input.pendingApproval) return { token: null, userId: user.id, organizationId: organization.id }

    await sessions.create({
      user_id: user.id,
      token_hash: hashSessionToken(token),
      organization_id: organization.id,
      expires_at: expiresAt(now),
    })

    return { token, userId: user.id, organizationId: organization.id }
  })
}
