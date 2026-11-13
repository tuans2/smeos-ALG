/**
 * Ngữ cảnh người vận hành nền tảng — giải một lần ở biên, độc lập hoàn
 * toàn với `TenantContext` (đặc tả 07 mục ngoại lệ Luật 1, kế hoạch
 * `docs/kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md` mục 4.2).
 *
 * Cố ý KHÔNG có `organizationId`: đây là điểm khoá kiến trúc chính của
 * D-N6 (tách hẳn) — không hàm nào nhận cả hai kiểu ngữ cảnh cùng lúc, nên
 * `scopedWhere(pctx, …)` hay `requireCapability(ctx thật ra là pctx, …)`
 * không biên dịch được. `tsc` chặn nhầm lẫn thay vì một bài kiểm tra phải
 * canh.
 *
 * "Ngữ cảnh song song" (chốt 18/09): một người vừa có `TenantContext` (là
 * thành viên một tổ chức) vừa có `PlatformContext` (là người vận hành nền
 * tảng) không loại trừ nhau — hai bảng nguồn (`memberships` và
 * `platform_operators`) độc lập, `resolvePlatformSession` không đọc
 * `sessions.organization_id`.
 *
 * Tệp này không import Prisma. Nó là luật thuần, test được không cần cơ
 * sở dữ liệu.
 */

export type PlatformContext = {
  readonly userId: string
  readonly capabilities: ReadonlySet<string>
}
