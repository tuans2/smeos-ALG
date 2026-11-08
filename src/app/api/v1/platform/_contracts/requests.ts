import { z } from "zod"

import { setCatalogValueOverrideSchema, setFieldOverrideSchema } from "@/modules/field-platform/adapters/http-schemas"
import { SURVEY_COLUMN_COUNT } from "@/modules/platform/domain/partner-marketplace-row-mapper"
import { MAX_BULK_DELETE_IDS } from "@/modules/platform/domain/partner-marketplace-limits"
import { UX_ROLLOUT_FLAG_KEYS } from "@/modules/platform/domain/ux-rollout-flags"

/**
 * Lược đồ yêu cầu của Console Vận hành Nền tảng `/api/v1/platform/*` (OpenAPI, PO 07/11/2026). Lược đồ zod nào
 * từng khai trong route được chuyển NGUYÊN VĂN về đây và route import lại — một nguồn cho cả kiểm và tài liệu.
 * Thân do hàm parse tự viết ở module kiểm (`billing-account`, `governance-matrix`, `ux-rollout-flags`) khai lược
 * đồ MÔ TẢ, được `tests/unit/platform/platform-request-parity.test.ts` đối chiếu với chính hàm parse.
 */

// credit-pricing/route.ts
export const creditPricingBody = z.object({
  smsCredit: z.number().optional(),
  znsCredit: z.number().optional(),
  usdToVnd: z.number().optional(),
  creditValueVnd: z.number().optional(),
  smsCostVnd: z.number().optional(),
  znsCostVnd: z.number().optional(),
  defaultMonthlyLimit: z.number().int().nullable().optional(),
  /** Tin nhắn gửi khách được âm số dư tối đa chừng này credit */
  messageOverdraftCredit: z.number().int().optional(),
  /** Credit mỗi phương án "Tạo thêm" ở mục Thương hiệu */
  brandExtraOptionCredit: z.number().int().optional(),
})

// custom-domains/[id]/lock/route.ts
export const customDomainLockBody = z.object({ locked: z.boolean(), reason: z.string().max(1000).optional() })

// integrations/governance/route.ts
export const integrationGovernanceBody = z.object({
  scopeId: z.string().min(1).max(64),
  connectorKey: z.string().min(1).max(64),
  mode: z.enum(["FORBID", "INHERIT_ONLY", "ALLOW_OWN"]),
})

// jobs/[id]/action/route.ts
export const failedJobActionBody = z.object({ action: z.enum(["RETRY", "DISMISS"]) })

// marketplace/import-excel/route.ts — trường `mapping` (JSON trong multipart)
export const marketplaceMappingSchema = z.array(z.number().int().min(0).nullable()).length(SURVEY_COLUMN_COUNT)

// marketplace/share-links/route.ts
export const shareLinkBody = z.object({
  label: z.string().max(200),
  days: z.number().int(),
})

// marketplace/stores/bulk-delete/route.ts
export const bulkDeleteStoresBody = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(MAX_BULK_DELETE_IDS) }).strict(),
  z.object({ all: z.literal(true), expectedTotal: z.number().int().min(1) }).strict(),
])

// marketplace/stores/route.ts
export const marketplaceStoresQuery = z.object({
  search: z.string().max(200).optional(),
  field: z.string().max(80).optional(),
  tier: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
})

// nav-matrix/route.ts
export const navMatrixBody = z.object({
  overrides: z.record(z.string(), z.array(z.string())),
})

// notification/channels/route.ts
export const channelActivationBody = z.object({
  channel: z.string().min(1),
  activated: z.boolean(),
})

// notification/hard-locks/route.ts
const NOTIFY_CHANNEL = z.enum(["APP_INBOX", "EMAIL", "PUSH", "TELEGRAM", "ZALO", "SMS", "WHATSAPP", "MESSENGER"])
export const setHardLockBody = z.object({
  eventKey: z.string().min(1),
  channel: NOTIFY_CHANNEL,
  enabled: z.boolean(),
  reason: z.string().optional(),
})
export const removeHardLockBody = z.object({
  eventKey: z.string().min(1),
  channel: NOTIFY_CHANNEL,
})

// notification/visibility/route.ts
export const eventVisibilityBody = z.object({
  eventKey: z.string().min(1),
  tier: z.enum(["INDUSTRY", "CHAIN", "STORE"]),
  visible: z.boolean(),
})

// organizations/[id]/credits/route.ts
export const adjustCreditsBody = z.object({
  kind: z.enum(["TOPUP", "GIFT", "REFUND"]),
  amount: z.number().int(),
  reason: z.string().trim().min(1).max(300),
})

// organizations/[id]/field-overrides/route.ts
export const fieldOverridesBody = z.union([
  z.object({ target: z.literal("field") }).merge(setFieldOverrideSchema),
  z.object({ target: z.literal("catalogValue") }).merge(setCatalogValueOverrideSchema),
])

// organizations/[id]/route.ts
export const organizationPatchBody = z.object({
  target_type: z.enum(["SINGLE", "STORE", "CHAIN"]).optional(), // FLOWER_NETWORK gộp vào CHAIN (ADR-012 T-8b)
  note: z.string().trim().max(500).nullish(),
  unlocked_locales: z.array(z.string().trim()).optional(),
  /** Từ chối yêu cầu mở khóa ngôn ngữ — xóa pending field khỏi settings */
  clear_pending_language_unlock: z.boolean().optional(),
  /** Từ chối yêu cầu chuyển đổi mô hình — xóa pending field khỏi settings */
  clear_pending_model_change: z.boolean().optional(),
  /** Duyệt hoặc từ chối yêu cầu nâng hạn mức chat công khai */
  public_chat_limits_decision: z.enum(["approve", "reject"]).optional(),
  /** Bật/tắt phạm vi chi nhánh đợt 1 (khách hàng) — D-59, ADR-012 T-5 */
  branch_scope_wave1: z.boolean().optional(),
})

// organizations/[id]/subscription/route.ts
export const assignSubscriptionBody = z.object({
  plan: z.string().trim().min(1).max(40),
  cycle: z.enum(["MONTHLY", "YEARLY"]),
  priceVnd: z.number().int(),
  includedCreditsMonthly: z.number().int(),
  firstPeriodPaid: z.boolean().optional(),
})

// organizations/[id]/usage-limit/route.ts
export const usageLimitBody = z.object({ monthlyLimit: z.number().int().nullable() })

// organizations/route.ts
export const createOrganizationBody = z.object({
  organizationName: z.string().trim().min(1).max(120),
  ownerEmail: z.string().trim().min(3).max(200),
  ownerName: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(40).optional(),
  subscription: z.object({
    plan: z.string().trim().min(1).max(40),
    cycle: z.enum(["MONTHLY", "YEARLY"]),
    priceVnd: z.number().int().min(0).max(1_000_000_000),
    includedCreditsMonthly: z.number().int().min(0).max(10_000_000),
    firstPeriodPaid: z.boolean().optional(),
  }).optional(),
})

// orgs-data/[orgId]/legal-hold/route.ts và orgs-data/[orgId]/assets/[assetId]/legal-hold/route.ts
export const legalHoldBody = z.object({
  /** ISO 8601; `null` để gỡ giữ. */
  until: z.string().datetime().nullable(),
  reason: z.string().trim().min(3).max(500),
})

// registrations/[userId]/decision/route.ts
export const registrationDecisionBody = z.object({ decision: z.enum(["APPROVE", "REJECT"]) })

// subscription-invoices/[id]/mark-paid/route.ts
export const markInvoicePaidBody = z.object({ note: z.string().trim().min(1).max(300) })

// tier-preview/route.ts
export const tierPreviewBody = z.object({ roleKey: z.string().min(1).max(64) })

// ── Lược đồ mô tả: thân do hàm parse tự viết ở module kiểm ───────────────────────────────────────────────
/** `parseBillingAccount`: BIN 6 số, số tài khoản 6–20 số, có tên chủ tài khoản (cắt khoảng trắng hai đầu). */
export const billingAccountBody = z.object({
  bankBin: z.string().trim().regex(/^\d{6}$/),
  bankName: z.string().optional(),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/),
  accountHolder: z.string().trim().min(1),
})

/** `parseDecisions`: khoá `^[A-Za-z0-9_.:-]{1,96}$`; mục sai kiểu bị bỏ qua, không báo lỗi. */
const GOVERNANCE_KEY = z.string().regex(/^[A-Za-z0-9_.:-]{1,96}$/)
export const governanceMatrixBody = z.object({
  decisions: z.object({
    overrides: z.record(GOVERNANCE_KEY, z.boolean()).optional(),
    locks: z.record(GOVERNANCE_KEY, z.object({ enabled: z.boolean() })).optional(),
  }),
})

/** `parseUxRolloutFlags`: cờ thiếu hoặc giá trị lạ → `off` (an toàn mặc định là màn cũ). */
const uxRule = z.object({ mode: z.enum(["off", "allowlist", "all"]), organizationIds: z.array(z.string().min(1)).optional() })
export const uxRolloutFlagsBody = z.object({
  flags: z.partialRecord(z.enum(UX_ROLLOUT_FLAG_KEYS), uxRule),
})

// ── Query ────────────────────────────────────────────────────────────────────────────────────────────────
export const auditLogsQuery = z.object({ limit: z.string().regex(/^\d+$/).optional() })
export const behaviorsQuery = z.object({ kind: z.string().optional() })
export const fieldEntityQuery = z.object({ entity: z.enum(["ORDER", "PARTNER"]).optional() })
export const governanceSystemQuery = z.object({ system: z.string() })
export const integrationScopeQuery = z.object({ scope: z.string().optional() })
export const marginQuery = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })
export const hardLocksQuery = z.object({ eventKey: z.string().optional() })
export const exportQuery = z.object({ type: z.enum(["full", "csv"]).optional() })
export const recordsQuery = z.object({ page: z.string().regex(/^\d+$/).optional(), export: z.literal("csv").optional() })
export const usageQuery = z.object({ since: z.iso.datetime().optional() })

// ── Multipart ────────────────────────────────────────────────────────────────────────────────────────────
/** Tệp khảo sát .xlsx/.xls/.csv tối đa 10 MB (`readExcelUpload`); `mapping` là chuỗi JSON `marketplaceMappingSchema`. */
export const excelUploadForm = z.object({ file: z.file(), mapping: z.string().optional() })
export const excelPreviewForm = z.object({ file: z.file() })
