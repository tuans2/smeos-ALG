"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Check } from "@/components/ui/icon-set/check"
import type { PresetDefinition, UiPresetId } from "@/lib/ui-system/types"

interface UiStudioPresetListProps {
  availablePresets: PresetDefinition[]
  selectedPresetId: UiPresetId
  onSelectPreset: (id: UiPresetId) => void
}

export function UiStudioPresetList({
  availablePresets,
  selectedPresetId,
  onSelectPreset,
}: UiStudioPresetListProps) {
  return (
    <div className="space-y-3">
      {availablePresets.map((preset) => {
        const isSelected = selectedPresetId === preset.id

        return (
          <Button variant="outline"
            type="button"
            key={preset.id}
            onClick={() => onSelectPreset(preset.id as UiPresetId)}
            className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 w-full text-left p-3.5 rounded-2xl cursor-pointer transition-all border ${
              isSelected
                ? "border-primary ring-1 ring-primary bg-primary-muted/30 hover:bg-primary-muted/30"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-alt/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-meta font-bold text-text">{preset.name}</h3>
                  {preset.isDefault && (
                    <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-fg">
                      Mặc định
                    </span>
                  )}
                  {preset.scope !== "all" && (
                    <span
                      className={`text-caption font-medium px-2 py-0.5 rounded-full border ${
                        preset.scope === "saas-mother"
                          ? "bg-info-bg border-border text-info"
                          : "bg-warning-bg border-warning-border text-warning-text"
                      }`}
                    >
                      {preset.scope === "saas-mother" ? "✦ SaaS Mother" : "✦ ChainOS / StoreOS"}
                    </span>
                  )}
                </div>
                <p className="text-caption text-text-muted mt-0.5 font-medium">{preset.tagline}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? "bg-primary text-primary-fg" : "border border-border bg-surface"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {/* Preview Color Swatches */}
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border">
              <div
                className="w-5 h-5 rounded-md shadow-2xs border border-black/10"
                style={{ backgroundColor: preset.tokens.primary }}
                title="Primary color"
              />
              <div
                className="w-5 h-5 rounded-md shadow-2xs border border-black/10"
                style={{ backgroundColor: preset.tokens.accent }}
                title="Accent color"
              />
              <div
                className="w-5 h-5 rounded-md shadow-2xs border border-black/10"
                style={{ backgroundColor: preset.tokens.bg }}
                title="Background"
              />
              <div
                className="w-5 h-5 rounded-md shadow-2xs border border-black/10"
                style={{ backgroundColor: preset.tokens.surface }}
                title="Surface"
              />
              <div
                className="w-5 h-5 rounded-md shadow-2xs border border-black/10"
                style={{ backgroundColor: preset.tokens.text }}
                title="Text"
              />
              <span className="text-caption font-mono text-text-muted ml-auto">
                R: {preset.radius.button}
              </span>
            </div>
          </Button>
        )
      })}
    </div>
  )
}
