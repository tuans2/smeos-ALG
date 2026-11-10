"use client"

import { useRef, useState } from "react"
import { errorText } from "@/lib/error-text"
import { approvePosts, generatePosts, type ChannelPost } from "./content-api"
import type { ContentJourney } from "./use-content-journey"
import { requestKey, type HeldKey } from "./request-key"

export const POST_CHANNELS = [
  { id: "facebook", label: "Facebook", hint: "Bài kể chuyện kèm album ảnh" },
  { id: "instagram", label: "Instagram", hint: "Chú thích ngắn, nhiều hashtag" },
  { id: "tiktok", label: "TikTok", hint: "Kịch bản video ngắn" },
  { id: "zalo", label: "Zalo", hint: "Tin gửi khách quen, chốt đơn nhanh" },
] as const

export type PostChannel = (typeof POST_CHANNELS)[number]["id"]

export const channelLabel = (id: string) => POST_CHANNELS.find((c) => c.id === id)?.label ?? id

/**
 * Bước 3 — viết và duyệt bài đa kênh cho sản phẩm đang làm: chọn kênh → Content Engine viết từ dữ liệu đã duyệt
 * (Thẻ sản phẩm, Bài giới thiệu, Thẻ chào) → user sửa từng bài → duyệt một lần cho mọi kênh. Khoá chống trùng giữ
 * nguyên trong lúc một lượt đang chạy, nên bấm hai lần không bị trừ credit hai lần.
 */
export function useChannelPosts(journey: ContentJourney) {
  const latest = journey.view?.latest_posts ?? null
  const [channels, setChannels] = useState<PostChannel[]>(["facebook", "instagram", "zalo"])
  const [edits, setEdits] = useState<Record<string, ChannelPost>>({})
  const [busy, setBusy] = useState<"writing" | "approving" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** Khoá của lượt viết đang thử; đổi kênh/sản phẩm thì khoá mới (`requestKey`). */
  const keyRef = useRef<HeldKey | null>(null)

  const base = latest ? (latest.status === "DRAFT" ? latest.posts : latest.approved_posts ?? latest.posts) : []
  const posts: ChannelPost[] = base.map((p) => edits[`${latest?.generation_id}:${p.channel}`] ?? p)

  const toggle = (id: PostChannel) => setChannels((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]))

  const write = async () => {
    const productId = journey.view?.product.id
    if (!productId || channels.length === 0 || busy) return
    setBusy("writing"); setError(null); setNotice(null)
    keyRef.current = requestKey(keyRef.current, `${productId}|${[...channels].sort().join(",")}`, () => `content-posts-${productId}-${crypto.randomUUID()}`)
    try {
      const r = await generatePosts(productId, channels, keyRef.current.key)
      keyRef.current = null
      if (r.status === "FAILED") setError("Chưa viết được bài — thử lại sau ít phút")
      else if (r.status === "PROCESSING") setNotice("Lượt viết trước vẫn đang chạy — tải lại sau ít giây để xem kết quả")
      await journey.reload()
    } catch (e) {
      setError(errorText(e) || "Chưa viết được bài đăng")
    } finally {
      setBusy(null)
    }
  }

  const edit = (channel: string, patch: Partial<Pick<ChannelPost, "text" | "hashtags">>) => {
    if (!latest) return
    const key = `${latest.generation_id}:${channel}`
    const cur = posts.find((p) => p.channel === channel)
    if (cur) setEdits((e) => ({ ...e, [key]: { ...cur, ...patch } }))
  }

  const approve = async () => {
    if (!latest || posts.length === 0 || busy) return
    setBusy("approving"); setError(null); setNotice(null)
    try {
      await approvePosts(latest.generation_id, posts)
      setEdits({})
      await journey.reload()
      setNotice("Đã duyệt bài đăng — lưu trong Kho, sẵn sàng cho Bước 4.")
    } catch (e) {
      setError(errorText(e) || "Chưa duyệt được bài đăng")
    } finally {
      setBusy(null)
    }
  }

  return { latest, posts, channels, toggle, write, edit, approve, busy, error, notice }
}
