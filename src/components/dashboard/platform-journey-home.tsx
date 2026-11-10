"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Button } from "@/components/ui/button"
import { PLATFORM_JOURNEYS } from "@/modules/journey/domain/journey-catalog"
import { filterByPhase } from "@/lib/delivery/delivery-phase"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { createJourneyState } from "@/modules/journey/domain/journey-state"
import { ChoiceGrid } from "@/components/journey/choice-grid"
import { JourneyShell } from "@/components/journey/journey-shell"
import { useI18n } from "@/lib/i18n"
import {
  PlatformOverviewMetrics,
  type PlatformOrganizationSummary,
  type PlatformSystemHealth,
} from "./platform-overview-metrics"

const STORAGE_KEY_EXPERT_MODE = "smeos_expert_mode_platform"
const LEGACY_STORAGE_KEY_EXPERT_MODE = "floraos_expert_mode_platform"

interface PlatformJourneyHomeProps {
  initialOrgs?: PlatformOrganizationSummary[] | null
  initialHealth?: PlatformSystemHealth | null
}

export function PlatformJourneyHome({
  initialOrgs = null,
  initialHealth = null,
}: PlatformJourneyHomeProps) {
  const router = useRouter()
  const { t } = useI18n()
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
  const [activeJourney, setActiveJourney] = useState<JourneyDefinition | null>(null)
  const [journeyState, setJourneyState] = useState(() =>
    activeJourney ? createJourneyState(activeJourney) : null
  )

  const [orgs, setOrgs] = useState<PlatformOrganizationSummary[] | null>(initialOrgs)
  const [health, setHealth] = useState<PlatformSystemHealth | null>(initialHealth)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPERT_MODE) ?? localStorage.getItem(LEGACY_STORAGE_KEY_EXPERT_MODE)
      if (saved === "true") {
        setIsExpertMode(true)
      }
    } catch {
      // Bỏ qua lỗi storage
    }
  }, [])

  useEffect(() => {
    if (!orgs || !health) {
      void (async () => {
        try {
          const [orgsRes, healthRes] = await Promise.all([
            fetch("/api/v1/platform/organizations").then((r) => (r.ok ? r.json() : null)),
            fetch("/api/v1/platform/health").then((r) => (r.ok ? r.json() : null)),
          ])
          if (orgsRes?.data) setOrgs(orgsRes.data)
          if (healthRes?.data) setHealth(healthRes.data)
        } catch {
          // Bỏ qua lỗi fetch nền
        }
      })()
    }
  }, [orgs, health])

  const handleToggleExpertMode = (enabled: boolean) => {
    setIsExpertMode(enabled)
    try {
      localStorage.setItem(STORAGE_KEY_EXPERT_MODE, String(enabled))
    } catch {
      // Bỏ qua
    }
  }

  const handleSelectJourney = (journey: JourneyDefinition) => {
    if (journey.id === "view-platform-overview") {
      setActiveJourney(journey)
      setJourneyState(createJourneyState(journey))
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

  // 1. Chế độ Chuyên gia: Hiển thị bảng số liệu trực tiếp kèm thanh chuyển đổi
  if (isExpertMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-2 bg-selected border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-body-sm font-semibold text-text">
              Bạn đang ở Chế độ chuyên gia (Bảng điều khiển số liệu tổng quan)
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
        {orgs && health ? (
          <PlatformOverviewMetrics orgs={orgs} health={health} />
        ) : (
          <div className="p-8 text-center text-body-sm text-text-muted">
            Đang tải dữ liệu số liệu hệ thống...
          </div>
        )}
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
        {activeJourney.id === "view-platform-overview" ? (
          orgs && health ? (
            <PlatformOverviewMetrics orgs={orgs} health={health} />
          ) : (
            <div className="p-8 text-center text-body-sm text-text-muted">
              Đang tải báo cáo tổng quan nền tảng...
            </div>
          )
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
                onClick={() => router.push(activeJourney.primaryHref as never)}
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

  // 3. Mặc định: Lưới lựa chọn Hành trình tác vụ Nền tảng (ChoiceGrid)
  return (
    <ChoiceGrid
      title={t("home.tiers.mother.title")}
      subtitle={t("home.tiers.mother.subtitle")}
      journeys={filterByPhase(PLATFORM_JOURNEYS, (j) => j.primaryHref)}
      featuredJourneyId="view-platform-overview"
      onSelectJourney={handleSelectJourney}
      onSwitchToExpertMode={() => handleToggleExpertMode(true)}
    />
  )
}
