/**
 * Decision Registry Lint Script (FR-D04)
 * ALG Core — Final Hardening Patch v2.3 / Mục 11.5
 *
 * Kiểm tra các bất biến bảo mật của Decision Registry:
 * - 6 quyết định tối thượng (Cấp quyền, Xác minh Fact, Duyệt công khai, Thu hồi thủ công, Xử lý xung đột, Phát hành)
 *   BẮT BUỘC có ownership: USER và locked: true.
 * - Các quyết định hệ thống (D-REVOKE-EXPIRY, D-EVALUATE-USAGE, D-COMPUTE-READINESS) BẮT BUỘC có ownership: SYSTEM.
 */

import { DECISION_REGISTRY_SEED } from '../src/modules/journey/domain/decision-ownership'

const MANDATORY_USER_LOCKED_DECISIONS = [
  'D-PERM-GRANT',
  'D-VERIFY-FACT',
  'D-APPROVE-PUBLIC',
  'D-REVOKE-MANUAL',
  'D-RESOLVE-CONFLICT',
  'D-PUBLISH-OUTPUT',
]

const MANDATORY_SYSTEM_DECISIONS = [
  'D-REVOKE-EXPIRY',
  'D-EVALUATE-USAGE',
  'D-COMPUTE-READINESS',
]

export function lintDecisionRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const map = new Map(DECISION_REGISTRY_SEED.map((d) => [d.decisionId, d]))

  // 1. Kiểm tra 6 quyết định bắt buộc USER locked
  for (const id of MANDATORY_USER_LOCKED_DECISIONS) {
    const item = map.get(id)
    if (!item) {
      errors.push(`Thiếu quyết định bắt buộc: ${id}`)
      continue
    }
    if (item.ownership !== 'USER') {
      errors.push(`Quyết định ${id} vi phạm FR-D04: ownership phải là USER (đang là ${item.ownership})`)
    }
    if (!item.locked) {
      errors.push(`Quyết định ${id} vi phạm FR-D04: locked phải là true`)
    }
  }

  // 2. Kiểm tra quyết định bắt buộc SYSTEM
  for (const id of MANDATORY_SYSTEM_DECISIONS) {
    const item = map.get(id)
    if (!item) {
      errors.push(`Thiếu quyết định hệ thống: ${id}`)
      continue
    }
    if (item.ownership !== 'SYSTEM') {
      errors.push(`Quyết định ${id} vi phạm: ownership phải là SYSTEM (đang là ${item.ownership})`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

if (require.main === module) {
  const result = lintDecisionRegistry()
  if (!result.valid) {
    console.error('❌ Decision Registry Lint FAILED:')
    for (const err of result.errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
  console.log(`✅ Decision Registry Lint PASSED (${DECISION_REGISTRY_SEED.length} decisions verified).`)
}
