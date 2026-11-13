/**
 * Tổng tim của bộ sưu tập: mỗi khách (một phiên link riêng, hoặc một máy trên link công khai) chỉ
 * góp TỐI ĐA 1 tim cho mỗi mẫu; thao tác cuối cùng (thả / bỏ) quyết định. Pure TypeScript.
 */

export type HeartSource = "private" | "public"

export interface HeartAction {
  source: HeartSource
  /** Mã phiên (link riêng) hoặc mã khách đã băm (link công khai) */
  subject: string
  productId: string
  liked: boolean
  at: Date
}

export interface ProductHearts {
  productId: string
  hearts: number
  privateHearts: number
  publicHearts: number
}

export function tallyHearts(actions: readonly HeartAction[]): ProductHearts[] {
  const last = new Map<string, HeartAction>()
  for (const a of actions) {
    const key = `${a.source}|${a.subject}|${a.productId}`
    const prev = last.get(key)
    if (!prev || prev.at.getTime() <= a.at.getTime()) last.set(key, a)
  }
  const totals = new Map<string, ProductHearts>()
  for (const a of last.values()) {
    if (!a.liked) continue
    const t = totals.get(a.productId) ?? { productId: a.productId, hearts: 0, privateHearts: 0, publicHearts: 0 }
    t.hearts += 1
    if (a.source === "private") t.privateHearts += 1
    else t.publicHearts += 1
    totals.set(a.productId, t)
  }
  return [...totals.values()].sort((x, y) => y.hearts - x.hearts || x.productId.localeCompare(y.productId))
}
