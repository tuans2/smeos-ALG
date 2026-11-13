import { z } from "zod"

import { pageQuery } from "@/core/http/pagination"

/**
 * Lược đồ yêu cầu nhóm quản trị & AI: `/api/v1/roles/*`, `/api/v1/workspaces`, `/api/v1/audit-logs/*`,
 * `/api/v1/subscription`, `/api/v1/billing/sepay`, `/api/v1/ux-rollout-flags`, `/api/v1/ai-policy`,
 * `/api/v1/ai-capabilities`, `/api/v1/ai-requests/*`, `/api/v1/content-guard/*` — OpenAPI nội bộ, PO 07/11/2026. Lược đồ
 * từng khai trong 7 route được chuyển NGUYÊN VĂN về đây và route import lại. Query chỉ để mô tả (trừ `platform-access`,
 * route `defineRoute` dùng thẳng `pageQuery`).
 */

// roles/route.ts
export const createRoleBody = z.object({ name: z.string().min(1) })

// roles/[id]/capabilities/route.ts
export const updateRoleCapabilitiesBody = z.object({
  changes: z
    .array(z.object({ code: z.string().min(1), allowed: z.boolean() }))
    .min(1),
})

// workspaces/route.ts
export const createWorkspaceBody = z.object({
  name: z.string().min(1),
  kind: z.enum(["EXPERIENCE", "PRODUCTION"]),
})

// billing/sepay/route.ts
export const sepayPlatformWebhookBody = z.object({
  id: z.union([z.number().int(), z.string().min(1).max(64)]),
  transferType: z.string().max(10),
  transferAmount: z.number().nonnegative().max(100_000_000_000),
  content: z.string().max(2000).default(""),
})

// ai-policy/route.ts
export const putAiPolicyBody = z.object({
  capability_code: z.string().min(1),
  allowed_models: z.array(z.string().min(1)).max(20),
  quality_target: z.enum(["thap", "trung_binh", "cao"]).nullable().optional(),
  cost_ceiling: z.number().int().nonnegative().nullable().optional(),
  privacy_floor: z.enum(["PUBLIC", "SHOP", "SENSITIVE"]),
})

// ai-requests/review/route.ts
export const reviewAiRequestBody = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "modify"]),
  note: z.string().max(1000).nullish(),
})

// content-guard/validate/route.ts
export const validateContentBody = z.object({
  text: z.string().min(1, "Văn bản kiểm duyệt không được để trống"),
  auto_sanitize: z.boolean().optional(),
})

// ── Chỉ mô tả ───────────────────────────────────────────────────────────────
const int = z.string().regex(/^-?\d+$/)
export const auditLogsQuery = z.object({
  limit: int.optional(),
  cursor: z.string().optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  user_id: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
export const platformAccessQuery = z.object(pageQuery)
export const aiRequestsQuery = z.object({ capability_code: z.string().optional(), from: z.string().optional(), to: z.string().optional(), limit: int.optional() })
export const reviewQueueQuery = z.object({ limit: int.optional() })
