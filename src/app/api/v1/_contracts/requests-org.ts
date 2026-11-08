import { z } from "zod"

import { isKnownIndustryKey } from "@/modules/organization/domain/industry-profile"

/**
 * Lược đồ yêu cầu của thành viên `/members/*`, tổ chức `/organizations/*`, `/organization/brand` và xác thực
 * `/auth/*` (OpenAPI nội bộ, PO 07/11/2026). Lược đồ zod từng khai trong route được chuyển NGUYÊN VĂN về đây và route
 * import lại.
 */

// members/route.ts
export const createStaffBody = z.object({
  name: z.string().max(100),
  email: z.string().max(200),
  role_id: z.string().min(1).max(64),
  branch_id: z.string().min(1).max(64).nullish(),
  phone: z.string().max(20).nullish(),
})
// members/invite/route.ts
export const inviteMemberBody = z.object({
  email: z.string().min(1),
  role_id: z.string().min(1),
  branch_id: z.string().min(1).nullish(),
})
// members/[id]/chain-branch/route.ts
export const memberChainBranchBody = z.object({ chain_branch_code: z.string().min(1).max(64).nullable() })
// members/[id]/phone/route.ts
export const memberPhoneBody = z.object({ phone: z.string().max(20).nullable() })
// members/[id]/role/route.ts
export const memberRoleBody = z.object({ role_id: z.string().min(1) })
// members/[id]/status/route.ts
export const memberStatusBody = z.object({ active: z.boolean() })

// organizations/current/route.ts
export const patchOrganizationBody = z.object({
  name: z.string().min(1).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})
// organizations/current/language-unlock-request/route.ts
export const languageUnlockBody = z.object({
  note: z.string().trim().max(500).nullish(),
})
// organizations/current/upgrade-request/route.ts
export const upgradeRequestBody = z.object({
  requested_type: z.enum(["SINGLE", "STORE", "CHAIN"]), // FLOWER_NETWORK gộp vào CHAIN (ADR-012 T-8b)
  note: z.string().trim().min(1).max(500).nullish(),
})
/** `isGovernanceSystem` — ma trận quản trị theo tầng. */
export const governanceQuery = z.object({ system: z.enum(["PROMOTIONS", "COMMITMENTS", "POLICIES", "PAYMENTS", "CRAFT_FEES", "TEMPLATES"]) })

// auth/login/route.ts
export const loginBody = z.object({
  email: z.string(),
  password: z.string(),
})
// auth/signup/route.ts
// Giới hạn đầu vào (rà soát cụm B, 22/10/2026): trước đó chuỗi dài tuỳ ý, mã ngành tuỳ ý bị khoá vĩnh viễn
export const signupBody = z.object({
  email: z.string().max(254),
  password: z.string().max(200),
  name: z.string().max(120).nullish(),
  organization_name: z.string().max(120),
  industry_key: z.string().nullish().refine((k) => k == null || isKnownIndustryKey(k), "Ngành nghề không hợp lệ"),
  organization_type: z.enum(["SINGLE", "CHAIN"]).default("SINGLE"),
})
// auth/instant-trial/route.ts
export const instantTrialBody = z.object({
  name: z.string().min(1, "Vui lòng nhập họ và tên").max(120),
  phone: z.string().trim().regex(/^\+?\d[\d .-]{7,18}$/, "Vui lòng nhập số điện thoại hoặc Zalo hợp lệ"),
  email: z.string().max(254).email("Địa chỉ email không hợp lệ"),
  industry_key: z.string().nullish().refine((k) => k == null || isKnownIndustryKey(k), "Ngành nghề không hợp lệ"),
})
