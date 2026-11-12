"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Button } from "@/components/ui/button"
import { getStoreJourneys } from "@/modules/journey/domain/journey-catalog"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { createJourneyState } from "@/modules/journey/domain/journey-state"
import { ChoiceGrid } from "@/components/journey/choice-grid"
import { JourneyShell } from "@/components/journey/journey-shell"
import { WorkflowPreview } from "@/components/journey/workflow-preview"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { StoreGrowthCenter } from "./store-growth-center"

const STORAGE_KEY_EXPERT_MODE = "smeos_expert_mode_store"
const LEGACY_STORAGE_KEY_EXPERT_MODE = "floraos_expert_mode_store"

export function StoreJourneyHome() {
  const router = useRouter()
  const { organization } = useSession()
  const { t } = useI18n()
  const journeys = useMemo(
    () => getStoreJourneys(organization?.industry),
    [organization?.industry]
  )
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
  const [activeJourney, setActiveJourney] = useState<JourneyDefinition | null>(null)
  const [showComboPreview, setShowComboPreview] = useState<boolean>(false)
  const [journeyState, setJourneyState] = useState(() =>
    activeJourney ? createJourneyState(activeJourney) : null
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPERT_MODE) ?? localStorage.getItem(LEGACY_STORAGE_KEY_EXPERT_MODE)
      if (saved === "true") {
        setIsExpertMode(true)
      }
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }, [])

  const handleToggleExpertMode = (enabled: boolean) => {
    setIsExpertMode(enabled)
    try {
      localStorage.setItem(STORAGE_KEY_EXPERT_MODE, String(enabled))
    } catch {
      // Bỏ qua
    }
  }

  const handleSelectJourney = (journey: JourneyDefinition) => {
    if (journey.id === "view-store-overview") {
      setActiveJourney(journey)
      setJourneyState(createJourneyState(journey))
      return
    }

    if (journey.id === "floraos-copilot-chat" || journey.id === "smeos-copilot-chat") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("alg:open-copilot"))
      }
      return
    }

    if (journey.category === "COMBO") {
      setActiveJourney(journey)
      setShowComboPreview(true)
      return
    }

    if (journey.primaryHref) {
      router.push(journey.primaryHref as never)
      return
    }

    setActiveJourney(journey)
    setJourneyState(createJourneyState(journey))
  }

  const handleBackToHome = () => {
    setActiveJourney(null)
    setShowComboPreview(false)
    setJourneyState(null)
  }

  const handleStartComboWorkflow = () => {
    setShowComboPreview(false)
    if (activeJourney) {
      setJourneyState(createJourneyState(activeJourney))
    }
  }

  // 1. Chế độ Chuyên gia: Hiển thị StoreGrowthCenter trực tiếp kèm thanh chuyển đổi
  if (isExpertMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-2 bg-selected border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-body-sm font-semibold text-text">
              Bạn đang xem bảng số liệu trực tiếp.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleToggleExpertMode(false)}
            className="inline-flex items-center gap-1.5 text-caption font-bold text-primary"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Về trang chọn công việc</span>
          </Button>
        </div>
        <StoreGrowthCenter />
      </div>
    )
  }

  // 2. Đang xem trước Combo Workflow
  if (showComboPreview && activeJourney) {
    return (
      <div className="py-6 px-4">
        <WorkflowPreview
          journey={activeJourney}
          onStartWorkflow={handleStartComboWorkflow}
          onCancel={handleBackToHome}
        />
      </div>
    )
  }

  // 3. Đang trong luồng tác vụ (Journey Workspace)
  if (activeJourney && journeyState) {
    return (
      <JourneyShell
        journey={activeJourney}
        state={journeyState}
        onBackToHome={handleBackToHome}
      >
        {activeJourney.id === "view-store-overview" ? (
          <StoreGrowthCenter />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-selected flex items-center justify-center text-primary font-bold text-display">
              {journeyState.currentStepIndex + 1}
            </div>
            <div>
              <h3 className="text-title font-bold text-text">
                {activeJourney.steps[journeyState.currentStepIndex]?.label || activeJourney.goal}
              </h3>
              <p className="text-body text-text-muted mt-1 max-w-md">
                {activeJourney.steps[journeyState.currentStepIndex]?.description || activeJourney.description}
              </p>
            </div>
            {activeJourney.primaryHref && (
              <Button
                type="button"
                onClick={() => router.push((activeJourney.primaryHref || "/") as never)}
                className="font-bold"
              >
                Mở giao diện chi tiết
              </Button>
            )}
          </div>
        )}
      </JourneyShell>
    )
  }

  // 4. Mặc định: Lưới lựa chọn Hành trình tác vụ (ChoiceGrid)
  const homeTitle = t("home.tiers.store.title", {
    name: organization?.name || t("common.terms.shop"),
  })

  return (
    <ChoiceGrid
      title={homeTitle}
      subtitle={t("home.tiers.store.subtitle")}
      journeys={journeys}
      onSelectJourney={handleSelectJourney}
      onSwitchToExpertMode={() => handleToggleExpertMode(true)}
    />
  )
}
