/**
 * Journey Manifests Lint Script (FR-J09..J13)
 * ALG Core — Final Hardening Patch v2.3 / Mục 11.4
 */

import { DECISION_REGISTRY_SEED } from '../src/modules/journey/domain/decision-ownership'
import {
  JourneyManifestV2,
  validateJourneyManifestV2,
} from '../src/modules/journey/domain/journey-manifest-v2'
import { LANDING_PAGE_MANIFEST } from '../src/modules/journey/domain/manifests/landing-page-manifest'
import { SOCIAL_POST_MANIFEST } from '../src/modules/journey/domain/manifests/social-post-manifest'

const ALL_MANIFESTS: JourneyManifestV2[] = [
  LANDING_PAGE_MANIFEST,
  SOCIAL_POST_MANIFEST,
]

export function lintJourneyManifests(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const validDecisionIds = new Set(DECISION_REGISTRY_SEED.map((d) => d.decisionId))

  for (const manifest of ALL_MANIFESTS) {
    const result = validateJourneyManifestV2(manifest, validDecisionIds)
    if (!result.valid) {
      for (const err of result.errors) {
        errors.push(`[${manifest.id}] ${err}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

if (require.main === module) {
  const result = lintJourneyManifests()
  if (!result.valid) {
    console.error('❌ Journey Manifests Lint FAILED:')
    for (const err of result.errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
  console.log(`✅ Journey Manifests Lint PASSED (${ALL_MANIFESTS.length} manifests verified).`)
}
