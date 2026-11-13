/**
 * Journey Manifest & UX Contract v2 SSOT
 * ALG Core — Final Hardening Patch v2.3 / PATCH P1 (Mục 11.4)
 *
 * Chuẩn hóa tập đóng 7 màn hình, 6 loại đầu vào, chế độ thực thi Manual/Automatic
 * và ràng buộc quyết định sở hữu (Decision Ownership).
 */

import { DecisionOwnership } from './decision-ownership'

export type ExecutionMode = 'manual' | 'automatic'

/**
 * Tập ĐÓNG 7 màn hình chuẩn (FR-J10)
 */
export type JourneyScreen =
  | 'readiness_gate'
  | 'gap_resolver'
  | 'input_step'
  | 'asset_picker'
  | 'inline_confirm_chip'
  | 'run_panel'
  | 'result_with_provenance'

export const VALID_JOURNEY_SCREENS: readonly JourneyScreen[] = [
  'readiness_gate',
  'gap_resolver',
  'input_step',
  'asset_picker',
  'inline_confirm_chip',
  'run_panel',
  'result_with_provenance',
] as const

/**
 * Tập ĐÓNG 6 loại đầu vào chuẩn (FR-J11)
 */
export type InputKind =
  | 'choose_product'
  | 'choose_channel'
  | 'choose_option'
  | 'profile_field'
  | 'asset_picker'
  | 'free_text'

export const VALID_INPUT_KINDS: readonly InputKind[] = [
  'choose_product',
  'choose_channel',
  'choose_option',
  'profile_field',
  'asset_picker',
  'free_text',
] as const

export interface JourneyInputItemV2 {
  kind: InputKind
  key: string
  label: string
  target?: string
  decision: string // Phải thuộc Decision Registry (vd: D-CHOOSE-PRODUCT, D-CONFIRM-DERIVED)
  required?: boolean
  options?: string[]
}

export interface ReadinessRequirement {
  id: string
  label: string
  subject: string
  predicate: string
  type: 'hard' | 'soft' // hard: chặn (Readiness Gate), soft: gợi ý
  fallbackAction?: {
    screen: JourneyScreen
    message: string
  }
}

export interface UxContractV2 {
  version: 2
  executionMode: {
    default: ExecutionMode
    allowed: ExecutionMode[]
  }
  entry: {
    screen: JourneyScreen
    maxRecommendationsShown: number
  }
  inputs: JourneyInputItemV2[]
  requirements?: ReadinessRequirement[]
  device: {
    mobileFirst: boolean
  }
}

export interface JourneyManifestV2 {
  id: string
  title: string
  description: string
  category: 'CONTENT' | 'COMMERCE' | 'MARKETING' | 'OPERATION'
  uxContract: UxContractV2
}

/**
 * Kiểm tra tính hợp lệ của Journey Manifest v2 (FR-J09..J13)
 */
export function validateJourneyManifestV2(
  manifest: JourneyManifestV2,
  validDecisionIds: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!manifest.id || manifest.id.trim() === '') {
    errors.push('Manifest ID không được để trống')
  }

  const { uxContract } = manifest
  if (!uxContract || uxContract.version !== 2) {
    errors.push('uxContract version bắt buộc phải là 2')
    return { valid: false, errors }
  }

  // 1. Kiểm tra execution_mode.default ∈ allowed (FR-J09)
  if (!uxContract.executionMode.allowed.includes(uxContract.executionMode.default)) {
    errors.push(`executionMode.default (${uxContract.executionMode.default}) phải thuộc danh sách allowed`)
  }

  // 2. Kiểm tra màn hình entry ∈ tập 7 (FR-J10)
  if (!VALID_JOURNEY_SCREENS.includes(uxContract.entry.screen)) {
    errors.push(`Entry screen "${uxContract.entry.screen}" không thuộc tập 7 màn hình chuẩn (FR-J10)`)
  }

  // 3. Kiểm tra các inputs ∈ tập 6 và decision tồn tại (FR-J11, FR-J12)
  for (const input of uxContract.inputs) {
    if (!VALID_INPUT_KINDS.includes(input.kind)) {
      errors.push(`Input kind "${input.kind}" không thuộc tập 6 InputKind đóng (FR-J11)`)
    }
    if (!validDecisionIds.has(input.decision)) {
      errors.push(`Quyết định "${input.decision}" trên input "${input.key}" không tồn tại trong Decision Registry (FR-J12)`)
    }
  }

  // 4. Kiểm tra requirements: $param không được nằm trong hard_requirements (FR-J13)
  if (uxContract.requirements) {
    for (const req of uxContract.requirements) {
      if (req.type === 'hard' && req.predicate.startsWith('$')) {
        errors.push(`Tham số động ${req.predicate} không được đặt làm hard requirement tại Readiness Gate (FR-J13)`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
