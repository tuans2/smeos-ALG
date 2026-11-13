/**
 * Trạng thái lướt bộ sưu tập của MỘT khách trên MỘT trình duyệt (lưu ở máy khách, không gắn vào
 * URL). Mọi hàm thuần: nhận trạng thái cũ + thứ tự mẫu đang hiện (`order`), trả trạng thái mới.
 * Lướt kiểu Story (07/10/2026): `goNext`/`goPrevious` chỉ di chuyển; thả tim là `toggleLike` trên
 * mẫu đang xem, không tự sang mẫu khác. `decide`/`undo` giữ cho dữ liệu cũ. Pure TypeScript.
 */

export interface CollectionSession {
  sessionId: string
  collectionId: string
  /** `null` = đã lướt hết (đang ở màn cuối) */
  currentProductId: string | null
  likedProductIds: string[]
  skippedProductIds: string[]
  viewedProductIds: string[]
  lastActivityAt: string
  orderId: string | null
  /** Đã xem hướng dẫn lần đầu */
  onboarded: boolean
}

export type Decision = "like" | "skip"

const without = (list: readonly string[], id: string) => list.filter((x) => x !== id)
const withId = (list: readonly string[], id: string) => (list.includes(id) ? [...list] : [...list, id])

export function createCollectionSession(input: { sessionId: string; collectionId: string; order: readonly string[]; now: Date }): CollectionSession {
  const first = input.order[0] ?? null
  return {
    sessionId: input.sessionId,
    collectionId: input.collectionId,
    currentProductId: first,
    likedProductIds: [],
    skippedProductIds: [],
    viewedProductIds: first ? [first] : [],
    lastActivityAt: input.now.toISOString(),
    orderId: null,
    onboarded: false,
  }
}

export function isDecided(s: CollectionSession, id: string): boolean {
  return s.likedProductIds.includes(id) || s.skippedProductIds.includes(id)
}

/** Vị trí đang xem trong `order`; `order.length` = màn cuối. Mẫu đang xem bị gỡ → mẫu chưa quyết đầu tiên. */
export function currentIndex(s: CollectionSession, order: readonly string[]): number {
  if (s.currentProductId === null) return order.length
  const idx = order.indexOf(s.currentProductId)
  if (idx >= 0) return idx
  const firstOpen = order.findIndex((id) => !isDecided(s, id))
  return firstOpen >= 0 ? firstOpen : order.length
}

function moveTo(s: CollectionSession, order: readonly string[], index: number, now: Date): CollectionSession {
  const id = index >= 0 && index < order.length ? order[index]! : null
  return {
    ...s,
    currentProductId: id,
    viewedProductIds: id ? withId(s.viewedProductIds, id) : s.viewedProductIds,
    lastActivityAt: now.toISOString(),
  }
}

/** Thích / Bỏ qua mẫu đang xem rồi sang mẫu kế tiếp. Đổi ý (Thích ↔ Bỏ qua) thì ghi đè. */
export function decide(s: CollectionSession, order: readonly string[], decision: Decision, now: Date): CollectionSession {
  const idx = currentIndex(s, order)
  const id = order[idx]
  if (!id) return s
  const marked: CollectionSession = {
    ...s,
    likedProductIds: decision === "like" ? withId(s.likedProductIds, id) : without(s.likedProductIds, id),
    skippedProductIds: decision === "skip" ? withId(s.skippedProductIds, id) : without(s.skippedProductIds, id),
  }
  return moveTo(marked, order, idx + 1, now)
}

/** Sang mẫu kế tiếp (chạm phải / vuốt trái) — không đổi tim. Ở mẫu cuối → màn cuối. */
export function goNext(s: CollectionSession, order: readonly string[], now: Date): CollectionSession {
  const idx = currentIndex(s, order)
  if (idx >= order.length) return s
  return moveTo(s, order, idx + 1, now)
}

/** Thả / bỏ tim mẫu đang xem, đứng yên tại mẫu đó. */
export function toggleLike(s: CollectionSession, order: readonly string[], now: Date): { session: CollectionSession; liked: boolean } {
  const id = order[currentIndex(s, order)]
  if (!id) return { session: s, liked: false }
  const liked = !s.likedProductIds.includes(id)
  return {
    liked,
    session: {
      ...s,
      likedProductIds: liked ? withId(s.likedProductIds, id) : without(s.likedProductIds, id),
      skippedProductIds: without(s.skippedProductIds, id),
      lastActivityAt: now.toISOString(),
    },
  }
}

/** Quay lại mẫu trước, GIỮ nguyên Thích/Bỏ qua đã chọn. Đang ở mẫu đầu → không đổi. */
export function goPrevious(s: CollectionSession, order: readonly string[], now: Date): CollectionSession {
  const idx = currentIndex(s, order)
  if (idx <= 0) return s
  return moveTo(s, order, idx - 1, now)
}

/** Hoàn tác: quay lại mẫu trước VÀ xoá lựa chọn của mẫu đó. */
export function undo(s: CollectionSession, order: readonly string[], now: Date): CollectionSession {
  const idx = currentIndex(s, order)
  const prev = order[idx - 1]
  if (!prev) return s
  const back = moveTo(s, order, idx - 1, now)
  return { ...back, likedProductIds: without(back.likedProductIds, prev), skippedProductIds: without(back.skippedProductIds, prev) }
}

/** Nhảy tới một mẫu (xem mẫu tương tự, chọn từ danh sách đã thích). */
export function jumpTo(s: CollectionSession, order: readonly string[], productId: string, now: Date): CollectionSession {
  const idx = order.indexOf(productId)
  return idx < 0 ? s : moveTo(s, order, idx, now)
}

/** Xem lại từ đầu: xoá lượt Thích/Bỏ qua, giữ mã phiên và việc đã xem hướng dẫn. */
export function restart(s: CollectionSession, order: readonly string[], now: Date): CollectionSession {
  return moveTo({ ...s, likedProductIds: [], skippedProductIds: [], viewedProductIds: [] }, order, 0, now)
}

/** Mở lại link có nên hỏi "Tiếp tục xem / Xem lại từ đầu" không. */
export function canResume(s: CollectionSession, order: readonly string[]): boolean {
  if (s.orderId) return false
  return currentIndex(s, order) > 0
}

/** Chuyển lịch sử vuốt của bản cũ (`[{id, dir}]`) sang trạng thái mới — khách cũ không mất mẫu đã thích. */
export function fromLegacySwipes(
  history: ReadonlyArray<{ id: string; dir: string }>,
  base: CollectionSession,
  order: readonly string[],
): CollectionSession {
  let s = base
  for (const h of history) {
    if (order[currentIndex(s, order)] !== h.id) break
    s = decide(s, order, h.dir === "like" ? "like" : "skip", new Date(base.lastActivityAt))
  }
  return { ...s, onboarded: history.length > 0 || base.onboarded }
}
