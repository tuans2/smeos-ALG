"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import {
  canResume, createCollectionSession, currentIndex, fromLegacySwipes, goNext, goPrevious, jumpTo, restart, toggleLike,
  type CollectionSession,
} from "@/modules/greeting-card/domain/collection-session"
import { useSavedState } from "../../use-saved-state"
import { useCustomerJourney } from "../../journey-context"
import { useHeartTracker } from "../../heart-tracker"

export const JOURNEY_STATE_NAME = "journey"

type Prompt = "onboarding" | "resume" | null

/**
 * Trạng thái xem bộ sưu tập kiểu Story (mẫu sau / mẫu trước / thả tim / tiếp tục), nhớ trên chính
 * trình duyệt theo trang đang mở — tải lại, Back/Forward hay đóng mở lại link vẫn giữ nguyên.
 */
export function useSwipeJourney(products: GreetingCatalogProduct[], collectionKey: string, embedded: boolean) {
  const journey = useCustomerJourney()
  const heartTracker = useHeartTracker()
  const order = useMemo(() => products.map((p) => p.id), [products])
  const prefix = embedded ? "preview-" : ""
  const [saved, setSaved, , ready] = useSavedState<CollectionSession | null>(`${prefix}${JOURNEY_STATE_NAME}`, null)
  const [legacy, , clearLegacy, legacyReady] = useSavedState<{ id: string; dir: string }[]>(`${prefix}swipes`, [])
  const [sessionId] = useState(() => crypto.randomUUID())
  // Khách bấm "Bắt đầu xem" / "Tiếp tục xem" / "Xem lại từ đầu" → không hỏi lại trong lần mở này
  const [dismissed, setDismissed] = useState(false)

  // Lần đầu (hoặc khách của bản cũ — chuyển lịch sử vuốt cũ sang): phiên mới chỉ ghi ở lần thao tác đầu
  // Dựng thẻ ngay từ lần render đầu (cả trên máy chủ); trạng thái đã lưu thay vào khi đọc xong bộ nhớ
  const loaded = ready && legacyReady
  const fresh = useMemo(() => {
    if (saved) return null
    const base = createCollectionSession({ sessionId, collectionId: collectionKey, order, now: new Date() })
    return legacy.length > 0 ? fromLegacySwipes(legacy, base, order) : base
  }, [saved, sessionId, collectionKey, order, legacy])
  const state = saved ?? fresh

  const prompt: Prompt =
    embedded || dismissed || !loaded || !state ? null : !state.onboarded ? "onboarding" : canResume(state, order) ? "resume" : null

  const index = state ? currentIndex(state, order) : 0
  const current = products[index]

  const started = state !== null
  useEffect(() => {
    if (started) journey?.track("collection_opened")
  }, [started, journey])

  useEffect(() => {
    journey?.onCurrentProductChange(current ?? null)
    if (current && prompt === null) journey?.track("product_viewed", current.id)
  }, [current, prompt, journey])

  const apply = useCallback(
    (fn: (s: CollectionSession) => CollectionSession) => {
      if (!saved && legacy.length > 0) clearLegacy()
      setSaved((s) => {
        const cur = s ?? fresh
        return cur ? fn(cur) : s
      })
    },
    [setSaved, saved, fresh, legacy.length, clearLegacy],
  )

  const liked = useMemo(() => (state ? products.filter((p) => state.likedProductIds.includes(p.id)) : []), [state, products])

  return {
    state,
    index,
    current,
    liked,
    prompt,
    canGoBack: index > 0,
    next: () => apply((s) => goNext(s, order, new Date())),
    /** Thả / bỏ tim mẫu đang xem — gửi lên để cộng tổng tim của bộ sưu tập. */
    toggleLike: () => {
      if (!current || !state) return
      const { liked: nowLiked } = toggleLike(state, order, new Date())
      journey?.track(nowLiked ? "product_liked" : "product_unliked", current.id)
      if (!embedded) heartTracker?.(current.id, nowLiked)
      apply((s) => toggleLike(s, order, new Date()).session)
      return nowLiked
    },
    isLiked: (id: string) => Boolean(state?.likedProductIds.includes(id)),
    previous: () => {
      const prev = products[index - 1]
      if (prev) journey?.track("product_revisited", prev.id)
      apply((s) => goPrevious(s, order, new Date()))
    },
    jumpTo: (id: string) => apply((s) => jumpTo(s, order, id, new Date())),
    restart: () => apply((s) => restart(s, order, new Date())),
    /** Bấm "Bắt đầu xem" / "Tiếp tục xem" */
    start: () => {
      apply((s) => ({ ...s, onboarded: true, lastActivityAt: new Date().toISOString() }))
      setDismissed(true)
    },
    /** Bấm "Xem lại từ đầu" ở hộp hỏi tiếp tục */
    startOver: () => {
      apply((s) => restart({ ...s, onboarded: true }, order, new Date()))
      setDismissed(true)
    },
  }
}
