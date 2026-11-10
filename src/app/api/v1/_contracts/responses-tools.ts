import { z } from "zod"

/**
 * Phản hồi nhóm công cụ (OpenAPI nội bộ, PO 07/11/2026): `ad-banner-poster`, `field-config`, `template-overrides`,
 * `noi-bo`. Sinh từ kiểu TS của `ad-banner-poster`, `field-platform`, `organization/infra/identity-query` và dòng
 * `template_overrides`, đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-tools.test.ts`.
 * `proxy` trả nguyên văn phản hồi của hệ thống đích — không có lược đồ.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })

export const bannerPromotionsResponse = z.strictObject({ promotions: z.array(z.string()) })
const bannerCopy = z.strictObject({
  headline: z.string(),
  subHeadline: z.string(),
  promotionBadge: z.string(),
  ctaText: z.string(),
  validityText: z.string().optional(),
})
/** `source`: `AI_CONTENT_ENGINE` khi mô hình chạy được, không thì `INSTANT_TEMPLATE` (mẫu dựng sẵn). */
export const bannerCopyResponse = z.strictObject({ success: z.literal(true), copy: bannerCopy, source: z.enum(["AI_CONTENT_ENGINE", "INSTANT_TEMPLATE"]) })
export const bannerRenderResponse = z.strictObject({
  success: z.literal(true),
  qc: z.strictObject({
    isPassed: z.boolean(),
    overallScore: z.number(),
    criteria: z.array(z.strictObject({ code: z.string(), name: z.string(), passed: z.boolean(), score: z.number(), message: z.string().optional() })),
    failedCriteria: z.array(z.string()),
    retryHint: z.string().optional(),
  }),
  /** Mỗi khổ một dòng; `renderedUrl` chỉ khi dựng bằng mô hình ảnh (`SINGLE_CALL_AI`). */
  results: z.array(
    z.strictObject({ format: z.enum(["1:1", "4:5", "9:16", "16:9", "A4"]), renderedUrl: z.string().optional(), mode: z.enum(["SINGLE_CALL_AI", "TEMPLATE_LAYOUT"]), note: z.string() })
  ),
})
/** Không bọc `{ data }`. Tư liệu mới chờ duyệt. */
export const bannerSavedResponse = z.strictObject({
  assetId: z.string(),
  title: z.string(),
  storageKey: z.string(),
  assetTypeCode: z.string(),
  approvalState: z.literal("PENDING"),
})

const REQUIREMENT = z.enum(["OPTIONAL", "RECOMMENDED", "REQUIRED"])
const visibility = z.strictObject({ INTERNAL: z.boolean(), PARTNER: z.boolean(), SHIPPER: z.boolean(), CUSTOMER: z.boolean() })
const ENTITY = z.enum(["ORDER", "PARTNER"])
export const fieldConfigResponse = data(
  z.array(
    z.strictObject({
      key: z.string(),
      entity: ENTITY,
      dataType: z.string(),
      label: z.string(),
      requirement: REQUIREMENT,
      requiredAtStage: z.string().optional(),
      visibility,
      isEnabled: z.boolean(),
      sensitivity: z.enum(["NORMAL", "PII", "SENSITIVE"]),
      catalogKey: z.string().optional(),
    })
  )
)
/** Chỉ giá trị đang bật. Danh mục là bảng nền tảng (chung mọi tổ chức). */
export const fieldCatalogsResponse = data(
  z.array(
    z.strictObject({
      key: z.string(),
      label: z.string(),
      governance: z.string(),
      behaviorKind: z.string().nullable(),
      values: z.array(z.strictObject({ code: z.string(), label: z.string(), sortOrder: z.number(), behavior: z.string().nullable(), params: z.record(z.string(), z.unknown()).nullable() })),
    })
  )
)
export const fieldSettingsResponse = data(
  z.array(
    z.strictObject({
      key: z.string(),
      entity: z.string(),
      dataType: z.string(),
      label: z.string(),
      platformLabel: z.string().nullable(),
      owner: z.enum(["PLATFORM", "SHOP"]),
      requirement: REQUIREMENT,
      floorRequirement: REQUIREMENT.nullable(),
      isEnabled: z.boolean(),
      canHide: z.boolean(),
      visibility,
    })
  )
)
/** Khoá máy sinh từ nhãn (`cf_…`). */
export const shopFieldCreatedResponse = data(z.strictObject({ key: z.string(), label: z.string() }))
export const shopFieldUpdatedResponse = data(z.strictObject({ key: z.string() }))

const override = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  template_family: z.enum(["GT", "IT", "CT", "ST", "OT"]),
  template_key: z.string(),
  field_key: z.string(),
  value: z.string(),
  updated_by: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
})
export const templateOverridesResponse = z.strictObject({ data: z.array(override), next_cursor: z.null() })
export const templateOverrideResponse = z.strictObject({ override })
export const okResponse = z.strictObject({ ok: z.literal(true) })

/** Envelope cũ `{ success, data }`. `members`: thành viên đang hoạt động (tên, email) — tối đa 100. */
export const identityResponse = z.strictObject({
  success: z.literal(true),
  data: z.strictObject({
    organization: z.strictObject({
      id: z.string(),
      shortId: z.string(),
      slug: z.string(),
      name: z.string(),
      displayName: z.string(),
      type: z.string(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
      address: z.string().nullable(),
      createdAt: timestamp,
      connectCode: z.string(),
    }),
    chainRelations: z.strictObject({
      asPartnerOf: z.array(
        z.strictObject({ partnershipId: z.string(), partnerCode: z.string(), partnershipType: z.string(), chainOrgId: z.string(), chainName: z.string(), chainSlug: z.string(), chainConnectCode: z.string() })
      ),
      asChainOf: z.array(
        z.strictObject({ partnershipId: z.string(), partnerCode: z.string(), partnershipType: z.string(), partnerOrgId: z.string(), partnerName: z.string(), partnerSlug: z.string() })
      ),
    }),
    members: z.array(z.strictObject({ membershipId: z.string(), memberId: z.string(), userId: z.string(), name: z.string(), email: z.string() })),
  }),
})
