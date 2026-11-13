"use client"

import Script from "next/script"
import { useEffect, useRef } from "react"

/**
 * Widget Cloudflare Turnstile — chỉ hiện khi khai `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 * Chưa khai thì không tải gì từ bên ngoài; máy chủ khi đó chỉ dùng ô bẫy + giới hạn tần suất.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; language?: string }) => string
      remove: (id: string) => void
    }
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  const mount = () => {
    if (!ref.current || !window.turnstile || widgetId.current) return
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(null),
      language: "vi",
    })
  }

  useEffect(() => {
    mount()
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!TURNSTILE_SITE_KEY) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mount} />
      <div ref={ref} className="flex justify-center" />
    </>
  )
}
