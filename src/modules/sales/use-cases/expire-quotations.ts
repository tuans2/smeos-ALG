import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { updateLead } from "@/modules/acquisition/use-cases/manage-leads"
import { expireOverdueQuotationRows } from "../infra/quotation-expiry"

/** Trần mỗi lượt quét 5 phút — dư thì lượt sau làm tiếp. */
export const QUOTATION_EXPIRY_BATCH = 500

export interface ExpireQuotationsDeps {
  expire: typeof expireOverdueQuotationRows
  followUpLead: (ctx: TenantContext, leadId: string) => Promise<unknown>
}

/** Ngữ cảnh hệ thống của lượt quét — không phiên người dùng; nhật ký ghi `system:quotation-expiry`. */
function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: "system:quotation-expiry", branchId: null, capabilities: new Set() }
}

/**
 * Hết hạn báo giá chạy theo lịch (audit hành trình Q2/S1, gói UJ-11) — trước đây chỉ ghi khi nhân viên mở chi
 * tiết, nên danh sách và số liệu "đã gửi" lệch. Lead đang "Đã báo giá" của báo giá vừa hết hạn về "Theo dõi" qua
 * đúng `updateLead` (luật chuyển + nhật ký) — audit User Journey L2 (UJ-31); trước đây lead đứng "Đã báo giá" mãi.
 * Lỗi một lead không chặn lead khác; lỗi cả lượt không làm hỏng lượt quét chung: ghi log, trả `null`.
 */
export async function expireOverdueQuotations(
  now: Date = new Date(),
  deps: ExpireQuotationsDeps = {
    expire: expireOverdueQuotationRows,
    followUpLead: (ctx, leadId) => updateLead(ctx, leadId, { status: "FOLLOW_UP" }),
  },
): Promise<number | null> {
  try {
    const batch = await deps.expire(now, QUOTATION_EXPIRY_BATCH)
    for (const { organizationId, leadId } of batch.leadsToFollowUp) {
      try {
        await deps.followUpLead(systemContext(organizationId), leadId)
      } catch (error) {
        log.warn("sweep.quotation_expiry_lead_failed", { leadId, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return batch.count
  } catch (error) {
    log.error("sweep.quotation_expiry_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
