"use client"

import React, { useState } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Search } from "@/components/ui/icon-set/search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { useSession } from "@/lib/session"
import { isJourneyLocked } from "@/lib/feature-lock"
import { UserMenu } from "@/components/layout/user-menu"
import { useI18n } from "@/lib/i18n"
import { InfoTip } from "@/components/ui/info-tip"
import { ActionCard } from "./action-card"
import { FeaturedSpotlightCard } from "./featured-spotlight-card"
import { PageHeader } from "@/components/ui/page-header"

interface ChoiceGridProps {
  title: string
  subtitle?: string
  journeys: JourneyDefinition[]
  onSelectJourney: (journey: JourneyDefinition) => void
  onSwitchToExpertMode?: () => void
  featuredJourneyId?: string
}

export function ChoiceGrid({
  title,
  subtitle = "Chọn một công việc bên dưới để bắt đầu.",
  journeys,
  onSelectJourney,
  onSwitchToExpertMode,
  featuredJourneyId = "greeting-card-hub",
}: ChoiceGridProps) {
  const { userInitials } = useSession()
  const { t, dict } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")

  const featuredJourney = journeys.find((j) => j.id === featuredJourneyId)

  const isFeaturedMatchingSearch =
    !featuredJourney ||
    searchQuery.trim() === "" ||
    featuredJourney.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    featuredJourney.description.toLowerCase().includes(searchQuery.toLowerCase())

  const isFeaturedMatchingCategory =
    !featuredJourney ||
    selectedCategory === "ALL" ||
    (selectedCategory === "SINGLE" && featuredJourney.category === "SINGLE") ||
    (selectedCategory === "COMBO" && featuredJourney.category === "COMBO") ||
    (selectedCategory === "AI_SUGGEST" && featuredJourney.category === "AI_SUGGEST")

  const showFeaturedSpotlight = Boolean(
    featuredJourney && isFeaturedMatchingSearch && isFeaturedMatchingCategory
  )

  const filteredJourneys = journeys.filter((j) => {
    if (showFeaturedSpotlight && j.id === featuredJourneyId) {
      return false
    }

    const matchesSearch =
      searchQuery.trim() === "" ||
      j.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === "ALL" ||
      (selectedCategory === "COMBO" && j.category === "COMBO") ||
      (selectedCategory === "AI_SUGGEST" && j.category === "AI_SUGGEST") ||
      (selectedCategory === "SINGLE" && j.category === "SINGLE")

    return matchesSearch && matchesCategory
  })

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-8">
      {/* Header section */}
      <PageHeader
        className="pb-4 border-b border-border"
        breadcrumbs={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-selected text-primary text-caption font-semibold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{dict.home.header.badge}</span>
          </span>
        }
        title={title}
        tip={subtitle}
        actions={
          <>
          {onSwitchToExpertMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwitchToExpertMode}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4 text-text-muted" aria-hidden="true" />
              <span>{dict.home.header.expertModeButton}</span>
            </Button>
          )}
          <UserMenu initials={userInitials || "U"} direction="down" />
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none [scrollbar-width:none]">
          <Button
            type="button"
            variant={selectedCategory === "ALL" ? "primary" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("ALL")}
            className="shrink-0 whitespace-nowrap"
          >
            {t("home.filters.all", { count: journeys.length })}
          </Button>
          <Button
            type="button"
            variant={selectedCategory === "SINGLE" ? "primary" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("SINGLE")}
            className="shrink-0 whitespace-nowrap"
          >
            {dict.home.filters.singleTask}
          </Button>
          <Button
            type="button"
            variant={selectedCategory === "COMBO" ? "primary" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("COMBO")}
            className="shrink-0 whitespace-nowrap"
          >
            {dict.home.filters.workflow}
          </Button>
          <Button
            type="button"
            variant={selectedCategory === "AI_SUGGEST" ? "primary" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("AI_SUGGEST")}
            className="shrink-0 whitespace-nowrap"
          >
            {dict.home.filters.aiAssistant}
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={dict.home.filters.searchPlaceholder}
            className="pl-9 pr-3"
          />
        </div>
      </div>

      {/* Featured Spotlight Card */}
      {showFeaturedSpotlight && featuredJourney && (
        <FeaturedSpotlightCard
          journey={featuredJourney}
          onSelect={onSelectJourney}
          disabled={isJourneyLocked(featuredJourney.id)}
        />
      )}

      {/* Grid Cards */}
      {filteredJourneys.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filteredJourneys.map((journey) => (
            <ActionCard
              key={journey.id}
              journey={journey}
              onSelect={onSelectJourney}
              disabled={isJourneyLocked(journey.id)}
            />
          ))}
        </div>
      ) : !showFeaturedSpotlight ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-surface">
          <p className="text-body text-text-muted">
            {t("home.filters.emptySearch", { query: searchQuery })}
          </p>
        </div>
      ) : null}
    </div>
  )
}
