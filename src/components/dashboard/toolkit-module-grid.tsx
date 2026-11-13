"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { InfoTip } from "@/components/ui/info-tip"
import { IconTile, type IconTone } from "@/components/ui/app-icon"
import type { BusinessModule } from "@/modules/toolkit/domain/business-modules"
import type { StoreOperationsSection } from "@/modules/toolkit/domain/store-operations"
import { PROMOTION_GRID_SUMMARY } from "@/components/promotion-hub/promotion-copy"

/** Màu nhóm cho ô icon của từng module tăng trưởng và khu vận hành */
export const MODULE_TONES: Readonly<Record<string, IconTone>> = {
  brand: "plum",
  content: "rose",
  promotion: "orange",
  sales: "blue",
  care: "pink",
  print: "teal",
  store_operations: "indigo",
}

interface ModuleCardProps {
  module: BusinessModule
  isDev: boolean
  onOpen: (key: string) => void
}

function ModuleCard({ module, isDev, onOpen }: ModuleCardProps) {
  const readyAssets = module.assets.length
  const toolsCount = module.tools.length

  return (
    <div className="group relative flex flex-col items-center text-center p-4 pt-6 sm:p-6 rounded-2xl bg-surface shadow-sm hover:shadow-md ring-1 ring-border/60 hover:ring-primary transition-all">
      <InfoTip label={module.name} className="absolute top-1 right-1 sm:top-3 sm:right-3 m-0">
        {module.purpose}
      </InfoTip>
      <IconTile
        name={module.icon}
        tone={MODULE_TONES[module.key] ?? "plum"}
        variant="solid"
        className="mb-3 sm:mb-4 transition-transform group-hover:scale-105"
      />
      <span className="text-caption font-semibold text-text-muted">Mục tiêu {module.order}</span>
      <h2 className="text-body-sm sm:text-title-sm font-bold leading-snug text-text mt-0.5">
        <Button variant="ghost"
          type="button"
          onClick={() => onOpen(module.key)}
          className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring group-hover:text-primary transition-colors cursor-pointer"
        >
          {module.name}
        </Button>
      </h2>
      <span className="mt-1 sm:mt-2 text-caption text-text-muted">
        {module.journey === "BRAND_KIT" ? "3 bước: Hồ sơ · Nhận diện · Landing" : module.journey === "CONTENT_STUDIO" ? "4 bước: Thẻ sản phẩm · Thẻ chào · Bài đăng · Đăng tự động" : module.journey === "PROMOTION_HUB" ? PROMOTION_GRID_SUMMARY : (
          <>{readyAssets > 0 ? `${readyAssets} ấn phẩm · ` : ""}{toolsCount} công cụ</>
        )}
      </span>
    </div>
  )
}

function StoreOperationsCard({
  section,
  onOpen,
}: {
  section: StoreOperationsSection
  onOpen: (key: string) => void
}) {
  const totalTools = section.groups.reduce((sum, g) => sum + g.tools.length, 0)

  return (
    <div className="group relative flex flex-col items-center text-center p-4 pt-6 sm:p-6 rounded-2xl bg-surface shadow-sm hover:shadow-md ring-1 ring-border/60 hover:ring-primary transition-all border-dashed border-border">
      <InfoTip label={section.name} className="absolute top-1 right-1 sm:top-3 sm:right-3 m-0">
        {section.purpose}
      </InfoTip>
      <IconTile
        name={section.icon}
        tone="indigo"
        variant="solid"
        className="mb-3 sm:mb-4 transition-transform group-hover:scale-105"
      />
      <span className="text-caption font-semibold text-text-muted">Khu vận hành</span>
      <h2 className="text-body-sm sm:text-title-sm font-bold leading-snug text-text mt-0.5">
        <Button variant="ghost"
          type="button"
          onClick={() => onOpen(section.key)}
          className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring group-hover:text-primary transition-colors cursor-pointer"
        >
          {section.name}
        </Button>
      </h2>
      <span className="mt-1 sm:mt-2 text-caption text-text-muted">
        {section.groups.length} nhóm · {totalTools} công cụ
      </span>
    </div>
  )
}

interface ModuleGridProps {
  modules: readonly BusinessModule[]
  storeOperations: StoreOperationsSection
  isDev: boolean
  onOpen: (key: string) => void
}

export function ModuleGrid({ modules, storeOperations, isDev, onOpen }: ModuleGridProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {modules.map((module) => (
          <ModuleCard key={module.key} module={module} isDev={isDev} onOpen={onOpen} />
        ))}
        <StoreOperationsCard section={storeOperations} onOpen={onOpen} />
      </div>
    </div>
  )
}
