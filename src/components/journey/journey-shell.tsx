"use client"

import React from "react"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import type { JourneyState } from "@/modules/journey/domain/journey-state"
import { JourneyHeader } from "./journey-header"
import { JourneyProgress } from "./journey-progress"

interface JourneyShellProps {
  journey: JourneyDefinition
  state: JourneyState
  onBackToHome: () => void
  onStepClick?: (stepIndex: number) => void
  children: React.ReactNode
}

export function JourneyShell({
  journey,
  state,
  onBackToHome,
  onStepClick,
  children,
}: JourneyShellProps) {
  const currentStep = journey.steps[state.currentStepIndex]
  const stepStatuses = state.steps.map((s) => s.status)

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 md:py-6 space-y-4">
      {/* Journey Header with back button */}
      <JourneyHeader
        goal={journey.goal}
        description={currentStep ? currentStep.label : journey.description}
        currentStepIndex={state.currentStepIndex}
        totalSteps={journey.steps.length}
        onBackToHome={onBackToHome}
      />

      {/* Progress pipeline (only visible if more than 1 step) */}
      {journey.steps.length > 1 && (
        <div className="bg-surface border border-border rounded-xl p-3 shadow-xs">
          <JourneyProgress
            steps={journey.steps}
            currentStepIndex={state.currentStepIndex}
            stepStatuses={stepStatuses}
            onStepClick={onStepClick}
          />
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="w-full min-h-[500px] bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-xs">
        {children}
      </div>
    </div>
  )
}
