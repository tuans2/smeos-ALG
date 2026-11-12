"use client"

import React from "react"
import { Sparkles, Flower2, HeartHandshake, Scissors } from "@/components/ui/icons"
import type { LandingSectionStory } from "@/modules/content-engine/domain/landing-content-generator"

interface LandingTemplateStoryProps {
  story?: LandingSectionStory | undefined
  archetypeId?: string | undefined
  storyImageUrl?: string | undefined
}

export function LandingTemplateStory({
  story,
  archetypeId = "minimal-luxury",
  storyImageUrl,
}: LandingTemplateStoryProps) {
  // Ẩn section nếu không có nội dung story hoặc không có ảnh thật từ shop
  if (!story || !storyImageUrl) return null

  const isLuxury = archetypeId === "minimal-luxury"
  const isRomantic = archetypeId === "pastel-romantic"
  const isFestive = archetypeId === "festive-sale"
  const isModern = archetypeId === "modern-split"

  const displayImage = storyImageUrl

  const containerBorder = isLuxury
    ? "bg-surface-alt/60 border-primary/20 shadow-xs"
    : isRomantic
    ? "bg-surface border-primary/30 shadow-xs"
    : isFestive
    ? "bg-surface border-primary/30 shadow-xs"
    : "bg-surface border-border shadow-xs"

  const titleStyle = isLuxury
    ? "font-display text-title sm:text-display font-normal text-text mt-0.5 leading-snug"
    : "font-semibold text-title-sm sm:text-title text-text mt-0.5 leading-snug"

  return (
    <section className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${containerBorder}`}>
      {/* Top Header */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isLuxury ? "bg-primary/10 text-primary" : isFestive ? "bg-primary/10 text-primary" : "bg-primary-muted/30 text-primary"
        }`}>
          <Flower2 size={16} />
        </div>
        <div>
          <span className={`text-caption font-bold tracking-widest uppercase flex items-center gap-1.5 ${
            isLuxury ? "font-display text-primary" : isFestive ? "text-primary" : "text-primary"
          }`}>
            <Sparkles size={12} />
            <span>{"Câu chuyện của tiệm"}</span>
          </span>
          <h3 className={titleStyle}>
            {story.title}
          </h3>
        </div>
      </div>

      {/* 2-Column Layout: Text & Florist Workshop Photo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left: Craftsmanship Photo */}
        <div className={`relative aspect-4/3 w-full rounded-2xl overflow-hidden shadow-md group ${
          isLuxury ? "border-2 border-primary/30 p-1 bg-surface" : "border border-border"
        }`}>
          <img
            src={displayImage}
            alt="Nghệ nhân chế tác"
            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 text-caption font-bold text-white bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5">
            <Scissors size={12} />
            <span>Ảnh của tiệm</span>
          </div>
        </div>

        {/* Right: Paragraphs & Quote */}
        <div className="space-y-4">
          <div className={`space-y-3 text-body-sm leading-relaxed ${isLuxury ? "font-display text-text" : "text-text-muted"}`}>
            {story.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {story.quote && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isLuxury
                ? "bg-surface border-primary/30 border-l-4 border-l-primary shadow-xs"
                : isFestive
                ? "bg-primary/10/20 border-primary/30 text-text"
                : "bg-surface-alt border-border"
            }`}>
              <HeartHandshake size={20} className={`${isLuxury ? "text-primary" : isFestive ? "text-primary" : "text-primary"} shrink-0 mt-0.5`} />
              <div className="space-y-1">
                <p className={`text-body-sm italic font-medium text-text ${isLuxury ? "font-display" : ""}`}>
                  {story.quote}
                </p>
                <div className={`text-caption font-bold ${isLuxury ? "font-display text-primary" : "text-text-muted"}`}>
                  — {story.floristName}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
