import { z } from "zod"

/**
 * Phản hồi Console Vận hành Nền tảng — tổ chức, thu phí, credit, vận hành (OpenAPI `/platform/*`, PO 07/11/2026).
 * Sinh từ kiểu TS của use-case (`src/modules/platform`, `subscription`, `custom-domain`) rồi kiểm bằng phản hồi thật
 * ở `tests/platform/platform-contract-*.test.ts`. Khoá giữ nguyên như mã trả (camelCase, vài chỗ snake_case cũ).
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })

const organizationRow = {
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  creditBalance: z.number(),
  createdAt: timestamp,
  memberCount: z.number(),
}
export const organizationsResponse = data(z.array(z.strictObject(organizationRow)))

const requestMeta = { requested_at: z.string(), requested_by: z.string().optional(), note: z.string().nullable().optional() }
export const organizationResponse = data(
  z.strictObject({
    ...organizationRow,
    branchCount: z.number(),
    workspaceKinds: z.array(z.string()),
    lifecycleStatus: z.enum(["ACTIVE", "SUSPENDED", "OFFBOARDING", "DELETED"]), // ADR-016 D-S5
    offboardingUntil: timestamp.nullable(),
    unlockedLocales: z.array(z.string()).optional(),
    pendingLanguageUnlock: z.strictObject({ requested_locales: z.array(z.string()), ...requestMeta }).nullable().optional(),
    pendingModelChange: z.strictObject({ requested_type: z.string(), ...requestMeta }).nullable().optional(),
  })
)

/** PATCH trả kết quả của thao tác cuối cùng trong thân (đổi mô hình, mở ngôn ngữ, gỡ yêu cầu, hạn mức chat, phạm vi chi nhánh, vòng đời). */
export const organizationPatchResponse = data(
  z.union([
    z.strictObject({ success: z.literal(true), targetType: z.enum(["CHAIN", "STORE", "EXPERIENCE", "SINGLE"]), organizationId: z.string() }),
    z.strictObject({ success: z.literal(true), action: z.enum(["approved", "rejected", "clear_pending_language_unlock", "clear_pending_model_change"]) }),
    z.strictObject({ success: z.literal(true), branchScopeWave1: z.boolean() }),
    z.strictObject({ success: z.literal(true), lifecycleStatus: z.enum(["ACTIVE", "SUSPENDED", "OFFBOARDING"]), offboardingUntil: timestamp.nullable() }),
    z.strictObject({ success: z.literal(true), organizationId: z.string(), unlockedLocales: z.array(z.string()) }),
    z.strictObject({ success: z.literal(true) }),
  ])
)

export const createOrganizationResponse = data(
  z.strictObject({
    ownerEmail: z.string(),
    /** Mật khẩu tạm của chủ tiệm — trả ĐÚNG MỘT LẦN, không lưu, không ghi log. */
    temporaryPassword: z.string(),
    organizationId: z.string(),
    slug: z.string(),
    userId: z.string(),
  })
)

const monthly = z.strictObject({
  period: z.string(),
  credit: z.strictObject({ used: z.number(), limit: z.number().nullable() }),
  ai: z.strictObject({ used: z.number(), limit: z.number().nullable() }),
})
export const creditsResponse = data(
  z.strictObject({
    balance: z.number(),
    entries: z.array(
      z.strictObject({
        id: z.string(),
        kind: z.enum(["OPENING", "TOPUP", "GIFT", "REFUND", "USAGE", "EXPIRE"]),
        amount: z.number(),
        balanceAfter: z.number(),
        service: z.string().nullable(),
        reason: z.string().nullable(),
        reference: z.string().nullable(),
        createdAt: z.string(),
      })
    ),
    monthly,
  })
)
export const adjustCreditsResponse = data(z.strictObject({ balance: z.number() }))
export const usageLimitResponse = data(monthly)

const subscription = z.strictObject({
  status: z.enum(["ACTIVE", "CANCELLED", "OVERDUE"]),
  id: z.string(),
  organization_id: z.string(),
  plan: z.string(),
  cycle: z.enum(["MONTHLY", "YEARLY"]),
  price_vnd: z.number(),
  included_credits_monthly: z.number(),
  current_period_start: timestamp,
  current_period_end: timestamp,
  plan_credit_period: z.string().nullable(),
  plan_credit_granted: z.number(),
})
export const subscriptionResponse = data(
  z.strictObject({
    subscription: subscription.nullable(),
    invoices: z.array(
      z.strictObject({
        id: z.string(),
        code: z.string(),
        periodStart: z.string(),
        periodEnd: z.string(),
        amountVnd: z.number(),
        status: z.string(),
        dueAt: z.string(),
        paidAt: z.string().nullable(),
        payment: z
          .strictObject({ bankName: z.string(), accountNumber: z.string(), accountHolder: z.string(), transferContent: z.string(), qrImageUrl: z.string() })
          .nullable(),
      })
    ),
  })
)
export const assignSubscriptionResponse = data(subscription)
export const cancelSubscriptionResponse = data(z.strictObject({ cancelled: z.literal(true) }))
export const markInvoicePaidResponse = data(z.strictObject({ id: z.string(), organizationId: z.string() }))

const billingAccount = z.strictObject({ bankBin: z.string(), bankName: z.string(), accountNumber: z.string(), accountHolder: z.string() })
export const billingAccountResponse = data(billingAccount.nullable())
export const setBillingAccountResponse = data(billingAccount)

export const creditPricingResponse = data(
  z.strictObject({
    smsCredit: z.number(),
    znsCredit: z.number(),
    usdToVnd: z.number(),
    creditValueVnd: z.number(),
    smsCostVnd: z.number(),
    znsCostVnd: z.number(),
    defaultMonthlyLimit: z.number().nullable(),
    messageOverdraftCredit: z.number(),
    brandExtraOptionCredit: z.number(),
  })
)

const customDomain = z.strictObject({
  id: z.string(),
  hostname: z.string(),
  status: z.enum(["PENDING", "VERIFIED", "LOCKED"]),
  statusText: z.string(),
  certificateStatus: z.enum(["NOT_REQUESTED", "REQUESTED", "MANUAL", "FAILED"]),
  verifiedAt: z.string().nullable(),
  lastCheckedAt: z.string().nullable(),
  lockedReason: z.string().nullable(),
  records: z.array(z.strictObject({ type: z.enum(["TXT", "CNAME"]), name: z.string(), value: z.string(), purpose: z.string() })),
})
export const customDomainsResponse = data(z.array(customDomain))
export const customDomainLockResponse = data(customDomain)

export const pendingApprovalsResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      organizationId: z.string(),
      organizationName: z.string(),
      organizationSlug: z.string(),
      type: z.enum(["LANGUAGE_UNLOCK", "MODEL_CHANGE", "PUBLIC_CHAT_LIMITS"]),
      requestedAt: z.string(),
      requestedBy: z.string().optional(),
      note: z.string().nullable().optional(),
      requestedLocales: z.array(z.string()).optional(),
      requestedModelType: z.string().optional(),
      requestedLimits: z.strictObject({ perVisitor: z.number(), perIp: z.number() }).optional(),
    })
  ),
  total: z.number(),
})

export const registrationsResponse = data(
  z.array(
    z.strictObject({
      userId: z.string(),
      email: z.string(),
      name: z.string().nullable(),
      createdAt: z.string(),
      organizationId: z.string().nullable(),
      organizationName: z.string().nullable(),
      /** Đăng ký qua "Dùng thử" — duyệt xong cấp mật khẩu tạm. */
      instantTrial: z.boolean(),
      leadPhone: z.string().nullable(),
    })
  )
)
export const registrationDecisionResponse = data(
  z.strictObject({ status: z.enum(["APPROVED", "REJECTED"]), temporaryPassword: z.string().optional() })
)

const health = z.strictObject({
  jobCountsByStatus: z.record(z.string(), z.number()),
  stuckJobs: z.array(z.strictObject({ id: z.string(), organizationId: z.string(), feature: z.string(), startedAt: timestamp.nullable() })),
  queue: z.array(z.strictObject({ feature: z.string(), pending: z.number(), oldestPendingAt: timestamp.nullable(), failedLast24h: z.number() })),
  workers: z.array(z.strictObject({ name: z.string(), connections: z.number() })),
})
export const healthResponse = data(health)
export const overviewResponse = data(
  z.strictObject({
    organizations: z.strictObject({ withoutSubscription: z.number(), total: z.number(), active: z.number(), overdue: z.number(), cancelled: z.number() }),
    subscriptionRevenue: z.array(z.strictObject({ period: z.string(), amountVnd: z.number() })),
    /** `null` khi người xem thiếu `N5`. */
    health: health.nullable(),
  })
)

export const failedJobsResponse = data(
  z.array(
    z.strictObject({
      id: z.string(),
      organizationId: z.string(),
      organizationName: z.string(),
      feature: z.string(),
      failureKind: z.string().nullable(),
      error: z.string().nullable(),
      attempts: z.number(),
      createdAt: timestamp,
      completedAt: timestamp.nullable(),
    })
  )
)
export const failedJobActionResponse = data(z.strictObject({ status: z.enum(["PENDING", "CANCELLED"]) }))

export const usageResponse = data(
  z.array(z.strictObject({ organizationId: z.string(), organizationName: z.string(), feature: z.string(), quantity: z.number(), costCredit: z.number() }))
)

const marginNumbers = {
  revenueVnd: z.number(),
  costVnd: z.number(),
  marginVnd: z.number(),
  marginPercent: z.number().nullable(),
  creditUsed: z.number(),
  aiCostUsd: z.number(),
  messageCostVnd: z.number(),
}
export const marginResponse = data(
  z.strictObject({
    period: z.string(),
    rates: z.strictObject({ usdToVnd: z.number(), creditValueVnd: z.number() }),
    rows: z.array(z.strictObject({ ...marginNumbers, organizationId: z.string(), organizationName: z.string() })),
    total: z.strictObject(marginNumbers),
  })
)

export const auditLogsResponse = data(
  z.array(
    z.strictObject({
      id: z.string(),
      source: z.enum(["organization", "platform"]),
      organizationId: z.string().nullable(),
      userId: z.string(),
      action: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      createdAt: timestamp,
    })
  )
)

export const tierPreviewResponse = data(
  z.strictObject({ roleKey: z.string(), organizationType: z.string(), orgNameSuffix: z.string(), entryHref: z.string() })
)
export const clearTierPreviewResponse = data(z.strictObject({ cleared: z.literal(true) }))
