import { z } from "zod"

import { INPUT_DOMAIN_KEYS } from "@/modules/field-platform/domain/input-domains"

import { collectionRuleSchema, propagationTargetSchema } from "./requests-chain"

/**
 * Phản hồi `/api/v1/branches/*`, `/api/v1/branch-portal/*`, `/api/v1/chain/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ
 * kiểu TS của use-case (`organization`, `greeting-card/branch-portal`, `field-platform`, `chain-partnership`) rồi kiểm
 * bằng phản hồi thật ở `tests/tenant/internal-contract-chain-org.test.ts`.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const DOMAIN = z.enum(INPUT_DOMAIN_KEYS)

/** Dòng `branches` nguyên bản — route trả thẳng bản ghi. */
const branch = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable(),
  is_active: z.boolean(),
  accepts_dispatch: z.boolean(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  service_wards: z.unknown().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  quality_score: z.number(),
  active_jobs_count: z.number(),
  max_concurrent_jobs: z.number(),
  channels: z.unknown().nullable(),
  zalo_link_code: z.string().nullable(),
  cancellation_count: z.number(),
  bypass_count: z.number(),
  cancellation_history: z.unknown().nullable(),
  bypass_history: z.unknown().nullable(),
  /** Chi nhánh là cửa hàng đối tác đã liên kết (ứng viên bắn đơn `DT-<mã>`, chat nội bộ GĐ3); null = chi nhánh của chuỗi */
  partner_org_id: z.string().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
})
/** `next_cursor` luôn `null` — danh sách chưa phân trang. */
export const branchesResponse = z.strictObject({ data: z.array(branch), next_cursor: z.null() })
export const branchResponse = z.strictObject({ branch })

export const branchPortalOrdersResponse = data(
  z.strictObject({
    /** `null` khi tài khoản không gắn chi nhánh chuỗi nào — khi đó `orders` rỗng. */
    branch: z.strictObject({ code: z.string(), name: z.string() }).nullable(),
    orders: z.array(
      z.strictObject({
        orderCode: z.string(),
        stage: z.enum(["INVITED", "GRACE", "IN_PROGRESS"]),
        deliveryAddress: z.string(),
        deliveryTime: z.string(),
        subcontractPriceVnd: z.number().nullable(),
        deadlineAt: z.string().nullable(),
        productionStatus: z.string().nullable(),
        cardUrl: z.string(),
      })
    ),
  })
)

const ruleOut = collectionRuleSchema.strict()
const profile = z.strictObject({
  organizationId: z.string(),
  profileVersion: z.number(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  rules: z.array(ruleOut),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
})
const fieldDefinition = z.strictObject({
  fieldKey: z.string(),
  fieldName: z.strictObject({ vi: z.string(), en: z.string() }),
  domain: DOMAIN,
  verticalPack: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "DEPRECATED", "REMOVED"]),
  sinceVersion: z.string(),
  removeIn: z.string().optional(),
  replacementField: z.string().optional(),
  dataLayer: z.enum(["L1", "L2", "L3", "L4", "L5", "L6"]),
  ownerScope: z.string(),
  dataType: z.string(),
  unit: z.string().optional(),
  currency: z.string().optional(),
  sensitivity: z.enum(["S0_PUBLIC", "S1_INTERNAL", "S2_CONFIDENTIAL", "S3_SECRET"]),
  pii: z.strictObject({
    isPii: z.boolean(),
    piiCategory: z.enum(["GENERAL", "SENSITIVE"]).optional(),
    purpose: z.string().optional(),
    legalBasis: z.enum(["CONSENT", "CONTRACT", "LEGAL_OBLIGATION", "LEGITIMATE_INTEREST"]).optional(),
    retentionDays: z.number().optional(),
    erasureMode: z.enum(["DELETE", "ANONYMIZE"]).optional(),
  }),
  requiredStage: z.enum(["G1", "G2", "G3", "OPTIONAL"]),
  defaultValue: z.unknown().optional(),
  validation: z
    .strictObject({ min: z.number().optional(), max: z.number().optional(), pattern: z.string().optional(), allowedValues: z.array(z.union([z.string(), z.number()])).optional() })
    .optional(),
  sourceType: z.enum(["MANUAL", "IMPORT", "SYNC", "COMPUTED", "AI_PROPOSED"]),
  staleAfterDays: z.number().optional(),
  aiAccess: z.strictObject({ customerFacing: z.string(), staffFacing: z.string(), analytics: z.string() }),
  maskRule: z.enum(["MASK_MIDDLE", "HASH", "ROUND_NUMBER", "REDACT"]).optional(),
  aiMayPropose: z.boolean(),
  propagation: z.strictObject({
    toChain: propagationTargetSchema,
    toPlatform: propagationTargetSchema,
    ceiling: z.strictObject({ toChain: propagationTargetSchema, toPlatform: propagationTargetSchema }),
    chainSelectable: z.boolean(),
    chainDefault: z.boolean(),
    allowedPrograms: z.array(z.string()).optional(),
  }),
  exportable: z.boolean(),
  usedBy: z.array(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
})
export const collectionProfileResponse = data(z.strictObject({ profile, collectableFields: z.array(fieldDefinition) }))
export const collectionProfilePublishedResponse = data(profile)
export const collectionProfilePreviewResponse = data(
  z.strictObject({
    validation: z.strictObject({
      isValid: z.boolean(),
      issues: z.array(
        z.strictObject({
          fieldKey: z.string().optional(),
          ruleId: z.string().optional(),
          code: z.enum(["S3_NOT_SELECTABLE", "FLOOR_EXCEEDS_CEILING", "PURPOSE_REQUIRED_FOR_S2", "DSA_CEILING_VIOLATED"]),
          message: z.string(),
        })
      ),
    }),
    affectedStoreCount: z.number(),
    riskLevel: z.enum(["R1_HIGH_RISK", "R2_STANDARD_RISK"]),
    summary: z.strictObject({ activeRuleCount: z.number(), s2FieldsCollected: z.number(), floorRawCount: z.number() }),
  })
)

export const partnerStoreResponse = data(
  z.strictObject({
    storeId: z.string(),
    name: z.string(),
    code: z.string(),
    isPartner: z.boolean(),
    dsa: z.strictObject({
      storeId: z.string(),
      legalEntityId: z.string(),
      fieldCeilings: z.record(z.string(), propagationTargetSchema),
      validUntil: z.string(),
      status: z.enum(["ACTIVE", "EXPIRED", "TERMINATED"]),
    }),
  })
)

export const chainStoresResponse = data(
  z.strictObject({
    organizationId: z.string(),
    stores: z.array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        code: z.string(),
        address: z.string().nullable(),
        isActive: z.boolean(),
        createdAt: z.string(),
        collectedFieldCount: z.number(),
        totalFieldCount: z.number(),
        readinessPercentage: z.number(),
        inventoryItemCount: z.number(),
        isPartner: z.boolean(),
      })
    ),
    totalStores: z.number(),
    activeStores: z.number(),
  })
)

export const storeFolderResponse = data(
  z.strictObject({
    storeId: z.string(),
    storeName: z.string(),
    storeCode: z.string(),
    address: z.string().nullable(),
    folders: z.array(
      z.strictObject({
        domainKey: DOMAIN,
        domainNameVi: z.string(),
        descriptionVi: z.string(),
        fieldCount: z.number(),
        fields: z.array(
          z.strictObject({
            fieldKey: z.string(),
            fieldNameVi: z.string(),
            rawValue: z.unknown(),
            displayValue: z.string(),
            sensitivity: z.string(),
            isPii: z.boolean(),
            effectiveTarget: propagationTargetSchema,
            purpose: z.string().optional(),
          })
        ),
      })
    ),
    totalFieldCount: z.number(),
  })
)

const STATUS = z.enum(["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"])
const linkView = z.strictObject({ id: z.string(), chain_name: z.string(), partner_code: z.string(), status: STATUS, valid_from: timestamp })
export const chainLinksResponse = data(z.strictObject({ invitations: z.array(linkView), memberships: z.array(linkView) }))
export const chainLinkResponse = data(z.strictObject({ id: z.string(), status: STATUS }))
