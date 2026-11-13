/**
 * Chọn người nhận cho một sự kiện thông báo (pure).
 *
 * Vai trong sự kiện là khuôn trải nghiệm (`store_admin`, `sales`…), còn thành viên mang vai phân quyền
 * (`dieu_hanh`, `sale`…) — đổi qua `resolveRoleUx`. Chế độ OWNER chỉ gửi người phụ trách (nếu biết),
 * BROADCAST gửi mọi người cùng vai. Có trần số người nhận để một sự kiện không quét cả tổ chức lớn.
 */
import type { NotificationEventDefinition } from "./events/_contract"
import { resolveRoleUx } from "@/modules/organization/domain/role-ux-catalog"
import { isHrefOpen } from "@/lib/feature-lock"

export const MAX_RECIPIENTS_PER_EVENT = 50

export type OrgMember = {
  userId: string
  systemRoleKey: string
  email?: string | undefined
  phone?: string | undefined
}

export type SelectedRecipient = OrgMember & { roleKey: string }

export function notificationRoleKeyOf(systemRoleKey: string, organizationType?: string | null): string {
  return resolveRoleUx(systemRoleKey, organizationType)?.key ?? systemRoleKey
}

export function selectRecipients(
  event: NotificationEventDefinition,
  members: readonly OrgMember[],
  options: { organizationType?: string | null; ownerUserId?: string | null } = {}
): SelectedRecipient[] {
  const out: SelectedRecipient[] = []
  for (const m of members) {
    const roleKey = notificationRoleKeyOf(m.systemRoleKey, options.organizationType)
    const def = event.roleDefaults.find((r) => r.roleKey === roleKey) ?? event.roleDefaults.find((r) => r.roleKey === "*")
    if (!def) continue
    if (def.dispatchMode === "OWNER" && m.userId !== options.ownerUserId) continue
    out.push({ ...m, roleKey })
    if (out.length >= MAX_RECIPIENTS_PER_EVENT) break
  }
  return out
}

/** Điền `{biến}` trong deepLinkTemplate; thiếu biến nào → không gắn link (tránh link hỏng). */
export function fillDeepLink(template: string | null | undefined, vars: Record<string, string>): string | undefined {
  if (!template) return undefined
  let missing = false
  const link = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k]
    if (v === undefined) missing = true
    return encodeURIComponent(v ?? "")
  })
  return missing ? undefined : link
}

/**
 * Tuyến đích đang khoá "Sắp ra mắt" (smeOS production) → bỏ link, tin vẫn gửi (audit N-05: không dẫn người nhận tới màn
 * khoá). Khoá tắt — staging, bản giao GD1 — thì giữ nguyên link.
 */
export function openDeepLink(link: string | undefined, isOpen: (href: string) => boolean = (href) => isHrefOpen(href)): string | undefined {
  return link && isOpen(link) ? link : undefined
}

