import { z } from "zod"

/**
 * Phản hồi nhóm quản trị & AI (OpenAPI nội bộ, PO 07/11/2026): `roles`, `workspaces`, `ux-rollout-flags`, `audit-logs`,
 * `subscription`, `ai-policy`, `ai-capabilities`, `ai-requests`, `content-guard`. Sinh từ dòng Prisma (`roles`,
 * `workspaces`, `audit_logs`, `ai_requests`) và kiểu TS của `organization`, `audit`, `subscription`, `ai-governance`,
 * `core/ai`, đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-admin.test.ts`.
 */
const timestamp = z.iso.datetime()
const text = z.string().nullable()

export const rolesResponse = z.strictObject({
  data: z.array(z.strictObject({ id: z.string(), key: z.string(), name: z.string(), is_system: z.boolean(), capabilities: z.array(z.string()) })),
  next_cursor: z.null(),
})
/** Dòng `roles` nguyên bản; `key` sinh từ tên. */
export const roleCreatedResponse = z.strictObject({
  role: z.strictObject({ id: z.string(), organization_id: z.string(), key: z.string(), name: z.string(), is_system: z.boolean(), created_at: timestamp }),
})
/** Mã năng lực của vai trò sau khi áp mọi thay đổi. */
export const roleCapabilitiesResponse = z.strictObject({ capabilities: z.array(z.string()) })

const workspace = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  kind: z.enum(["EXPERIENCE", "PRODUCTION"]),
  trial_count: z.number(),
  trial_limit: z.number().nullable(),
  trial_reset_at: timestamp.nullable(),
  trial_status: text,
  created_at: timestamp,
})
export const workspacesResponse = z.strictObject({ data: z.array(workspace), next_cursor: z.null() })
export const workspaceCreatedResponse = z.strictObject({ workspace })

export const uxFlagsResponse = z.strictObject({ data: z.strictObject({ enabled: z.array(z.string()) }) })

/** Dòng `audit_logs` nguyên bản. */
export const auditLogsResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      organization_id: z.string(),
      user_id: z.string(),
      action: z.string(),
      entity_type: z.string(),
      entity_id: z.string(),
      before: z.unknown(),
      after: z.unknown(),
      ip: text,
      user_agent: text,
      decision_id: text,
      ownership: text,
      decided_by: text,
      created_at: timestamp,
    })
  ),
  next_cursor: z.string().nullable(),
})
export const platformAccessResponse = z.strictObject({
  data: z.array(z.strictObject({ id: z.string(), created_at: timestamp, operator_name: z.string(), purpose: z.string(), purpose_label: z.string() })),
  next_cursor: z.string().nullable(),
})

export const subscriptionResponse = z.strictObject({
  data: z.strictObject({
    /** Chưa gán gói → `null`. */
    subscription: z
      .strictObject({
        plan: z.string(),
        planLabel: z.string(),
        cycle: z.string(),
        priceVnd: z.number(),
        status: z.string(),
        currentPeriodEnd: timestamp,
        includedCreditsMonthly: z.number(),
      })
      .nullable(),
    invoices: z.array(
      z.strictObject({
        id: z.string(),
        code: z.string(),
        periodStart: timestamp,
        periodEnd: timestamp,
        amountVnd: z.number(),
        status: z.string(),
        dueAt: timestamp,
        paidAt: timestamp.nullable(),
        /** Chỉ hoá đơn `PENDING` khi nền tảng đã khai tài khoản nhận tiền; nội dung chuyển khoản = mã hoá đơn. */
        payment: z
          .strictObject({ bankName: z.string(), accountNumber: z.string(), accountHolder: z.string(), transferContent: z.string(), qrImageUrl: z.string() })
          .nullable(),
      })
    ),
  }),
})

/** Không khớp hoá đơn vẫn 200 (SePay không gửi lại); `reason` cho Console đối soát tay. */
export const sepayWebhookResponse = z.strictObject({
  success: z.literal(true),
  matched: z.boolean(),
  reason: z.enum(["not_incoming", "no_invoice_code", "invoice_not_pending", "amount_short", "already_paid"]).optional(),
})

const model = z.strictObject({
  key: z.string(),
  display_name: z.string(),
  measure_state: z.string(),
  leaves_infra: z.boolean(),
  cost_class: z.string(),
  quality_class: z.string(),
})
const KIND = z.enum(["generative", "measuring", "deterministic"])
/** `allowed_models` rỗng = chưa siết (mọi mô hình đủ điều kiện). Không bọc `{ data }`. */
export const aiPolicyResponse = z.strictObject({
  capabilities: z.array(
    z.strictObject({
      capability_code: z.string(),
      capability_name: z.string(),
      module: z.string(),
      kind: KIND,
      needs_approval: z.boolean(),
      allowed_models: z.array(model),
      privacy_floor: z.string(),
      quality_target: text,
      cost_ceiling: z.number().nullable(),
      accept_threshold: z.number().nullable(),
      measure_channels: z.array(z.string()),
      requires_vision_engine_capability: z.boolean(),
    })
  ),
})
export const aiCapabilitiesResponse = z.strictObject({
  capabilities: z.array(
    z.strictObject({
      code: z.string(),
      name: z.string(),
      module: z.string(),
      kind: KIND,
      needs_approval: z.boolean(),
      privacy_floor: z.string(),
      accept_threshold: z.number().nullable(),
      measure_channels: z.array(z.string()),
      models: z.array(model),
    })
  ),
})

const OUTCOME = z.enum(["ACCEPTED", "ESCALATED", "FAILED", "NEEDS_REVIEW"])
const aiRequestFields = {
  id: z.string(),
  job_id: text,
  capability_code: z.string(),
  model_key: z.string(),
  attempt: z.number(),
  escalated_from: text,
  fallback_from: text,
  source: z.string(),
  cost_usd: z.number().nullable(),
  latency_ms: z.number().nullable(),
  quality_score: z.number().nullable(),
  outcome: OUTCOME,
  created_at: timestamp,
}
/** Không bao giờ có prompt hay đầu ra (bảng không giữ). Trần 5.000 dòng. */
export const aiRequestsResponse = z.strictObject({ data: z.array(z.strictObject(aiRequestFields)) })
export const aiSummaryResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      capability_code: z.string(),
      model_key: z.string(),
      calls: z.number(),
      accepted: z.number(),
      escalated: z.number(),
      failed: z.number(),
      needs_review: z.number(),
      cost_usd: z.number(),
      latency_ms_avg: z.number().nullable(),
      quality_score_avg: z.number().nullable(),
      escalation_rate: z.number(),
    })
  ),
})
export const reviewQueueResponse = z.strictObject({ data: z.array(z.strictObject({ ...aiRequestFields, organization_id: z.string() })) })
export const reviewDecisionResponse = z.strictObject({
  id: z.string(),
  capability_code: z.string(),
  model_key: z.string(),
  outcome: z.enum(["ACCEPTED", "FAILED", "NEEDS_REVIEW"]),
  previous_outcome: z.string(),
  action: z.enum(["approve", "reject", "modify"]),
  note: text,
})

const match = z.strictObject({
  ruleId: z.string(),
  phrase: z.string(),
  level: z.enum(["HARD_BLOCK", "WARNING"]),
  category: z.string(),
  reason: z.string(),
  suggestedReplacement: z.string(),
  index: z.number(),
})
export const contentGuardResponse = z.strictObject({
  valid: z.boolean(),
  hasWarnings: z.boolean(),
  hardBlocks: z.array(match),
  warnings: z.array(match),
  /** Chỉ khi `auto_sanitize: true`. */
  sanitizedText: z.string().optional(),
  /** Phong cách cấm lấy từ hồ sơ thương hiệu. */
  forbiddenStylesApplied: text,
})
