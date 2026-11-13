"use client"

import React, { useMemo } from "react"
import { Play, Video, Sparkles } from "@/components/ui/icons"

interface LandingTemplateVideoProps {
  videoUrl?: string | undefined
  archetypeId?: string | undefined
  title?: string | undefined
}

export function LandingTemplateVideo({
  videoUrl,
  archetypeId = "minimal-luxury",
  title = "Video mẫu thật",
}: LandingTemplateVideoProps) {
  if (!videoUrl || videoUrl.trim().length === 0) return null

  const isLuxury = archetypeId === "minimal-luxury"
  const isRomantic = archetypeId === "pastel-romantic"
  const isFestive = archetypeId === "festive-sale"
  const isModern = archetypeId === "modern-split"

  // Phân tích loại video (YouTube, TikTok, hay MP4 trực tiếp)
  const embedInfo = useMemo(() => {
    const url = videoUrl.trim()
    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
    if (ytMatch && ytMatch[1]) {
      return {
        type: "youtube" as const,
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
      }
    }
    // TikTok
    const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/)
    if (tiktokMatch && tiktokMatch[1]) {
      return {
        type: "tiktok" as const,
        embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      }
    }
    // MP4/Trực tiếp
    return {
      type: "direct" as const,
      embedUrl: url,
    }
  }, [videoUrl])

  const containerStyle = isLuxury
    ? "bg-surface-alt/50 border border-primary/30 rounded-3xl p-6 sm:p-8 shadow-md"
    : isFestive
    ? "bg-primary/10/15 border-2 border-primary/30 rounded-2xl p-6 sm:p-7 shadow-md"
    : isRomantic
    ? "bg-surface-alt/60 border border-primary/20 rounded-3xl p-6 sm:p-7 shadow-xs"
    : isModern
    ? "bg-surface border-2 border-border rounded-xl p-6 sm:p-7 shadow-sm"
    : "bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-xs"

  const titleFont = isLuxury
    ? "font-display text-title sm:text-display font-normal"
    : isFestive
    ? "font-semibold text-title sm:text-display text-primary"
    : isModern
    ? "font-semibold text-title sm:text-display"
    : "font-semibold text-title-sm sm:text-title"

  const badgeStyle = isLuxury
    ? "bg-primary/10 text-primary border border-primary/20 rounded-full font-display uppercase tracking-widest text-caption"
    : isFestive
    ? "bg-primary text-primary-foreground rounded-md font-semibold text-caption uppercase shadow-xs"
    : isRomantic
    ? "bg-primary/10 text-primary rounded-full font-bold text-caption"
    : "bg-surface-alt text-text border border-border rounded-md font-mono text-caption uppercase"

  const frameStyle = isLuxury
    ? "rounded-2xl border-2 border-primary/30 shadow-xl"
    : isFestive
    ? "rounded-xl border-2 border-primary/40 shadow-lg"
    : isRomantic
    ? "rounded-3xl border border-primary/20 shadow-md"
    : "rounded-lg border-2 border-border shadow-sm"

  return (
    <section className={`space-y-4 ${containerStyle}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isLuxury ? "bg-primary/10 text-primary" : isFestive ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"}`}>
            <Video size={18} />
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${badgeStyle}`}>
              <Sparkles size={11} />
              <span>{isLuxury ? "Video mẫu thật" : isFestive ? "Video mẫu thật" : "Video mẫu thật"}</span>
            </span>
            <h3 className={`text-text mt-1 leading-snug ${titleFont}`}>
              {title}
            </h3>
          </div>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-alt border border-border text-caption text-text-muted font-medium">
          <Play size={12} className={isFestive ? "text-primary fill-danger" : "text-primary fill-primary"} />
          <span>Video thật</span>
        </div>
      </div>

      {/* Video Player Frame */}
      <div className={`relative aspect-16/9 w-full overflow-hidden bg-black ${frameStyle}`}>
        {embedInfo.type === "youtube" ? (
          <iframe
            src={embedInfo.embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : embedInfo.type === "tiktok" ? (
          <iframe
            src={embedInfo.embedUrl}
            title={title}
            className="w-full h-full border-0"
            allowFullScreen
          />
        ) : (
          <video
            src={embedInfo.embedUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          >
            Trình duyệt của bạn không hỗ trợ phát video HTML5.
          </video>
        )}
      </div>

      <div className={`text-center text-caption text-text-muted ${isLuxury ? "font-display italic" : ""}`}>
        Video do tiệm cung cấp.
      </div>
    </section>
  )
}
