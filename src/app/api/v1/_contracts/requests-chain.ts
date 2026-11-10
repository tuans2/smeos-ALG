import { z } from "zod"

import { INPUT_DOMAIN_KEYS } from "@/modules/field-platform/domain/input-domains"

/**
 * Lược đồ yêu cầu của `/api/v1/branches/*`, `/api/v1/branch-portal/*`, `/api/v1/chain/*` (OpenAPI nội bộ, PO
 * 07/11/2026). Lược đồ từng khai trong 4 route được chuyển NGUYÊN VĂN về đây và route import lại. `collectionProfileBody`
 * chỉ để MÔ TẢ: route hồ sơ thu thập đọc `rules` thô (ép kiểu, không kiểm từng quy tắc) — use-case kiểm luật nghiệp vụ.
 */

// branches/route.ts
export const createBranchBody = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().min(1).nullish(),
})

// branches/[id]/route.ts
export const updateBranchBody = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).nullish(),
  is_active: z.boolean().optional(),
})

// chain/partner-stores/route.ts
export const registerPartnerStoreBody = z.object({
  name: z.string().min(2, "Tên cửa hàng phải có ít nhất 2 ký tự"),
  code: z.string().min(2, "Mã cửa hàng phải có ít nhất 2 ký tự"),
  address: z.string().nullish(),
  legalEntityId: z.string().min(2, "Mã pháp nhân / MST đối tác là bắt buộc"),
  fieldCeilings: z.record(z.string(), z.enum(["NONE", "AGGREGATED", "MASKED", "RAW"] as const)),
  validUntil: z.string().optional(),
})

// chain/links/[id]/leave/route.ts
export const leaveChainBody = z.object({ reason: z.string().trim().min(3, "Nêu lý do rời chuỗi").max(500) })

// ── Chỉ mô tả — route tự đọc ────────────────────────────────────────────────
export const propagationTargetSchema = z.enum(["NONE", "MASKED", "AGGREGATED", "RAW"])

export const collectionRuleSchema = z.object({
  ruleId: z.string(),
  fieldKey: z.string().optional(),
  domainKey: z.enum(INPUT_DOMAIN_KEYS).optional(),
  minForm: propagationTargetSchema,
  maxForm: propagationTargetSchema.optional(),
  purpose: z.string().optional(),
  scope: z.object({ type: z.enum(["ALL_STORES", "BRAND", "REGION", "SPECIFIC_STORES"]), targetIds: z.array(z.string()).optional() }),
  effectiveFrom: z.string().optional(),
  backfill: z.enum(["NONE", "FROM_EFFECTIVE", "FULL"]).optional(),
  mandatoryForNewStore: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]),
})

/** `chain/collection-profile` PUT và `…/preview` POST: thiếu `rules` hoặc không phải mảng hiện trả 500 (audit API §17). */
export const collectionProfileBody = z.object({ rules: z.array(collectionRuleSchema) })
