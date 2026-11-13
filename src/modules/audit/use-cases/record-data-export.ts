import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "./record-audit-log"

export type ExportDataset = "orders" | "crm_customers" | "vision_analyses" | "products" | "voucher_codes" | "print_renditions"

/**
 * SDAGF-018: mọi lần xuất dữ liệu tổ chức ra tệp đều để lại dấu vết — ai,
 * khi nào, bộ dữ liệu nào, bộ lọc gì. Không ghi giá trị ô tìm kiếm (có thể
 * là số điện thoại/tên khách), chỉ ghi có lọc hay không.
 */
export async function recordDataExport(
  ctx: TenantContext,
  dataset: ExportDataset,
  filters: Record<string, string | string[] | null | undefined>
): Promise<void> {
  const after: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) continue
    after[key] = key === "search" ? true : value
  }
  await recordAuditLog(ctx, { action: "data.export", entityType: dataset, entityId: ctx.organizationId, after })
}
