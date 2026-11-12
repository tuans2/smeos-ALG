import { z } from "zod"

import { data, timestamp } from "./responses-orders"

/**
 * Phản hồi thành viên, tổ chức và xác thực (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case
 * (`src/modules/organization`) rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-org.test.ts`.
 */
const membership = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  user_id: z.string(),
  role_id: z.string(),
  branch_id: z.string().nullable(),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED"]),
  invited_at: timestamp,
  joined_at: timestamp.nullable(),
  updated_at: timestamp,
})
export const membershipResponse = z.strictObject({ membership })
export const membersResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      user: z.strictObject({ id: z.string(), name: z.string().nullable(), email: z.string(), phone: z.string().nullable().optional() }),
      role: z.strictObject({ id: z.string(), key: z.string(), name: z.string() }).nullable(),
      branch_id: z.string().nullable(),
      chain_branch_code: z.string().nullable(),
      status: z.string(),
      invited_at: z.string(),
      joined_at: z.string().nullable(),
    })
  ),
  next_cursor: z.null(),
})
/** Mật khẩu tạm trả đúng MỘT lần (`cache-control: no-store`). */
export const staffAccountResponse = data(z.strictObject({ membershipId: z.string(), userId: z.string(), email: z.string(), temporaryPassword: z.string() }))
export const resetPasswordResponse = data(z.strictObject({ email: z.string(), temporaryPassword: z.string() }))
export const memberStatusResponse = data(z.strictObject({ status: z.enum(["ACTIVE", "SUSPENDED"]) }))
export const memberPhoneResponse = data(z.strictObject({ phone: z.string().nullable() }))
export const memberChainBranchResponse = data(z.strictObject({ chainBranchCode: z.string().nullable() }))
export const chainBranchesResponse = data(z.array(z.strictObject({ code: z.string(), name: z.string() })))

const organization = z.strictObject({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  credit_balance: z.number(),
  settings: z.record(z.string(), z.unknown()).nullable(),
})
export const currentOrganizationResponse = organization
export const organizationsResponse = z.strictObject({
  data: z.array(z.strictObject({ id: z.string(), name: z.string(), slug: z.string(), type: z.string(), lifecycle_status: z.string() })),
  next_cursor: z.null(),
})
const TIER = z.enum(["MOTHER", "INDUSTRY", "CHAIN", "STORE"])
const decisions = z.strictObject({ overrides: z.record(z.string(), z.boolean()), locks: z.record(z.string(), z.strictObject({ enabled: z.boolean() })) })
export const governanceMatrixResponse = data(
  z.strictObject({
    system: z.enum(["PROMOTIONS", "COMMITMENTS", "POLICIES", "PAYMENTS", "CRAFT_FEES", "TEMPLATES"]),
    tier: TIER,
    own: decisions,
    upper: z.array(z.strictObject({ tier: TIER, decisions })),
  })
)
export const upgradeRequestResponse = z.strictObject({
  recorded: z.literal(true),
  pendingChange: z.strictObject({ requested_type: z.enum(["CHAIN", "STORE", "SINGLE"]), requested_at: z.string(), requested_by: z.string(), note: z.string().nullable() }),
})
export const languageUnlockResponse = z.strictObject({
  recorded: z.literal(true),
  pendingRequest: z.strictObject({ requested_locales: z.array(z.enum(["vi", "en"])), requested_at: z.string(), requested_by: z.string(), note: z.string().nullable() }),
})
const brand = z.strictObject({
  primary: z.string(),
  primaryDark: z.string().optional(),
  primaryMuted: z.string().optional(),
  primaryBorder: z.string().optional(),
  accent: z.string().optional(),
  logoUrl: z.string().optional(),
})
/** `null` khi tổ chức chưa đặt thương hiệu. */
export const brandResponse = brand.nullable()
export const savedBrandResponse = brand

export const sessionResponse = z.strictObject({
  user: z.strictObject({ id: z.string(), name: z.string().nullable(), email: z.string(), mustChangePassword: z.boolean() }),
  organization: z
    .strictObject({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      type: z.string(),
      industry: z.string(),
      industry_locked: z.boolean(),
      unlocked_tools: z.array(z.string()).nullable().optional(),
      pending_model_change: z.unknown(),
    })
    .nullable(),
  workspace: z.strictObject({ id: z.string(), kind: z.string() }).nullable(),
  membership: z.strictObject({ role_key: z.string().nullable(), branch_id: z.string().nullable() }).nullable(),
  capabilities: z.array(z.string()),
  credit_balance: z.number().nullable(),
})
export const sessionStatusResponse = z.strictObject({ active: z.literal(true) })
export const loginResponse = z.strictObject({ user_id: z.string(), organization_id: z.string() })
export const logoutResponse = z.strictObject({ data: z.strictObject({ logged_out: z.literal(true) }) })
const pending = { status: z.literal("PENDING_APPROVAL"), message: z.string() }
export const signupResponse = z.strictObject({ user_id: z.string(), organization_id: z.string(), ...pending })
export const instantTrialResponse = z.strictObject({
  user_id: z.string(),
  organization_id: z.string(),
  organization_name: z.string(),
  industry_key: z.string(),
  ...pending,
})
