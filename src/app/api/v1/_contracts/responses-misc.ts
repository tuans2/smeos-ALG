import { z } from "zod"

import { printPresetCodes } from "@/modules/print/domain/print-rendition"

/**
 * Phản hồi `/api/v1/session/*`, `/api/v1/reports/*`, `/api/v1/print/*`, `/api/v1/vouchers/*`, `/api/v1/usage/*` (OpenAPI
 * nội bộ, PO 07/11/2026). Sinh từ kiểu TS của `reporting` (cashflow-report, product-performance-report,
 * business-summary), `print` (print-preset, print-rendition), `promotions` (voucher-batch), `usage` và dòng `usage`,
 * đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-misc.test.ts`. Tiền là VNĐ; tỷ lệ là
 * phần trăm, `null` khi chưa có mẫu số.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const day = z.string()
const rate = z.number().nullable()

// ── Phiên ───────────────────────────────────────────────────────────────────
export const invitationsResponse = data(
  z.array(z.strictObject({ membership_id: z.string(), organization_id: z.string(), organization_name: z.string(), role_name: z.string(), invited_at: timestamp }))
)
export const invitationAcceptedResponse = data(z.strictObject({ organization_id: z.string() }))
export const invitationDeclinedResponse = data(z.strictObject({ declined: z.literal(true) }))
/** Kèm `Set-Cookie: alg_sso` mới — JWT liên-app mang tổ chức bên trong nên phải phát lại ngay. */
export const switchOrganizationResponse = z.strictObject({ organization: z.strictObject({ id: z.string(), name: z.string(), slug: z.string(), type: z.string(), lifecycle_status: z.string() }) })
export const passwordChangedResponse = data(z.strictObject({ changed: z.literal(true) }))

// ── Báo cáo ─────────────────────────────────────────────────────────────────
const periodG = z.strictObject({ from: day, to: day, granularity: z.enum(["day", "week", "month"]) })
const period = z.strictObject({ from: day, to: day })
export const orderReportResponse = data(
  z.strictObject({
    period: periodG,
    totals: z.strictObject({
      total: z.number(), completed: z.number(), cancelled: z.number(), delivered: z.number(), late: z.number(), overdueOpen: z.number(),
      completionRate: rate, cancelRate: rate, lateRate: rate,
    }),
    series: z.array(z.strictObject({ bucket: z.string(), total: z.number(), completed: z.number(), cancelled: z.number(), late: z.number() })),
  })
)
/** `?detail=orders` thêm danh sách đơn của kỳ (tối đa 200). */
export const revenueReportResponse = data(
  z.strictObject({
    period: periodG,
    totals: z.strictObject({ expectedVnd: z.number(), collectedVnd: z.number(), refundedVnd: z.number(), netCollectedVnd: z.number(), collectionRate: rate, draftCount: z.number(), draftVnd: z.number() }),
    series: z.array(z.strictObject({ bucket: z.string(), expectedVnd: z.number(), collectedVnd: z.number(), refundedVnd: z.number(), netCollectedVnd: z.number() })),
    orders: z.array(z.strictObject({ id: z.string(), code: z.string(), status: z.string(), totalVnd: z.number(), paidVnd: z.number(), createdAt: timestamp })).optional(),
  })
)
const productRow = z.strictObject({ productId: z.string().nullable(), name: z.string(), quantity: z.number(), valueVnd: z.number() })
const share = z.strictObject({ label: z.string().nullable(), quantity: z.number(), sharePercent: rate })
export const productReportResponse = data(
  z.strictObject({ period, byQuantity: z.array(productRow), byValue: z.array(productRow), colors: z.array(share), styles: z.array(share) })
)
export const performanceReportResponse = data(
  z.strictObject({
    period,
    sales: z.array(z.strictObject({ userId: z.string(), name: z.string(), orders: z.number(), revenueVnd: z.number() })),
    florists: z.array(z.strictObject({ userId: z.string(), name: z.string(), assigned: z.number(), done: z.number() })),
    shippers: z.array(z.strictObject({ key: z.string(), name: z.string(), delivered: z.number(), onTime: z.number(), onTimeRate: rate })),
  })
)
export const cashflowReportResponse = data(
  z.strictObject({
    period,
    byMethod: z.array(z.strictObject({ method: z.string(), label: z.string(), collectedVnd: z.number(), refundedVnd: z.number(), netVnd: z.number() })),
    daily: z.array(
      z.strictObject({
        date: day, ledgerTransferVnd: z.number(), bankMatchedVnd: z.number(), bankUnmatchedVnd: z.number(), bankIgnoredVnd: z.number(), unmatchedCount: z.number(), differenceVnd: z.number(),
      })
    ),
    /** Giao dịch ngân hàng (SePay) chưa khớp đơn — tối đa 50, nội dung cắt 160 ký tự. */
    unmatched: z.array(z.strictObject({ id: z.string(), at: timestamp, amountVnd: z.number(), content: z.string() })),
  })
)

// ── Credit ──────────────────────────────────────────────────────────────────
/** Dòng `usage` nguyên bản. */
const usageRow = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  workspace_id: z.string(),
  user_id: z.string(),
  job_id: z.string().nullable(),
  feature: z.string(),
  quantity: z.number(),
  cost_credit: z.number(),
  cost_usd: z.number().nullable(),
  status: z.string(),
  metadata: z.unknown().nullable(),
  created_at: timestamp,
})
export const usageListResponse = z.strictObject({ data: z.array(usageRow), next_cursor: z.string().nullable() })
/** `period`, `monthly_limit`, `ai_limit`, `plan` chỉ có khi gửi `?period=YYYY-MM`. */
export const usageSummaryResponse = z.strictObject({
  by_feature: z.array(z.strictObject({ feature: z.string(), quantity: z.number(), cost_credit: z.number() })),
  credit_used: z.number(),
  credit_balance: z.number(),
  period: z.string().optional(),
  monthly_limit: z.number().nullable().optional(),
  ai_limit: z.number().nullable().optional(),
  plan: z.strictObject({ code: z.string(), included_credits_monthly: z.number().nullable() }).nullable().optional(),
})
export const usageLimitsResponse = data(
  z.strictObject({
    period: z.string(),
    credit: z.strictObject({ used: z.number(), limit: z.number().nullable() }),
    ai: z.strictObject({ used: z.number(), limit: z.number().nullable() }),
  })
)

// ── Mã giảm giá ─────────────────────────────────────────────────────────────
const voucherBatch = z.strictObject({
  id: z.string(),
  name: z.string(),
  promotionId: z.string().nullable(),
  codePrefix: z.string().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number(),
  minOrderVnd: z.number(),
  maxDiscountVnd: z.number().nullable(),
  startsAt: timestamp.nullable(),
  expiresAt: timestamp.nullable(),
  usageLimit: z.number().nullable(),
  perCustomerLimit: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: timestamp,
  codeCount: z.number(),
  exhaustedCount: z.number(),
  usedTotal: z.number(),
  /** Mã dùng chung (chế độ SHARED); mã riêng thì `null`. */
  sampleCode: z.string().nullable(),
  status: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED", "PAUSED", "EXHAUSTED"]),
  promotionTitle: z.string().nullable(),
})
/** Không bọc `{ data }`. Kèm ưu đãi đang bật và trần % để màn hình chọn. */
export const voucherBatchesResponse = z.strictObject({
  batches: z.array(voucherBatch),
  promotions: z.array(z.strictObject({ id: z.string(), title: z.string(), customerText: z.string(), kind: z.string(), percent: z.number().nullable() })),
  maxDiscountPercent: z.number(),
})
export const voucherBatchCreatedResponse = voucherBatch
export const voucherBatchResponse = z.strictObject({
  batch: voucherBatch,
  codes: z.array(z.strictObject({ code: z.string(), usedCount: z.number(), usageLimit: z.number().nullable(), isActive: z.boolean(), lastUsedAt: timestamp.nullable() })),
})
export const voucherBatchToggledResponse = z.strictObject({ data: z.strictObject({ id: z.string(), is_active: z.boolean() }) })

// ── Bản in ──────────────────────────────────────────────────────────────────
const preflightReport = z.strictObject({
  passed: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  details: z.strictObject({
    presetCode: z.enum(printPresetCodes),
    widthMm: z.number(), heightMm: z.number(), bleedMm: z.number(), safeMarginMm: z.number(), cutWidthMm: z.number(), cutHeightMm: z.number(),
    effectiveDpi: z.number().nullable(), minRecommendedDpi: z.number(), targetWidthPx: z.number(), targetHeightPx: z.number(),
  }),
})
export const preflightResponse = data(preflightReport)
const rendition = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  assetId: z.string().nullable(),
  assetUsageId: z.string().nullable(),
  sourceType: z.string(),
  sourceId: z.string().nullable(),
  presetCode: z.enum(printPresetCodes),
  widthMm: z.number(),
  heightMm: z.number(),
  bleedMm: z.number(),
  dpi: z.number(),
  storageKey: z.string().nullable(),
  fileUrl: z.string().nullable(),
  preflight: preflightReport,
  status: z.enum(["PENDING", "READY", "FAILED"]),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
export const renditionResponse = data(rendition)
export const renditionsResponse = z.strictObject({ data: z.array(rendition), total: z.number(), limit: z.number(), offset: z.number() })
/** PDF trả trong thân (data URL base64), không qua kho. */
export const renditionExportResponse = data(z.strictObject({ fileName: z.string(), mimeType: z.literal("application/pdf"), base64: z.string(), widthMm: z.number(), heightMm: z.number() }))
