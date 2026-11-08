/**
 * Bộ quét P3b: giao dịch SePay mà bộ khớp Thẻ chào để lại "chưa khớp" → thử khớp đơn ngoài Thẻ chào theo mã đơn
 * `DH<yymmdd>-<4 số>` trong nội dung chuyển khoản (§4.2 mục 5: bộ khớp mới đi SAU bộ khớp Thẻ chào). Không sửa mã
 * Thẻ chào; chỉ nhận dòng còn "chưa khớp" và không gắn đơn nào. Số tiền vượt phần còn phải thu → để nguyên cho
 * Điều hành xử lý tay.
 */

import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { StandardPaymentRepository } from "../infra/standard-payment-repository"
import { extractStandardOrderCode } from "../workflow/standard-payment"

export const BANK_MATCH_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000
const BATCH = 100
/** Trần trang mỗi lượt quét (vòng lặp có giới hạn) — 20 × 100 dòng trong cửa sổ 3 ngày. */
export const BANK_MATCH_MAX_PAGES = 20
const ACTOR = "system:sepay-orders"

function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: ACTOR, branchId: null, capabilities: new Set() }
}

export async function matchStandardBankTransfers(
  now = new Date(),
  repo: Pick<StandardPaymentRepository, "listUnmatched" | "record"> = new StandardPaymentRepository(),
) {
  const since = new Date(now.getTime() - BANK_MATCH_LOOKBACK_MS)
  const result = { scanned: 0, matched: 0, skipped: 0 }
  let after: { createdAt: Date; id: string } | undefined
  for (let page = 0; page < BANK_MATCH_MAX_PAGES; page += 1) {
    const events = await repo.listUnmatched(since, BATCH, after)
    result.scanned += events.length
    for (const e of events) await matchOne(repo, e, result)
    const last = events.at(-1)
    if (events.length < BATCH || !last) break
    after = { createdAt: last.created_at, id: last.id }
  }
  return result
}

type UnmatchedEvent = Awaited<ReturnType<StandardPaymentRepository["listUnmatched"]>>[number]

async function matchOne(
  repo: Pick<StandardPaymentRepository, "record">,
  e: UnmatchedEvent,
  result: { matched: number; skipped: number },
): Promise<void> {
  const code = extractStandardOrderCode(e.content)
  if (!code) {
    result.skipped += 1
    return
  }
  try {
    await repo.record(
      systemContext(e.organization_id),
      { code },
      { amountVnd: Math.round(Number(e.amount_vnd)), method: "BANK_TRANSFER", reference: `${e.provider}:${e.external_id}`, note: "Tự khớp chuyển khoản" },
      e.id,
    )
    result.matched += 1
  } catch (error: unknown) {
    // Không tìm thấy đơn / vượt số còn phải thu / đã xử lý: để nguyên dòng "chưa khớp".
    result.skipped += 1
    log.info("orders.bank_match_skipped", { organizationId: e.organization_id, feature: "orders", message: error instanceof Error ? error.message : String(error) })
  }
}
