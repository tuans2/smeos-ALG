"use client"

import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Wrench } from "@/components/ui/icon-set/wrench"
import type { IconTone } from "@/components/ui/app-icon"
import type { AssetTypeDefinition } from "@/modules/marketing-center/domain/asset-type"
import type { ModuleTool } from "@/modules/toolkit/domain/business-modules"
import type { ToolDefinition } from "@/modules/toolkit/domain/toolkit-catalog"
import { AssetTypeCard } from "./asset-type-card"
import { ToolCard } from "./toolkit-card"

interface ModuleCatalogSectionsProps {
  assets: readonly AssetTypeDefinition[]
  tools: readonly ModuleTool[]
  toolMap: ReadonlyMap<number, ToolDefinition>
  isDev: boolean
  tone: IconTone
}

/** Khu "Bạn muốn tạo gì?" (loại ấn phẩm) + "Công cụ hỗ trợ" của một nhóm trên /cong-cu. */
export function ModuleCatalogSections({ assets, tools, toolMap, isDev, tone }: ModuleCatalogSectionsProps) {
  return (
    <>
      {/* Khu L0: Bạn muốn tạo gì? (Asset Types) */}
      {assets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="text-title-sm font-bold text-text">
                Bạn muốn tạo gì?
                <span className="ml-2 text-caption font-medium text-text-muted">
                  {assets.length} loại ấn phẩm
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {assets.map((asset) => (
              <AssetTypeCard
                key={asset.code}
                asset={asset}
                tool={asset.toolId ? toolMap.get(asset.toolId) : null}
                isDev={isDev}
              />
            ))}
          </div>
        </div>
      )}

      {/* Khu L1: Công cụ trực tiếp */}
      {tools.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-text-muted" aria-hidden="true" />
            <h3 className="text-title-sm font-bold text-text">
              Công cụ hỗ trợ
              <span className="ml-2 text-caption font-medium text-text-muted">
                {tools.length} công cụ
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} isDev={isDev} tone={tone} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
