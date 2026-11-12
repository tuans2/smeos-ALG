import { cache } from "react"

import type { MockSession } from "@/lib/mock-data"
import { getNavHiddenOverride } from "@/modules/platform/infra/nav-matrix-store"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"
import { canOverrideIndustryLock } from "@/modules/organization/domain/organization-settings-policy"
import { asSystemDb, withTenantDb } from "@/core/tenancy/db-context"
import { describeSession } from "./describe-session"
import { resolveSession } from "./resolve-session"
import { parseDevRoleOverride, applyDevRoleOverride, DEV_ROLE_COOKIE } from "@/lib/dev-role-override"
import { LEGACY_TIER_PREVIEW_COOKIE, TIER_PREVIEW_COOKIE, canUseTierPreview, parseTierPreview } from "@/modules/platform/domain/tier-preview"

function readCookieValue(cookieHeader: string, name: string): string | null {
  const segment = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))
  return segment ? decodeURIComponent(segment.slice(name.length + 1)) : null
}

function viettatTen(name: string | null, email: string): string {
  const nguon = (name ?? email).trim()
  const phan = nguon.split(/\s+/).filter(Boolean)
  const chu = phan.length >= 2 ? phan[0]!.charAt(0) + phan[phan.length - 1]!.charAt(0) : nguon.slice(0, 2)
  return chu.toUpperCase()
}

/**
 * Dựng `MockSession` (khuôn dữ liệu cho `SessionProvider`) từ phiên đăng
 * nhập thật (cookie `floraos_session`) — dùng chung cho layout (dựng
 * `SessionProvider`) và trang chủ (chọn Admin Dashboard hay Experience Grid
 * theo `workspace.kind` THẬT).
 *
 * Trước đây trang chủ chọn màn theo tham số URL thủ công
 * `?che_do=trai-nghiem` (đã gỡ) — bất kỳ ai gõ URL đó cũng thấy Experience
 * Grid bất kể workspace thật của họ là gì. Giờ đọc đúng `workspace.kind` từ
 * CSDL: tài khoản tự đăng ký qua `POST /auth/signup` luôn được tạo workspace
 * `EXPERIENCE` (`sign-up.ts`), nên tự thấy đúng màn Trải nghiệm mà không cần
 * mẹo URL nào.
 *
 * Bọc `cache()` để layout và trang chủ cùng gọi hàm này trong một request
 * chỉ tính một lượt truy vấn CSDL, không phải hai.
 */
export const resolveAppSession = cache(async function resolveAppSession(
  cookieHeader: string
): Promise<MockSession | null> {
  const IS_DEV = process.env.NODE_ENV !== "production"
  const request = new Request("http://localhost/", { headers: { cookie: cookieHeader } })

  const resolved = await resolveSession(request).catch(() => null)
  if (!resolved || !resolved.ctx || !resolved.membership) return null

  // Gọi từ Server Component (ngoài `handle()`): tự mở ngữ cảnh CSDL — đọc dữ liệu của tổ chức trong phiên (RLS)
  const described = await withTenantDb(resolved.ctx.organizationId, () => describeSession(resolved))

  const rawOrgName = described.organization?.name ?? "ALG"
  const cleanOrgName = rawOrgName.replace(/\s*\(\s*dev\s*\)/gi, "").trim()
  const industry = described.organization?.industry ?? "FLORAL"
  // Quyền vượt khoá ngành lấy từ mã năng lực nền tảng (N1/N12), không từ đuôi email (rà soát H11)
  const operator = await asSystemDb("session:platform-operator", () => new PlatformOperatorRepository().findActiveByUserId(described.user.id))
  const platformCapabilities = operator?.capabilityCodes ?? []
  const industryLocked = canOverrideIndustryLock(platformCapabilities) ? false : (described.organization?.industry_locked ?? false)
  // Ma trận điều hướng Admin SaaS ghi đè cho ngành này — đọc ở máy chủ, không đóng gói lúc build (M13)
  const navHiddenKeys = await asSystemDb("session:nav-matrix", () => getNavHiddenOverride(industry))

  const session: MockSession = {
    userName: described.user.name ?? described.user.email,
    userEmail: described.user.email,
    mustChangePassword: described.user.mustChangePassword,
    userInitials: viettatTen(described.user.name, described.user.email),
    orgName: cleanOrgName,
    workspaceKind: (described.workspace?.kind as MockSession["workspaceKind"]) ?? "PRODUCTION",
    capabilities: described.capabilities,
    platformCapabilities,
    organization: described.organization
      ? {
          id: described.organization.id,
          name: cleanOrgName,
          industry,
          industryLocked,
          navHiddenKeys,
          unlockedTools: described.organization.unlocked_tools ?? null,
        }
      : undefined,
    // Đặc tả 03b (Role UX): khoá vai + loại tổ chức để chọn trang chủ/thứ tự
    // điều hướng theo vai. Đã có sẵn trong `describeSession` (GET /auth/me).
    roleKey: described.membership?.role_key ?? null,
    organizationType: described.organization?.type ?? null,
    pendingModelChange:
      (described.organization?.pending_model_change as MockSession["pendingModelChange"]) ?? null,
  }

  // Người vận hành nền tảng (N1) xem trước tầng — chạy cả production. Kiểm
  // lại quyền ở mỗi request: thu hồi N1 thì cookie cũ hết tác dụng.
  if (canUseTierPreview(platformCapabilities)) {
    const preview = parseTierPreview(readCookieValue(cookieHeader, TIER_PREVIEW_COOKIE) ?? readCookieValue(cookieHeader, LEGACY_TIER_PREVIEW_COOKIE))
    if (preview !== null) return { ...applyDevRoleOverride(session, preview), tierPreviewActive: true }
  }

  // Dev-only: merge role override cookie nếu có.
  if (IS_DEV) {
    const rawCookieSegment = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${DEV_ROLE_COOKIE}=`))
    const overrideCookieValue = rawCookieSegment
      ? decodeURIComponent(rawCookieSegment.slice(DEV_ROLE_COOKIE.length + 1))
      : ""
    const override = parseDevRoleOverride(overrideCookieValue || undefined)
    if (override !== null) return applyDevRoleOverride(session, override)
  }

  return session
})
