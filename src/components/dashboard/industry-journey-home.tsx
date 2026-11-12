"use client"

import "@/lib/brand-storage-migration"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Layers } from "@/components/ui/icon-set/layers"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Button } from "@/components/ui/button"
import { INDUSTRY_JOURNEYS } from "@/modules/journey/domain/journey-catalog"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { createJourneyState } from "@/modules/journey/domain/journey-state"
import { ChoiceGrid } from "@/components/journey/choice-grid"
import { JourneyShell } from "@/components/journey/journey-shell"
import { IndustryEcosystemBoard } from "./industry-ecosystem-board"
import { INDUSTRY_REGISTRY } from "@/modules/organization/domain/industries"
import { useI18n } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"

const STORAGE_KEY_EXPERT_MODE = "alg_expert_mode_industry"

export function IndustryJourneyHome() {
  const router = useRouter()
  const { t } = useI18n()
  const [isExpertMode, setIsExpertMode] = useState<boolean>(false)
  const [activeJourney, setActiveJourney] = useState<JourneyDefinition | null>(null)
  const [journeyState, setJourneyState] = useState(() =>
    activeJourney ? createJourneyState(activeJourney) : null
  )

  const [selectedIndustryKey, setSelectedIndustryKey] = useState<string>("FLORAL")
  const selectedPlugin = INDUSTRY_REGISTRY[selectedIndustryKey] ?? INDUSTRY_REGISTRY.FLORAL!

  useEffect(() => {
    // Chạy sau lượt render (không setState đồng bộ trong effect)
    void Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_EXPERT_MODE)
        if (saved === "true") {
          setIsExpertMode(true)
        }
      } catch {
        // Bỏ qua lỗi storage
      }
    })
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
    if (journey.id === "industry-ecosystem-overview") {
      setIsExpertMode(true)
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

  // 1. Chế độ Chuyên gia: Hiển thị Bảng điều phối hệ sinh thái đa ngành
  if (isExpertMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-2 bg-selected border border-border rounded-xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-body-sm font-semibold text-text">
              Bạn đang ở Chế độ chuyên gia (Bảng điều hành Hệ sinh thái Đa Ngành)
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
        <IndustryEcosystemBoard />
      </div>
    )
  }

  // 2. Chế độ Thực hiện Hành trình
  if (activeJourney && journeyState) {
    return (
      <JourneyShell
        journey={activeJourney}
        state={journeyState}
        onBackToHome={handleBackToHome}
      >
        <IndustryEcosystemBoard />
      </JourneyShell>
    )
  }

  // 3. Chế độ Mặc định: ChoiceGrid + Spotlight Card + Thanh chọn 7 Ngành
  return (
    <div className="space-y-6">
      {/* Thanh chọn nhanh 7 Ngành hàng */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-caption font-bold text-text uppercase tracking-wider">
              Chọn ngành hàng để kiểm tra hồ sơ chuẩn hóa:
            </span>
          </div>
          <Badge tone="accent" className="text-caption font-medium border border-primary/30 text-primary">
            7 Ngành Hàng Đã Kích Hoạt
          </Badge>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {Object.entries(INDUSTRY_REGISTRY).map(([key, plugin]) => {
            const isSelected = key === selectedIndustryKey
            return (
              <Button variant="ghost"
                type="button"
                key={key}
                onClick={() => setSelectedIndustryKey(key)}
                className={`h-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white shadow-xs hover:bg-primary"
                    : "bg-surface-alt border border-border text-text hover:bg-surface"
                }`}
              >
                <span>{plugin.identity.name}</span>
              </Button>
            )
          })}
        </div>

        {/* Khối tóm tắt nhanh ngành được chọn */}
        <div className="p-3.5 rounded-xl bg-surface-alt/60 border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-caption">
          <div className="space-y-1">
            <div className="font-bold text-text text-body-sm flex items-center gap-2">
              <span>{selectedPlugin.identity.name}</span>
              <span className="text-caption font-mono text-text-muted">({selectedPlugin.identity.key})</span>
            </div>
            <div className="text-text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Người làm: <strong className="text-text font-semibold">{selectedPlugin.terminology.makerTitle}</strong></span>
              <span>Sản phẩm mẫu: <strong className="text-text font-semibold">{selectedPlugin.terminology.sampleProduct}</strong></span>
              <span>Định mức: <strong className="text-text font-semibold">{selectedPlugin.bomSpec.measurementUnits.slice(0, 3).join(", ")}</strong></span>
              <span>Mẫu in: <strong className="text-text font-semibold">{selectedPlugin.templates.printables.length} loại</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/van-hanh/nganh" as never)}
              className="inline-flex items-center gap-1 font-bold text-primary text-caption"
            >
              <span>Xem ma trận ngành</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <ChoiceGrid
        title={t("home.tiers.industry.title")}
        subtitle={t("home.tiers.industry.subtitle")}
        journeys={INDUSTRY_JOURNEYS}
        onSelectJourney={handleSelectJourney}
        onSwitchToExpertMode={() => handleToggleExpertMode(true)}
        featuredJourneyId="industry-ecosystem-overview"
      />
    </div>
  )
}
