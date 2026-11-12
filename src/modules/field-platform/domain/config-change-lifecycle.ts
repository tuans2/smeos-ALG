/**
 * ALG Inputs Architecture v2.1 — Configuration Change Lifecycle Engine (§6.4)
 *
 * Implements the safe configuration transition workflow:
 * Draft -> Validate -> Preview Impact -> Approve -> Publish -> Rollback
 *
 * Includes emergency freeze and out-of-bounds flagging (§6.7).
 */

export type ConfigChangeStage =
  | "DRAFT"
  | "VALIDATED"
  | "PREVIEWED"
  | "APPROVED"
  | "PUBLISHED"
  | "ROLLED_BACK"

export interface ImpactPreviewResult {
  readonly totalStoresAffected: number
  readonly totalProductsAffected: number
  readonly openOrdersAffected: number
  readonly outOfBoundsValuesCount: number
  readonly requiresHighLevelApproval: boolean
}

export interface ConfigVersionEntity<T = unknown> {
  readonly versionId: string
  readonly organizationId: string
  readonly policyKey: string
  readonly value: T
  readonly stage: ConfigChangeStage
  readonly effectiveFrom: Date
  readonly effectiveTo?: Date | undefined
  readonly isFrozen: boolean
  readonly authorId: string
  readonly approvedBy?: string | undefined
  readonly approvedAt?: Date | undefined
  readonly impactPreview?: ImpactPreviewResult | undefined
  readonly rollbackFromVersionId?: string | undefined
  readonly createdAt: Date
}

export function validateDraftConfig<T>(
  config: ConfigVersionEntity<T>,
  validator: (val: T) => string[]
): { readonly isValid: boolean; readonly errors: readonly string[] } {
  if (config.stage !== "DRAFT") {
    throw new Error(`Chỉ có thể validate phiên bản ở trạng thái DRAFT, hiện tại là ${config.stage}`)
  }
  const errors = validator(config.value)
  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function generateImpactPreview<T>(
  config: ConfigVersionEntity<T>,
  impactData: {
    readonly totalStores: number
    readonly totalProducts: number
    readonly openOrders: number
    readonly outOfBoundsCount: number
  }
): ConfigVersionEntity<T> {
  const requiresHighLevelApproval =
    impactData.totalStores >= 5 || impactData.outOfBoundsCount > 0

  const preview: ImpactPreviewResult = {
    totalStoresAffected: impactData.totalStores,
    totalProductsAffected: impactData.totalProducts,
    openOrdersAffected: impactData.openOrders,
    outOfBoundsValuesCount: impactData.outOfBoundsCount,
    requiresHighLevelApproval,
  }

  return {
    ...config,
    stage: "PREVIEWED",
    impactPreview: preview,
  }
}

export function approveConfigVersion<T>(
  config: ConfigVersionEntity<T>,
  reviewerId: string,
  reviewerRole: "OWNER" | "MANAGER",
  now: Date = new Date()
): ConfigVersionEntity<T> {
  if (config.stage !== "PREVIEWED") {
    throw new Error("Chỉ có thể duyệt phiên bản cấu hình sau khi đã Preview tác động")
  }
  if (config.impactPreview?.requiresHighLevelApproval && reviewerRole !== "OWNER") {
    throw new Error("Thay đổi diện rộng hoặc có vi phạm giới hạn bắt buộc OWNER phê duyệt")
  }

  return {
    ...config,
    stage: "APPROVED",
    approvedBy: reviewerId,
    approvedAt: now,
  }
}

export function publishConfigVersion<T>(
  config: ConfigVersionEntity<T>,
  now: Date = new Date()
): ConfigVersionEntity<T> {
  if (config.stage !== "APPROVED") {
    throw new Error("Chỉ có thể Publish phiên bản cấu hình đã được duyệt (APPROVED)")
  }
  if (config.isFrozen) {
    throw new Error("Hệ thống cấu hình đang bị ĐÓNG BĂNG (FREEZE), không thể publish")
  }

  return {
    ...config,
    stage: "PUBLISHED",
  }
}

export function rollbackConfigVersion<T>(
  publishedConfig: ConfigVersionEntity<T>,
  previousVersion: ConfigVersionEntity<T>,
  operatorId: string,
  newVersionId: string,
  now: Date = new Date()
): ConfigVersionEntity<T> {
  if (publishedConfig.stage !== "PUBLISHED") {
    throw new Error("Chỉ có thể rollback một phiên bản đang PUBLISHED")
  }

  return {
    versionId: newVersionId,
    organizationId: publishedConfig.organizationId,
    policyKey: publishedConfig.policyKey,
    value: previousVersion.value,
    stage: "PUBLISHED",
    effectiveFrom: now,
    isFrozen: false,
    authorId: operatorId,
    approvedBy: operatorId,
    approvedAt: now,
    rollbackFromVersionId: publishedConfig.versionId,
    createdAt: now,
  }
}
