/**
 * Use Case: Evaluate Readiness Gate (PATCH P1 & P3)
 * ALG Core — Final Hardening Patch v2.3 / Mục 11.4 & Mục 5.6
 *
 * Kiểm tra các điều kiện tiên quyết (requirements) trước khi chạy Journey
 * bằng cách truy vấn các Facts qua IFactReader.
 */

import { IFactReader } from '@/modules/profiles/domain/fact-reader'
import {
  JourneyManifestV2,
  JourneyScreen,
  ReadinessRequirement,
} from '../domain/journey-manifest-v2'

export type ReadinessStatus = 'READY' | 'READY_WITH_RECOMMENDATIONS' | 'BLOCKED'

export interface RequirementEvaluationResult {
  requirement: ReadinessRequirement
  passed: boolean
  currentValue?: unknown
  resolutionScreen?: JourneyScreen | undefined
  message?: string | undefined
}

export interface EvaluateReadinessOutput {
  status: ReadinessStatus
  manifestId: string
  nextScreen: JourneyScreen
  results: RequirementEvaluationResult[]
  canProceed: boolean
}

export class EvaluateReadinessUseCase {
  constructor(private readonly factReader: IFactReader) {}

  async execute(
    organizationId: string,
    manifest: JourneyManifestV2
  ): Promise<EvaluateReadinessOutput> {
    const requirements = manifest.uxContract.requirements ?? []
    const results: RequirementEvaluationResult[] = []

    let hasHardBlock = false
    let hasSoftWarning = false

    for (const req of requirements) {
      const fact = await this.factReader.getFact(
        organizationId,
        req.subject,
        req.predicate
      )

      const passed = Boolean(
        fact &&
        fact.object !== null &&
        fact.object !== undefined &&
        fact.object !== ''
      )

      if (!passed) {
        if (req.type === 'hard') {
          hasHardBlock = true
        } else {
          hasSoftWarning = true
        }
      }

      results.push({
        requirement: req,
        passed,
        currentValue: fact?.object,
        resolutionScreen: !passed ? req.fallbackAction?.screen : undefined,
        message: !passed ? req.fallbackAction?.message : undefined,
      })
    }

    if (hasHardBlock) {
      return {
        status: 'BLOCKED',
        manifestId: manifest.id,
        nextScreen: 'gap_resolver',
        results,
        canProceed: false,
      }
    }

    if (hasSoftWarning) {
      return {
        status: 'READY_WITH_RECOMMENDATIONS',
        manifestId: manifest.id,
        nextScreen: 'inline_confirm_chip',
        results,
        canProceed: true,
      }
    }

    return {
      status: 'READY',
      manifestId: manifest.id,
      nextScreen: 'run_panel',
      results,
      canProceed: true,
    }
  }
}
