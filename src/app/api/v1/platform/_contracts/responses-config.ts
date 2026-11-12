import { z } from "zod"

/**
 * Phản hồi Console Vận hành Nền tảng — cấu hình toàn sàn: nền quản trị trường (ĐP-3), ma trận quản trị/điều
 * hướng/cờ giao diện, thông báo 4 tầng, quản trị tích hợp (OpenAPI `/platform/*`, PO 07/11/2026).
 */
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })

const requirement = z.enum(["OPTIONAL", "RECOMMENDED", "REQUIRED"])
const sensitivity = z.enum(["NORMAL", "PII", "SENSITIVE"])
const audienceVisibility = z.strictObject({ INTERNAL: z.boolean(), PARTNER: z.boolean(), SHIPPER: z.boolean(), CUSTOMER: z.boolean() })

const field = z.strictObject({
  id: z.string(),
  key: z.string(),
  entity: z.string(),
  origin: z.enum(["CORE", "CUSTOM"]),
  dataType: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  placeholder: z.string().nullable(),
  requirement,
  requiredAtStage: z.string().nullable(),
  visibility: audienceVisibility,
  catalogKey: z.string().nullable(),
  sensitivity,
  floorInternalOnly: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  defaultEnabled: z.boolean(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const fieldsResponse = data(z.array(field))
export const fieldResponse = data(field)

const catalogValue = z.strictObject({
  id: z.string(),
  catalogKey: z.string(),
  code: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  behavior: z.string().nullable(),
  /** Tham số của hành vi (JSON tự do theo `behavior`). */
  params: z.unknown(),
})
export const catalogValueResponse = data(catalogValue)
export const catalogsResponse = data(
  z.array(
    z.strictObject({
      key: z.string(),
      label: z.string(),
      governance: z.enum(["OPEN", "BEHAVIOR", "CLOSED"]),
      behaviorKind: z.string().nullable(),
      values: z.array(catalogValue),
    })
  )
)

export const behaviorsResponse = data(
  z.union([z.strictObject({ kinds: z.array(z.string()) }), z.strictObject({ kind: z.string(), codes: z.array(z.string()) })])
)

export const fieldOverrideResponse = data(
  z.strictObject({
    id: z.string(),
    organizationId: z.string(),
    target: z.enum(["FIELD", "CATALOG_VALUE"]),
    overrideKey: z.string(),
    label: z.string().nullable(),
    visibility: z
      .strictObject({ INTERNAL: z.boolean().optional(), PARTNER: z.boolean().optional(), SHIPPER: z.boolean().optional(), CUSTOMER: z.boolean().optional() })
      .nullable(),
    requirement: requirement.nullable(),
    isEnabled: z.boolean().nullable(),
    updatedAt: z.string(),
  })
)

export const fieldPreviewResponse = data(
  z.array(
    z.strictObject({
      key: z.string(),
      entity: z.enum(["PARTNER", "ORDER"]),
      dataType: z.string(),
      label: z.string(),
      requirement,
      requiredAtStage: z.string().optional(),
      visibility: audienceVisibility,
      isEnabled: z.boolean(),
      sensitivity,
      catalogKey: z.string().optional(),
    })
  )
)

const decisions = z.strictObject({ overrides: z.record(z.string(), z.boolean()), locks: z.record(z.string(), z.strictObject({ enabled: z.boolean() })) })
/** Ma trận quản trị tầng Mẹ: `upper` là quy chuẩn bất biến, hiện như khoá của tầng trên để Console không cho sửa. */
export const governanceMatrixResponse = data(
  z.strictObject({
    system: z.string(),
    tier: z.literal("MOTHER"),
    own: decisions,
    upper: z.array(z.strictObject({ tier: z.literal("MOTHER"), decisions })),
  })
)

const navOverrides = z.record(z.string(), z.array(z.string()))
export const navMatrixResponse = data(
  z.strictObject({
    industries: z.array(z.strictObject({ key: z.string(), name: z.string(), iconName: z.string(), description: z.string() })),
    groups: z.array(z.strictObject({ key: z.string(), label: z.string() })),
    navItems: z.array(z.strictObject({ navKey: z.string(), label: z.string(), group: z.string(), href: z.string(), iconKey: z.string() })),
    /** Mục ẩn mặc định theo plugin ngành. */
    defaultMatrix: navOverrides,
    activeOverrides: navOverrides,
  })
)
export const saveNavMatrixResponse = data(z.strictObject({ ok: z.literal(true), activeOverrides: navOverrides }))

const uxRule = z.strictObject({ mode: z.enum(["off", "allowlist", "all"]), organizationIds: z.array(z.string()) })
const uxFlags = z.record(z.string(), uxRule)
export const uxRolloutFlagsResponse = data(z.strictObject({ keys: z.array(z.string()), flags: uxFlags }))
export const saveUxRolloutFlagsResponse = data(z.strictObject({ ok: z.literal(true), flags: uxFlags }))

const notifyChannel = z.enum(["APP_INBOX", "EMAIL", "PUSH", "TELEGRAM", "ZALO", "SMS", "WHATSAPP", "MESSENGER"])
const notifyTier = z.enum(["MOTHER", "INDUSTRY", "CHAIN", "STORE"])
export const notificationEventsResponse = data(
  z.array(
    z.strictObject({
      key: z.string(),
      label: z.string(),
      description: z.string(),
      group: z.string(),
      tier: notifyTier,
      version: z.number(),
      defaultVisibleToTiers: z.array(z.enum(["INDUSTRY", "CHAIN", "STORE"])),
      roleDefaults: z.array(
        z.strictObject({
          roleKey: z.string(),
          channels: z.array(notifyChannel),
          priority: z.enum(["NORMAL", "URGENT", "CRITICAL"]),
          dispatchMode: z.enum(["OWNER", "BROADCAST"]),
        })
      ),
      deepLinkTemplate: z.string().optional(),
      iconName: z.string().optional(),
      deprecated: z.boolean().optional(),
      replacedBy: z.string().optional(),
    })
  )
)
export const channelActivationsResponse = data(z.record(z.string(), z.boolean()))
export const channelActivationSavedResponse = z.strictObject({ success: z.literal(true), channel: z.string(), activated: z.boolean() })

const providerChannel = z.enum(["SMS", "ZALO", "PUSH"])
const providerDefinition = z.strictObject({
  key: z.string(),
  channel: providerChannel,
  label: z.string(),
  fields: z.array(z.strictObject({ name: z.string(), label: z.string(), secret: z.boolean(), required: z.boolean() })),
  ready: z.boolean(),
  pending: z.string().optional(),
})
const maskedProvider = z.strictObject({
  channel: providerChannel,
  provider: z.string().nullable(),
  values: z.record(z.string(), z.string()),
  secretsSet: z.record(z.string(), z.boolean()),
  configured: z.boolean(),
  ready: z.boolean(),
  pending: z.string().nullable(),
})
export const channelProvidersResponse = data(z.strictObject({ catalog: z.array(providerDefinition), channels: z.array(maskedProvider.extend({ activated: z.boolean() })) }))
export const channelProviderSavedResponse = data(maskedProvider)
export const channelProviderTestResponse = data(z.strictObject({ channel: z.string(), success: z.boolean(), messageId: z.string().optional(), error: z.string().optional() }))

const hardLock = z.strictObject({ eventKey: z.string(), channel: notifyChannel, enabled: z.boolean(), reason: z.string().optional() })
export const hardLocksResponse = data(z.array(hardLock.extend({ tier: notifyTier, scopeId: z.string() })))
export const hardLockSetResponse = z.strictObject({ success: z.literal(true), hardLock })
export const hardLockRemovedResponse = z.strictObject({ success: z.literal(true), removed: z.strictObject({ eventKey: z.string(), channel: notifyChannel }) })

export const eventVisibilityResponse = data(
  z.array(
    z.strictObject({
      eventKey: z.string(),
      label: z.string(),
      tier: z.string(),
      group: z.string(),
      visibility: z.strictObject({ INDUSTRY: z.boolean(), CHAIN: z.boolean(), STORE: z.boolean() }),
    })
  )
)
export const eventVisibilitySavedResponse = z.strictObject({
  success: z.literal(true),
  updated: z.strictObject({ eventKey: z.string(), tier: z.enum(["INDUSTRY", "CHAIN", "STORE"]), visible: z.boolean() }),
})

const governanceMode = z.enum(["FORBID", "INHERIT_ONLY", "ALLOW_OWN"])
/** Không bọc `data` — hợp đồng cũ của màn quản trị tích hợp. */
export const integrationGovernanceResponse = z.strictObject({
  scope: z.string(),
  items: z.array(
    z.strictObject({
      connectorKey: z.string(),
      label: z.string(),
      mode: governanceMode,
      lockedByUpper: notifyTier.nullable(),
      upperMode: governanceMode,
    })
  ),
  industries: z.array(z.strictObject({ key: z.string(), name: z.string() })),
})
