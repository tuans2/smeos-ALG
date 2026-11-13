"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { errorText } from "@/lib/error-text"
import * as api from "./publish-api"
import type { ContentJourney } from "./use-content-journey"

/** Hỏi lại hàng đợi mỗi 15 giây khi còn bài chờ / đang đăng — tối đa 40 lần (10 phút) rồi dừng, bấm "Tải lại" nếu cần. */
const QUEUE_POLL_MS = 15_000
const MAX_QUEUE_POLLS = 40

const RETURN_NOTICE: Readonly<Record<string, string>> = {
  ok: "Đã kết nối kênh — có thể đăng bài ngay.",
  "chon-trang": "Tài khoản quản lý nhiều Trang — chọn Trang dùng để đăng bài.",
}

/**
 * Bước 4 — đăng tự động: bài nguồn là lượt bài ĐÃ DUYỆT ở Bước 3 của sản phẩm đang làm (đi tiếp) hoặc của sản phẩm chọn
 * từ Kho (vào thẳng). Trạng thái kênh, kết nối (OAuth), chọn Trang Facebook, lên lịch theo chế độ, hàng đợi có huỷ / thử lại.
 */
export function useAutoPublish(journey: ContentJourney) {
  const params = useSearchParams()
  const latest = journey.view?.latest_posts ?? null
  const source = latest && (latest.status === "APPROVED" || latest.status === "SCHEDULED") ? latest : null
  const approvedChannels = (source?.approved_posts ?? []).map((p) => p.channel)

  const [channels, setChannels] = useState<api.ChannelStatusView[] | null>(null)
  const [pages, setPages] = useState<api.PendingPage[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<api.PublishMode>("AUTO")
  const [at, setAt] = useState("")
  const [queue, setQueue] = useState<api.SocialPostView[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(params.get("ket_noi") === "loi" ? params.get("ly_do") || "Chưa kết nối được kênh" : null)
  const [notice, setNotice] = useState<string | null>(RETURN_NOTICE[params.get("ket_noi") ?? ""] ?? null)
  const keyRef = useRef<string | null>(null)
  const polls = useRef(0)

  const loadChannels = useCallback(() =>
    Promise.all([api.fetchChannels(), api.fetchPendingPages().catch(() => [])])
      .then(([c, p]) => { setChannels(c); setPages(p) })
      .catch((e: unknown) => { setChannels([]); setError(errorText(e) || "Chưa tải được trạng thái kênh") }), [setChannels, setPages, setError])

  const loadQueue = useCallback((generationId: string) =>
    api.fetchPosts(generationId).then(setQueue).catch(() => { /* giữ danh sách cũ; lỗi tạm thời */ }), [setQueue])

  useEffect(() => { void loadChannels() }, [loadChannels])
  const generationId = source?.generation_id ?? null
  useEffect(() => { if (generationId) void loadQueue(generationId) }, [generationId, loadQueue])

  // Còn bài chờ / đang đăng → hỏi lại định kỳ, có trần
  const pending = queue.some((p) => p.status === "QUEUED" || p.status === "PUBLISHING")
  useEffect(() => {
    if (!pending || !generationId || polls.current >= MAX_QUEUE_POLLS) return
    const t = setTimeout(() => { polls.current++; void loadQueue(generationId) }, QUEUE_POLL_MS)
    return () => clearTimeout(t)
  }, [pending, queue, generationId, loadQueue])

  const isReady = (ch: string) => Boolean(channels?.find((c) => c.channel === ch)?.connected) && approvedChannels.includes(ch)
  const toggle = (ch: string) => { if (isReady(ch)) setSelected((cur) => (cur.includes(ch) ? cur.filter((c) => c !== ch) : [...cur, ch])) }
  const chosen = selected.filter(isReady)

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null); setNotice(null)
    try { await fn() } catch (e) { setError(errorText(e) || "Chưa thực hiện được — thử lại") } finally { setBusy(null) }
  }

  const connect = (channel: string) => run("connect", async () => { window.location.assign(await api.connectUrl(channel)) })
  const disconnect = (channel: string) => run("disconnect", async () => { await api.disconnectChannel(channel); await loadChannels() })
  const choosePage = (pageId: string) => run("page", async () => { await api.choosePage(pageId); await loadChannels(); setNotice("Đã kết nối Trang Facebook.") })

  const publish = () => run("publish", async () => {
    if (!source || chosen.length === 0) return
    if (mode === "AT" && !at) throw new Error("Chọn ngày giờ đăng")
    keyRef.current ??= `publish-${source.generation_id}-${crypto.randomUUID()}`
    await api.schedulePosts({ generationId: source.generation_id, channels: chosen, mode, scheduledAt: mode === "AT" ? new Date(at).toISOString() : null, idempotencyKey: keyRef.current })
    keyRef.current = null
    polls.current = 0
    setSelected([])
    await Promise.all([loadQueue(source.generation_id), journey.reload()])
    setNotice(mode === "NOW" ? "Đã gửi — bài sẽ lên trong vài phút." : "Đã lên lịch — hệ thống tự đăng đúng giờ.")
  })

  const cancel = (id: string) => run("cancel", async () => { await api.cancelPost(id); if (source) await loadQueue(source.generation_id) })
  const retry = (id: string) => run("retry", async () => { await api.retryPost(id); polls.current = 0; if (source) await loadQueue(source.generation_id) })
  const dismissPages = () => setPages([])
  const reloadQueue = () => { polls.current = 0; if (source) void loadQueue(source.generation_id) }

  return { source, approvedChannels, channels, pages, selected: chosen, toggle, mode, setMode, at, setAt, queue, busy, error, notice, connect, disconnect, choosePage, dismissPages, publish, cancel, retry, reloadQueue, isReady }
}
