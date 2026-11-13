"use client"

import React, { useState } from "react"
import { Flower2 } from "@/components/ui/icons"
import { resolveFlowerImage } from "./flower-image-fallback"

interface SmartFlowerImageProps {
  src: string | null | undefined
  alt: string
  aspectRatio?: "square" | "4/3" | "16/9" | "4/5" | "16/10"
  fallbackIndex?: number
  className?: string
  priority?: boolean
  fitMode?: "cover" | "contain"
  blendMode?: React.CSSProperties["mixBlendMode"] | string | undefined
  imageFilter?: string | undefined
  backdropGradient?: string | undefined
}

export function SmartFlowerImage({
  src,
  alt,
  aspectRatio = "4/3",
  fallbackIndex = 0,
  className = "",
  fitMode = "cover",
  blendMode,
  imageFilter,
  backdropGradient,
}: SmartFlowerImageProps) {
  const [errorSrc, setErrorSrc] = useState<string | null>(null)
  const isBroken = errorSrc === src
  const currentSrc = isBroken
    ? resolveFlowerImage(null, fallbackIndex)
    : resolveFlowerImage(src, fallbackIndex)

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "16/9"
      ? "aspect-16/9"
      : aspectRatio === "4/5"
      ? "aspect-4/5"
      : aspectRatio === "16/10"
      ? "aspect-16/10"
      : "aspect-4/3"

  const handleImgError = () => {
    setErrorSrc(src || "")
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-alt/80 flex items-center justify-center ${aspectClass} ${className}`}
      style={backdropGradient ? { background: backdropGradient } : undefined}
    >
      {/* Background ambient blur — chỉ khi không dùng backdropGradient */}
      {!backdropGradient && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-125 pointer-events-none transition-opacity duration-700"
          style={{ backgroundImage: `url(${currentSrc})` }}
        />
      )}

      {/* Main Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onError={handleImgError}
        className={`relative z-10 w-full h-full ${
          fitMode === "contain" ? "object-contain" : "object-cover"
        } transition-transform duration-500 group-hover:scale-105 select-none`}
        style={{
          mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
          filter: imageFilter,
        }}
      />
    </div>
  )
}
