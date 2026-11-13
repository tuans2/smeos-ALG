/**
 * Từ vựng năng lực CỦA RIÊNG console vận hành nền tảng — dải `N1`–`N8`, `N12`–`N20`
 * (đặc tả 02 mục "Vận hành nền tảng — dải N").
 *
 * TÁCH HẲN khỏi `src/core/rbac/capability-catalog.ts` (D-N6, chốt 19/09).
 * Không dùng `capability_scope`, không có "trần cứng" theo `SystemRoleKey`
 * — người vận hành nền tảng không phải một vai của tenant, và tập mã ở
 * đây không bao giờ xuất hiện trong `role_capabilities`/
 * `capability_overrides` của tenant.
 *
 * `N9`–`N11` (sổ đăng ký mô hình AI, sổ ngưỡng, chi phí theo mô hình)
 * thuộc tuyến AI-1 — KHÔNG khai ở đây, xem
 * docs/kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md mục 0.
 */

export interface PlatformCapabilityDefinition {
  readonly code: string
  readonly name: string
  readonly label: string
}

const DEFINITIONS: Record<string, Omit<PlatformCapabilityDefinition, "code">> = {
  N1: { name: "platform.organizations.read", label: "Xem danh sách & chi tiết mọi tổ chức" },
  N2: { name: "platform.upgrade_requests.manage", label: "Duyệt/từ chối yêu cầu nâng cấp" },
  N3: { name: "platform.credit.manage", label: "Nạp/hoàn credit cho một tổ chức" },
  N4: { name: "platform.usage.read", label: "Usage & chi phí tổng hợp toàn hệ thống" },
  N5: { name: "platform.health.read", label: "Sức khoẻ hệ thống (chỉ đọc)" },
  N6: { name: "platform.audit.read", label: "Nhật ký xuyên tổ chức" },
  N7: { name: "platform.organizations.create", label: "Tạo tổ chức mới" },
  N8: { name: "platform.integration_tokens.manage", label: "Token tích hợp theo tổ chức" },
  // N9–N11 giữ chỗ cho tuyến AI-1 (sổ đăng ký mô hình AI, sổ ngưỡng, chi
  // phí theo mô hình) — chưa khai ở đây, xem lời dẫn ở đầu tệp.
  N12: { name: "platform.field_catalog.manage", label: "Quản trị trường dữ liệu, danh mục & trường tự tạo (ĐP-3)" },
  // PO 22/10/2026: mọi tài khoản tự đăng ký/dùng thử chờ duyệt trước khi đăng nhập được
  N13: { name: "platform.registrations.manage", label: "Duyệt/từ chối tài khoản tự đăng ký" },
  // PO 29/10/2026 (SDAGF D-04): giữ dữ liệu theo yêu cầu pháp lý — chặn mọi lệnh xoá
  N14: { name: "platform.legal_hold.manage", label: "Đặt/gỡ giữ dữ liệu theo yêu cầu pháp lý" },
  // ROADMAP E5.2 (30/10/2026): N5 vẫn chỉ đọc (D-N5) — hành động trên job lỗi cần mã riêng
  N15: { name: "platform.jobs.manage", label: "Chạy lại hoặc gác lại job lỗi (hàng đợi lỗi)" },
  // Trung tâm Tích hợp GĐ3 (PO 31/10/2026, D4): khoá/cấp sẵn tích hợp cho toàn nền tảng và từng ngành
  N16: { name: "platform.integrations.govern", label: "Khoá hoặc cấp sẵn tích hợp theo tầng (nền tảng, ngành)" },
  // PO 31/10/2026: chợ đối tác — đồng bộ Sheet, nhập Excel, tải ảnh khảo sát (đọc vẫn là N1)
  N17: { name: "platform.marketplace.manage", label: "Đồng bộ, nhập dữ liệu & ảnh chợ đối tác" },
  // PO 03/11/2026: xoá hồ sơ chợ đối tác — chỉ superadmin nền tảng (tách khỏi N17 để người nhập dữ liệu không xoá được)
  N18: { name: "platform.marketplace.delete", label: "Xoá hồ sơ cửa hàng khỏi chợ đối tác" },
  // Checklist ALG 10.7 (PO Q9): gán gói, xác nhận thu tiền thuê bao, tài khoản nhận tiền
  N19: { name: "platform.subscriptions.manage", label: "Gán gói thuê bao, xác nhận thanh toán hoá đơn thuê bao" },
  // Checklist ALG 10.8 (PO 06/11/2026): khoá/mở tên miền riêng của một tổ chức (xem danh sách vẫn là N1)
  N20: { name: "platform.custom_domains.manage", label: "Khoá hoặc mở lại tên miền riêng của tổ chức" },
}

export const PLATFORM_CAPABILITIES: Record<string, PlatformCapabilityDefinition> = Object.fromEntries(
  Object.entries(DEFINITIONS).map(([code, def]) => [code, { code, ...def }])
)

export const ALL_PLATFORM_CAPABILITY_CODES: readonly string[] = Object.keys(PLATFORM_CAPABILITIES).sort()

export function isPlatformCapabilityCode(value: string): boolean {
  return value in PLATFORM_CAPABILITIES
}

export function platformCapability(code: string): PlatformCapabilityDefinition {
  const found = PLATFORM_CAPABILITIES[code]
  if (!found) throw new Error(`Mã năng lực nền tảng không tồn tại: ${code}`)
  return found
}
