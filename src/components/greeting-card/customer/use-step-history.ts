"use client"

import { useEffect, useRef } from "react"

/**
 * Gắn bước của trang khách vào lịch sử trình duyệt: nút Back/Forward đi giữa các bước (xem mẫu ↔
 * điền đơn…) thay vì rời trang và mất tiến độ. `canEnter` chặn bước không hợp lệ (vd. quay lại
 * form khi đơn đã gửi) — khi đó giữ nguyên bước hiện tại.
 */
export function useStepHistory<S extends string>(step: S, setStep: (s: S) => void, canEnter: (s: S) => boolean) {
  const first = useRef(true)
  const fromPop = useRef(false)
  const guard = useRef(canEnter)
  useEffect(() => {
    guard.current = canEnter
  })

  useEffect(() => {
    if (first.current) {
      first.current = false
      window.history.replaceState({ ...(window.history.state ?? {}), customerStep: step }, "")
      return
    }
    if (fromPop.current) {
      fromPop.current = false
      return
    }
    if (window.history.state?.customerStep !== step) window.history.pushState({ customerStep: step }, "")
  }, [step])

  useEffect(() => {
    function onPop(e: PopStateEvent) {
      const target = (e.state as { customerStep?: S } | null)?.customerStep
      if (!target) return
      if (guard.current(target)) {
        fromPop.current = true
        setStep(target)
      } else {
        window.history.pushState({ customerStep: step }, "")
      }
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [setStep, step])
}
