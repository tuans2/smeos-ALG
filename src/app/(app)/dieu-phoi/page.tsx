"use client"

import React, { useState } from "react"
import { Radio } from "@/components/ui/icon-set/radio"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Plus } from "@/components/ui/icon-set/plus"
import { LayoutDashboard } from "@/components/ui/icon-set/layout-dashboard"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Button } from "@/components/ui/button"
import { ListLayout } from "@/components/layout/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { ControlTowerDashboard } from "@/components/coordinator/control-tower-dashboard"
import { CoordinatorReminderBar } from "@/components/coordinator/coordinator-reminder-bar"
import { CoordinatorBrochureTab } from "@/components/greeting-card/coordinator/coordinator-brochure-tab"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"

type CoordinatorTab = "tower" | "brochure"

export default function DieuPhoiPage() {
  const [activeTab, setActiveTab] = useState<CoordinatorTab>("tower")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { can } = useSession()
  const { dict } = useI18n()

  return (
    <ListLayout
      header={
        <PageHeader
          title={dict.orders.coordinator.title}
          tip={dict.orders.coordinator.subtitle}
          badge={
            <span className="px-2 py-0.5 rounded-full bg-warning-bg text-warning-text text-caption font-bold">
              {dict.orders.coordinator.statusBadge}
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-1.5"
              >
                <RefreshCw size={13} />
                <span>{dict.common.actions.refresh}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 font-bold shadow-xs"
              >
                <Plus size={14} />
                <span>{dict.orders.coordinator.receiveNewOrder}</span>
              </Button>
            </div>
          }
        />
      }
      filters={
        <div className="space-y-4">
          {/* Thanh Nhắc Nghiệp Vụ Điều Phối (M0..M5) */}
          <CoordinatorReminderBar />

          {/* Coordinator Tabs Switcher */}
          <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-1.5 rounded-xl">
            <Button
              variant={activeTab === "tower" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tower")}
              className={`flex items-center gap-2 font-bold ${
                activeTab === "tower" ? "text-primary shadow-xs" : "text-text-muted"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>{dict.orders.coordinator.tabs.tower}</span>
            </Button>

            <Button
              variant={activeTab === "brochure" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("brochure")}
              className={`flex items-center gap-2 font-bold ${
                activeTab === "brochure" ? "text-primary shadow-xs" : "text-text-muted"
              }`}
            >
              <Sparkles size={16} />
              <span>{dict.orders.coordinator.tabs.brochure}</span>
            </Button>
          </div>
        </div>
      }
    >
      {/* Tab Contents */}
      {activeTab === "tower" && (
        <ControlTowerDashboard
          isCreateOpen={isCreateOpen}
          setIsCreateOpen={setIsCreateOpen}
        />
      )}

      {activeTab === "brochure" && (
        <CoordinatorBrochureTab canDecideInTransitCancel={can("R5")} />
      )}
    </ListLayout>
  )
}
