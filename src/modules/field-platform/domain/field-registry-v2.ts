/**
 * ALG Inputs Architecture v2.1 — Field Registry v2 Standard Types
 *
 * Implements 4-axis classification, sensitivity S0-S3, data layers L1-L4,
 * AI permissions, propagation, and PII compliance attributes.
 */

import { type InputDomainKey } from "./input-domains"

export type DataLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6"

export type OwnerScope =
  | "PLATFORM"
  | "OWNER"
  | "LEGAL_ENTITY"
  | "BRAND"
  | "REGION"
  | "STORE"
  | "RECORD"

export type FieldStatus = "DRAFT" | "ACTIVE" | "DEPRECATED" | "REMOVED"

export type RequiredStage = "G1" | "G2" | "G3" | "OPTIONAL"

export type SensitivityLevel = "S0_PUBLIC" | "S1_INTERNAL" | "S2_CONFIDENTIAL" | "S3_SECRET"

export type AiAccessLevel = "DENY" | "READ_MASKED" | "READ" | "READ_APPROVED_ONLY"

export interface AiAccessMatrix {
  readonly customerFacing: AiAccessLevel
  readonly staffFacing: AiAccessLevel
  readonly analytics: AiAccessLevel
}

export type MaskRule = "MASK_MIDDLE" | "HASH" | "ROUND_NUMBER" | "REDACT"

export type SourceType = "MANUAL" | "IMPORT" | "SYNC" | "COMPUTED" | "AI_PROPOSED"

export type PropagationTarget = "NONE" | "MASKED" | "AGGREGATED" | "RAW"

export interface PropagationConfig {
  readonly toChain: PropagationTarget
  readonly toPlatform: PropagationTarget
  readonly ceiling: {
    readonly toChain: PropagationTarget
    readonly toPlatform: PropagationTarget
  }
  readonly chainSelectable: boolean
  readonly chainDefault: boolean
  readonly allowedPrograms?: readonly string[]
}

export interface PiiCompliance {
  readonly isPii: boolean
  readonly piiCategory?: "GENERAL" | "SENSITIVE"
  readonly purpose?: string
  readonly legalBasis?: "CONSENT" | "CONTRACT" | "LEGAL_OBLIGATION" | "LEGITIMATE_INTEREST"
  readonly retentionDays?: number
  readonly erasureMode?: "DELETE" | "ANONYMIZE"
}

export interface FieldValidationRule {
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly pattern?: string | undefined
  readonly allowedValues?: readonly (string | number)[] | undefined
}

export interface FieldDefinitionV2 {
  readonly fieldKey: string
  readonly fieldName: {
    readonly vi: string
    readonly en: string
  }
  readonly domain: InputDomainKey
  readonly verticalPack: "core" | string
  readonly status: FieldStatus
  readonly sinceVersion: string
  readonly removeIn?: string | undefined
  readonly replacementField?: string | undefined

  // Classification
  readonly dataLayer: DataLayer
  readonly ownerScope: OwnerScope
  readonly dataType:
    | "TEXT"
    | "LONG_TEXT"
    | "NUMBER"
    | "MONEY_VND"
    | "DATE"
    | "DATETIME"
    | "BOOLEAN"
    | "SELECT"
    | "MULTI_SELECT"
    | "PHONE"
    | "EMAIL"
    | "URL"
    | "IMAGE"
    | "FILE"
    | "JSON"
  readonly unit?: string | undefined
  readonly currency?: string | undefined
  readonly sensitivity: SensitivityLevel
  readonly pii: PiiCompliance

  // Input & Lifecycle
  readonly requiredStage: RequiredStage
  readonly defaultValue?: unknown
  readonly validation?: FieldValidationRule | undefined
  readonly sourceType: SourceType
  readonly staleAfterDays?: number | undefined

  // AI Governance
  readonly aiAccess: AiAccessMatrix
  readonly maskRule?: MaskRule | undefined
  readonly aiMayPropose: boolean

  // Propagation
  readonly propagation: PropagationConfig

  // Export & Dependencies
  readonly exportable: boolean
  readonly usedBy?: readonly string[] | undefined
  readonly dependsOn?: readonly string[] | undefined
}
