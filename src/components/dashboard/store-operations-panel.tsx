"use client"

import React from "react"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Button } from "@/components/ui/button"
import { IconTile } from "@/components/ui/app-icon"
import { InfoTip } from "@/components/ui/info-tip"
import type { StoreOperationsSection } from "@/modules/toolkit/domain/store-operations"
import { ToolCard } from "./toolkit-card"

interface StoreOperationsPanelProps {
  section: StoreOperationsSection
  isDev: boolean
  onBack?: () => void
}

export function StoreOperationsPanel({ section, isDev, onBack }: StoreOperationsPanelProps) {
  return (
    <section className="space-y-8">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 -ml-2 text-body-sm font-medium text-text-muted hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Tất cả các mục
        </Button>
      )}

      <div className="flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-surface shadow-sm ring-1 ring-border/60">
        <IconTile name={section.icon} tone="indigo" variant="solid" />
        <div className="min-w-0">
          <span className="text-caption font-semibold text-text-muted">Khu chức năng riêng</span>
          <div className="flex items-center gap-2">
            <h2 className="text-display font-extrabold text-text tracking-tight">{section.name}</h2>
            <InfoTip label={section.name} side="bottom">{section.purpose}</InfoTip>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {section.groups.map((group) => (
          <div key={group.key} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-title-sm font-bold text-text">
                {group.name}
                <span className="ml-2 text-caption font-medium text-text-muted">
                  {group.tools.length} công cụ
                </span>
              </h3>
              <InfoTip label={group.name} side="bottom">{group.purpose}</InfoTip>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {group.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} isDev={isDev} tone="indigo" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
