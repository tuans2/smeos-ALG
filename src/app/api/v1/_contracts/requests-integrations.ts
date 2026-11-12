import { z } from "zod"

/**
 * Lược đồ yêu cầu của `/api/v1/integrations/*` (Trung tâm Tích hợp), `/api/v1/integration-tokens/*` (token cho engine
 * ngoài) và `/api/v1/sso/*` (OpenAPI nội bộ, PO 07/11/2026). Lược đồ từng khai trong 7 route được chuyển NGUYÊN VĂN về
 * đây và route import lại (đăng/gỡ tin dùng chung một lược đồ giống hệt nhau).
 */

// integration-tokens/route.ts
export const issueIntegrationTokenBody = z.object({
  client: z.enum(["LOCALBUDD", "SOCIALFLOW"]),
  ttl_days: z.number().int().optional(),
})

// integrations/connections/route.ts
export const connectBody = z.object({
  connector_key: z.string().min(1).max(64),
  secret: z.string().min(1).max(4096),
  options: z.record(z.string(), z.unknown()).optional(),
})

// integrations/connections/[id]/rotate/route.ts
export const rotateSecretBody = z.object({ secret: z.string().min(1).max(4096) })

// integrations/connections/[id]/events/route.ts
export const connectionEventsQuery = z.object({
  status: z.enum(["PENDING", "DONE", "FAILED", "DEAD"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

// integrations/connections/[id]/sales/publish/route.ts, …/unpublish/route.ts
export const salesProductsBody = z.object({ product_ids: z.array(z.string().min(1).max(64)).min(1).max(100) })

// integrations/governance/route.ts
export const governanceBody = z.object({
  connector_key: z.string().min(1).max(64),
  mode: z.enum(["FORBID", "INHERIT_ONLY", "ALLOW_OWN"]),
})
