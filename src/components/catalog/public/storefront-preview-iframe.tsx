"use client"

import React, { useEffect, useRef, useState } from "react"
import type { PublicCatalogResult } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { PREVIEW_MESSAGE_TYPE, PREVIEW_READY_TYPE } from "./storefront-preview-frame"

const DEVICE = {
  mobile: { width: 390, height: 780 },
  desktop: { width: 1280, height: 800 },
} as const

interface StorefrontPreviewIframeProps {
  data: PublicCatalogResult
  device: keyof typeof DEVICE
}

/**
 * Bản xem trước = chính trang khách `/c/[slug]` vẽ trong iframe đúng bề rộng thiết bị
 * (390px hoặc 1280px thu nhỏ cho vừa khung), nên bố cục di động/máy tính khớp trang thật.
 */
export function StorefrontPreviewIframe({ data, device }: StorefrontPreviewIframeProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [boxWidth, setBoxWidth] = useState(0)
  const size = DEVICE[device]

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      if ((event.data as { type?: string } | null)?.type === PREVIEW_READY_TYPE) setReady(true)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  useEffect(() => {
    if (!ready) return
    frameRef.current?.contentWindow?.postMessage({ type: PREVIEW_MESSAGE_TYPE, payload: data }, window.location.origin)
  }, [ready, data])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = boxWidth > 0 ? Math.min(1, boxWidth / size.width) : 1

  return (
    <div ref={boxRef} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-3xl border border-border bg-surface shadow-lg"
        style={{ width: size.width * scale, height: size.height * scale }}
      >
        <iframe
          ref={frameRef}
          src="/xem-truoc-trang"
          title="Bản xem trước trang khách"
          style={{ width: size.width, height: size.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="border-0"
        />
      </div>
    </div>
  )
}
