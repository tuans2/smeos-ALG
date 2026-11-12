"use client"

import React from "react"
import { Camera, Clock, ShieldCheck, Gift, CheckCircle2 } from "@/components/ui/icons"
import type { LandingSectionPerk } from "@/modules/content-engine/domain/landing-content-generator"

interface LandingTemplatePerksProps {
  perks?: LandingSectionPerk[] | undefined
  archetypeId?: string | undefined
}

export function LandingTemplatePerks({
  perks,
  archetypeId = "minimal-luxury",
}: LandingTemplatePerksProps) {
  if (!perks || perks.length === 0) return null

  const isLuxury = archetypeId === "minimal-luxury"

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "camera":
        return <Camera size={18} className="text-primary" />
      case "clock":
        return <Clock size={18} className="text-warning-text" />
      case "shield":
        return <ShieldCheck size={18} className="text-success" />
      case "gift":
      default:
        return <Gift size={18} className="text-accent-text" />
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-caption font-bold text-text uppercase tracking-wider">
          <CheckCircle2 size={14} className="text-success" />
          <span>Vì sao chọn tiệm</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {perks.map((perk, idx) => (
          <div
            key={perk.id}
            className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 group shadow-xs ${
              isLuxury
                ? "bg-surface-alt/60 border-primary/20 hover:border-primary/60 hover:bg-surface"
                : "bg-surface border-border hover:border-primary"
            }`}
          >
            {isLuxury ? (
              <span className="font-display text-title font-bold text-primary shrink-0 block w-7 text-center">
                0{idx + 1}.
              </span>
            ) : (
              <div className="p-2 rounded-xl bg-surface-alt border border-border group-hover:bg-primary-muted/20 transition-colors shrink-0">
                {getIcon(perk.icon)}
              </div>
            )}

            <div className="space-y-1">
              <h4 className="text-caption font-bold text-text group-hover:text-primary transition-colors">
                {perk.title}
              </h4>
              <p className="text-caption text-text-muted leading-relaxed">
                {perk.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
