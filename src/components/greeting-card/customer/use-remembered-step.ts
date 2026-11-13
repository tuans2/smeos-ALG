"use client"

import { useEffect, useRef } from "react"
import { readSavedState, writeSavedState } from "./use-saved-state"

/**
 * Nhớ khách đang ở bước nào của trang (xem mẫu, điền đơn, theo dõi…) trên chính máy khách, để
 * rời trang rồi mở lại thì về đúng bước đó. `resolve` quyết bước đã lưu còn hợp lệ không theo dữ
 * liệu thật (vd. đã có đơn thì không về form) — trả `null` để giữ bước máy chủ chọn.
 */
export function useRememberedStep<S extends string>(name: string, step: S, setStep: (s: S) => void, resolve: (saved: S) => S | null) {
  const restored = useRef(false)
  const resolveRef = useRef(resolve)
  useEffect(() => {
    resolveRef.current = resolve
  })

  useEffect(() => {
    const saved = readSavedState<S>(name)
    restored.current = true
    const target = saved ? resolveRef.current(saved) : null
    if (target && target !== step) setStep(target)
    // chỉ khôi phục một lần khi trang mở
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  useEffect(() => {
    if (restored.current) writeSavedState(name, step)
  }, [name, step])
}
