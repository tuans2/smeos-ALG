import { randomBytes } from "node:crypto"

import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { hashPassword } from "@/modules/organization/infra/password-hasher"

/**
 * Hàng chờ duyệt tài khoản tự đăng ký (PO 22/10/2026, mã `N13`). Chạy toàn hệ thống, không theo
 * tổ chức — đúng phạm vi của superadmin nền tảng, giống `PlatformOrganizationsRepository`.
 */
export interface PendingRegistration {
  userId: string
  email: string
  name: string | null
  createdAt: string
  organizationId: string | null
  organizationName: string | null
  /** Đăng ký qua "Dùng thử" — không có mật khẩu, duyệt xong phải cấp mật khẩu tạm. */
  instantTrial: boolean
  leadPhone: string | null
}

export type RegistrationDecision = "APPROVE" | "REJECT"

export interface RegistrationDecisionResult {
  status: "APPROVED" | "REJECTED"
  /** Chỉ có khi duyệt tài khoản dùng thử. Hiện cho superadmin ĐÚNG MỘT LẦN, không lưu, không ghi log. */
  temporaryPassword?: string
}

function settingsOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export class AccountApprovalRepository {
  async listPending(limit = 200): Promise<PendingRegistration[]> {
    const users = await prisma.users.findMany({
      where: { approval_status: "PENDING" },
      orderBy: { created_at: "asc" },
      take: limit,
      select: {
        id: true, email: true, name: true, created_at: true,
        memberships: { take: 1, orderBy: { invited_at: "asc" }, select: { organization: { select: { id: true, name: true, settings: true } } } },
      },
    })
    return users.map((u) => {
      const org = u.memberships[0]?.organization ?? null
      const settings = settingsOf(org?.settings)
      return {
        userId: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.created_at.toISOString(),
        organizationId: org?.id ?? null,
        organizationName: org?.name ?? null,
        instantTrial: settings.is_instant_trial === true,
        leadPhone: typeof settings.lead_phone === "string" ? settings.lead_phone : null,
      }
    })
  }

  /** Chỉ quyết được tài khoản đang PENDING; đã quyết rồi → 409, không có → 404. */
  async decide(userId: string, decision: RegistrationDecision, decidedBy: string): Promise<RegistrationDecisionResult> {
    const pending = (await this.listPendingOne(userId))
    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED"
    const temporaryPassword = decision === "APPROVE" && pending.instantTrial ? randomBytes(12).toString("base64url") : undefined
    const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : undefined

    const updated = await prisma.users.updateMany({
      where: { id: userId, approval_status: "PENDING" },
      data: {
        approval_status: status,
        approval_decided_at: new Date(),
        approval_decided_by: decidedBy,
        ...(passwordHash ? { password_hash: passwordHash, must_change_password: true } : {}),
      },
    })
    if (updated.count === 0) throw conflict("Tài khoản này vừa được người khác xử lý.")
    return temporaryPassword ? { status, temporaryPassword } : { status }
  }

  private async listPendingOne(userId: string): Promise<{ instantTrial: boolean }> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        approval_status: true,
        memberships: { take: 1, orderBy: { invited_at: "asc" }, select: { organization: { select: { settings: true } } } },
      },
    })
    if (!user) throw notFound()
    if (user.approval_status !== "PENDING") throw conflict("Tài khoản này đã được xử lý trước đó.")
    return { instantTrial: settingsOf(user.memberships[0]?.organization.settings).is_instant_trial === true }
  }
}
