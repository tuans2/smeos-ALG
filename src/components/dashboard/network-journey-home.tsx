"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Button } from "@/components/ui/button"
import { getNetworkJourneys } from "@/modules/journey/domain/industry-journeys"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { createJourneyState } from "@/modules/journey/domain/journey-state"
import { ChoiceGrid } from "@/components/journey/choice-grid"
import { JourneyShell } from "@/components/journey/journey-shell"
import { FlowerNetworkCommandCenter } from "./flower-network-command-center"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { filterOpenHrefs } from "@/lib/feature-lock"

const STORAGE_KEY_EXPERT_MODE = "smeos_expert_mode_network"
const LEGACY_STORAGE_KEY_EXPERT_MODE = "floraos_expert_mode_network"

export function NetworkJourneyHome() {
  const router = useRouter()
  const { organization } = useSession()
  const { t } = useI18n()
  const industryKey = organization?.industry

  // Hành trình dẫn tới tuyến đang khoá "Sắp ra mắt" (production) thì ẩn thẻ (audit N-05)
  const journeys = useMemo(
    () => filterOpenHrefs(getNetworkJourneys(industryKey), (j) => j.primaryHref),
    [industryKey]
  )

  const { title, subtitle } = useMemo(() => {
    const plugin = getIndustryPlugin(industryKey)
    const product = plugin.terminology.sampleProduct.toLowerCase()
    const maker = plugin.terminology.makerTitle
    const orgName = organization?.name
    return {
      title: t("home.tiers.chain.title", { name: (orgName || maker).toUpperCase() }),
      subtitle: t("home.tiers.chain.subtitle", { product }),
    }
  }, [industryKey, organization?.name, t])
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
  const [activeJourney, setActiveJourney] = useState<JourneyDefinition | null>(null)
  const [journeyState, setJourneyState] = useState<ReturnType<typeof createJourneyState> | null>(null)

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
    if (journey.id === "network-overview") {
      setActiveJourney(journey)
      setJourneyState(createJourneyState(journey))
      return
    }

    if (journey.id === "network-dispatch") {
      router.push("/dieu-phoi" as never)
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
    setJourneyState(null)
  }

  // 1. Chế độ Chuyên gia: Hiển thị FlowerNetworkCommandCenter trực tiếp kèm thanh chuyển đổi
  if (isExpertMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-2 bg-selected border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-body-sm font-semibold text-text">
              Bạn đang ở Chế độ chuyên gia (Trung tâm điều hành mạng lưới điện hoa)
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
            <span>Chuyển sang Chế độ hành trình tác vụ</span>
          </Button>
        </div>
        <FlowerNetworkCommandCenter />
      </div>
    )
  }

  // 2. Đang trong luồng tác vụ (Journey Workspace)
  if (activeJourney && journeyState) {
    return (
      <JourneyShell
        journey={activeJourney}
        state={journeyState}
        onBackToHome={handleBackToHome}
      >
        {activeJourney.id === "network-overview" ? (
          <FlowerNetworkCommandCenter />
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
                Mở giao diện tác vụ chi tiết
              </Button>
            )}
          </div>
        )}
      </JourneyShell>
    )
  }

  // 3. Mặc định: Lưới lựa chọn Hành trình tác vụ Điện hoa (ChoiceGrid)
  return (
    <ChoiceGrid
      title={title}
      subtitle={subtitle}
      journeys={journeys}
      onSelectJourney={handleSelectJourney}
      onSwitchToExpertMode={() => handleToggleExpertMode(true)}
    />
  )
}
