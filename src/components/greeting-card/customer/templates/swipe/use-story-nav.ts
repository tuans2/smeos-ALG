"use client"

import { useCallback, useRef, useState } from "react"
import type React from "react"

/** Vùng chạm "quay lại" bên trái màn hình (như Facebook Story). */
export const BACK_ZONE = 1 / 3
const SWIPE_DISTANCE = 50
const TAP_SLOP = 8
const MAX_DRAG = 120

export type StoryNavAction = "next" | "previous"

/** Thuần — dễ test: chạm hay vuốt → đi đâu. `dx` = điểm thả − điểm chạm (px), `x` tỉ lệ trong thẻ (0–1). */
export function resolveStoryGesture(dx: number, dy: number, xRatio: number): StoryNavAction | null {
  if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return xRatio < BACK_ZONE ? "previous" : "next"
  if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "next" : "previous"
  return null
}

interface Options {
  onNext: () => void
  onPrevious: () => void
  disabled?: boolean
}

/**
 * Điều hướng kiểu Facebook Story: chạm 2/3 bên phải → mẫu sau, 1/3 bên trái → mẫu trước;
 * vuốt sang trái → mẫu sau, vuốt sang phải → mẫu trước. Chạm vào nút (`button`, `a`, `[data-no-nav]`)
 * không điều hướng — nút ⓘ chi tiết, tim… tự xử lý.
 */
export function useStoryNav({ onNext, onPrevious, disabled }: Options) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null)
  const [dragX, setDragX] = useState(0)

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (disabled || (e.target as HTMLElement).closest("button, a, [data-no-nav]")) return
    origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [disabled])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const o = origin.current
    if (!o || o.id !== e.pointerId) return
    const dx = e.clientX - o.x
    if (Math.abs(dx) > TAP_SLOP) setDragX(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx)))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const o = origin.current
    origin.current = null
    setDragX(0)
    if (!o || o.id !== e.pointerId || disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xRatio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 1
    const action = resolveStoryGesture(e.clientX - o.x, e.clientY - o.y, xRatio)
    if (action === "next") onNext()
    else if (action === "previous") onPrevious()
  }, [disabled, onNext, onPrevious])

  const onPointerCancel = useCallback(() => {
    origin.current = null
    setDragX(0)
  }, [])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    /** Thẻ nhích nhẹ theo ngón tay khi vuốt — phản hồi, không bay khỏi màn hình như Tinder. */
    style: { transform: `translateX(${dragX * 0.35}px)`, transition: dragX === 0 ? "transform 180ms ease-out" : "none", touchAction: "pan-y" } as React.CSSProperties,
  }
}
