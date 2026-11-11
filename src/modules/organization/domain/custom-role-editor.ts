import { CAPABILITIES, type CapabilityGroup } from "@/core/rbac/capability-catalog"

/**
 * Màn vai trò tuỳ chỉnh (checklist ALG 1.13): nhóm quyền theo nghiệp vụ, nhãn tiếng Việt, bỏ các quyền vai tự tạo không bao giờ
 * giữ được (trần cứng chỉ dành cho vai hệ thống). Pure TypeScript — dùng được ở giao diện.
 */

export const CAPABILITY_GROUP_LABEL: Record<CapabilityGroup, string> = {
  access: "Truy cập",
  vision_run: "Chạy nhận diện ảnh",
  pricing_card: "Thẻ giá",
  config: "Cấu hình cửa hàng",
  system: "Hệ thống",
  org_member: "Cửa hàng & thành viên",
  asset_job: "Tài nguyên & tác vụ nền",
  vision: "Nhận diện ảnh",
  media: "Ảnh & video",
  channel: "Kênh bán hàng",
  product_pricing: "Sản phẩm & giá",
  experience: "Trải nghiệm",
  ai_policy: "Chính sách AI",
  order_operations: "Đơn hàng & vận hành",
  crm: "Khách hàng",
  ai_chat: "Trợ lý AI",
  market_intelligence: "Xu hướng thị trường",
  integration: "Tích hợp",
  marketing_usage: "Marketing",
  print: "In ấn",
  internal_chat: "Trao đổi nội bộ",
}

export interface EditableCapability {
  code: string
  label: string
}

export interface CapabilityGroupView {
  group: CapabilityGroup
  label: string
  items: EditableCapability[]
}

/** Quyền vai tự tạo được bật: mọi mã không có trần cứng, gom theo nhóm, giữ thứ tự khai trong danh mục. */
export function editableCapabilityGroups(): CapabilityGroupView[] {
  const byGroup = new Map<CapabilityGroup, EditableCapability[]>()
  for (const def of Object.values(CAPABILITIES)) {
    if (def.hardCap) continue
    const list = byGroup.get(def.group) ?? []
    list.push({ code: def.code, label: def.label })
    byGroup.set(def.group, list)
  }
  return [...byGroup.entries()].map(([group, items]) => ({ group, label: CAPABILITY_GROUP_LABEL[group], items }))
}

export const ROLE_NAME_MIN = 2
export const ROLE_NAME_MAX = 60

export function roleNameProblem(name: string): string | null {
  const n = name.trim()
  if (n.length < ROLE_NAME_MIN) return `Tên vai trò cần ít nhất ${ROLE_NAME_MIN} ký tự.`
  if (n.length > ROLE_NAME_MAX) return `Tên vai trò tối đa ${ROLE_NAME_MAX} ký tự.`
  return null
}

/** Thay đổi gửi lên máy chủ: chỉ những mã khác trạng thái hiện tại. */
export function capabilityChanges(current: ReadonlySet<string>, draft: ReadonlySet<string>): Array<{ code: string; allowed: boolean }> {
  const out: Array<{ code: string; allowed: boolean }> = []
  for (const code of draft) if (!current.has(code)) out.push({ code, allowed: true })
  for (const code of current) if (!draft.has(code)) out.push({ code, allowed: false })
  return out.sort((a, b) => a.code.localeCompare(b.code))
}
