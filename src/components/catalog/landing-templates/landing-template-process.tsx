"use client"

import React from "react"
import { ArrowRight, Sparkles } from "@/components/ui/icons"
import type { LandingSectionStep } from "@/modules/content-engine/domain/landing-content-generator"

interface LandingTemplateProcessProps {
  steps?: LandingSectionStep[] | undefined
  archetypeId?: string | undefined
}

export function LandingTemplateProcess({
  steps,
  archetypeId = "minimal-luxury",
}: LandingTemplateProcessProps) {
  if (!steps || steps.length === 0) return null

  const isLuxury = archetypeId === "minimal-luxury"
  const isRomantic = archetypeId === "pastel-romantic"
  const isFestive = archetypeId === "festive-sale"

  const containerStyle = isLuxury
    ? "bg-surface-alt/60 border-primary/20 shadow-xs"
    : isRomantic
    ? "bg-surface border-primary/30 shadow-xs"
    : isFestive
    ? "bg-surface border-primary/30 shadow-xs"
    : "bg-surface border-border shadow-xs"

  const titleStyle = isLuxury
    ? "font-display text-title sm:text-display font-normal text-text mt-1"
    : "text-title-sm sm:text-title font-semibold text-text mt-1"

  return (
    <section className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${containerStyle}`}>
      <div className="text-center max-w-md mx-auto space-y-1">
        <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-caption font-semibold uppercase tracking-wider ${
          isLuxury ? "bg-primary/10 text-primary font-display tracking-widest" : isFestive ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"
        }`}>
          <Sparkles size={12} />
          <span>{"Đặt hoa trong vài bước"}</span>
        </div>
        <h3 className={titleStyle}>
          Chọn mẫu, tiệm lo phần còn lại
        </h3>
        <p className={`text-caption ${isLuxury ? "font-display text-text" : "text-text-muted"}`}>
          Quy trình chuẩn hóa từ lúc chọn mẫu đến khi sản phẩm thắm đến tay người nhận.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {steps.map((st, idx) => (
          <div
            key={st.step}
            className={`p-5 rounded-2xl border relative flex flex-col justify-between space-y-3 group transition-all shadow-xs ${
              isLuxury
                ? "bg-surface border-primary/20 hover:border-primary/60"
                : isFestive
                ? "bg-surface border-primary/20 hover:border-primary"
                : "bg-surface-alt border-border hover:border-primary"
            }`}
          >
            <div className="flex items-center justify-between">
              {isLuxury ? (
                <span className="font-display text-display text-primary font-bold">
                  0{st.step}.
                </span>
              ) : (
                <span className={`w-8 h-8 rounded-full text-white font-semibold text-caption flex items-center justify-center shadow-xs ${
                  isFestive ? "bg-primary" : "bg-primary"
                }`}>
                  0{st.step}
                </span>
              )}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex text-text-muted">
                  <ArrowRight size={16} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className={`text-caption font-bold text-text group-hover:text-primary transition-colors ${isLuxury ? "font-display text-body-sm" : ""}`}>
                {st.title}
              </h4>
              <p className={`text-caption leading-relaxed ${isLuxury ? "font-display text-text" : "text-text-muted"}`}>
                {st.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
