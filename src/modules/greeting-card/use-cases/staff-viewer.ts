import { resolveSession } from "@/modules/organization/use-cases/resolve-session"

/**
 * Tổ chức của nhân viên đang đăng nhập (nếu có) — để nhân viên bấm "Mở link" xem trước phiên
 * khách mà không chiếm quyền chủ phiên. Không đăng nhập / phiên hết hạn → `null`.
 */
export async function staffOrganizationId(headers: Headers): Promise<string | null> {
  try {
    const resolved = await resolveSession(new Request("http://localhost/", { headers }))
    return resolved.ctx?.organizationId ?? null
  } catch {
    return null
  }
}
