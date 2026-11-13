/**
 * Registry tập hợp 7 bước của Coordinator Module.
 */

import type { StepContract } from "./define-step"
import { step01IntakeContract } from "./step-01-intake"
import { step02ValidatePlanContract } from "./step-02-validate-plan"
import { step03AssignPartnerContract } from "./step-03-assign-partner"
import { step04ProductionContract } from "./step-04-production"
import { step05QCInspectionContract } from "./step-05-qc"
import { step06DeliveryContract } from "./step-06-delivery"
import { step07CloseLearnContract } from "./step-07-close-learn"

export const COORDINATOR_STEPS: readonly StepContract[] = [
  step01IntakeContract,
  step02ValidatePlanContract,
  step03AssignPartnerContract,
  step04ProductionContract,
  step05QCInspectionContract,
  step06DeliveryContract,
  step07CloseLearnContract,
] as const

export function findStepById(id: string): StepContract | undefined {
  return COORDINATOR_STEPS.find((s) => s.id === id)
}
